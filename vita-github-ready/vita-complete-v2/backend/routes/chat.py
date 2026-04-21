"""
VI Vita Intelligence — AI Chat Route V2
========================================
Upgrades over V1:
  1. Persistent memory — stores last 20 messages per user in Firestore
  2. Escalation detection — "not working", "problem", "side effect" → human support
  3. Dramatically improved system prompt (guidance-driven, not generic)
  4. Churn-aware responses — AI adapts tone for inactive users
  5. Reorder + cross-sell injection into conversation when contextually right
  6. Language-specific prompts for better Hindi/regional response quality
"""

import os
import re
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from anthropic import Anthropic
from firebase_admin import firestore

from ai.context_builder import build_full_context, format_context_for_prompt, _get_chat_memory

router = APIRouter()
logger = logging.getLogger("vi-chat")

anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ── Escalation Keywords ───────────────────────────────────────────
# If any of these appear, AI shifts to human handoff mode
ESCALATION_PATTERNS = {
    "en": [
        r"\bnot working\b", r"\bside effect\b", r"\bproblem\b", r"\ballergic\b",
        r"\breaking out\b", r"\breach\b", r"\bvomit\b", r"\bnausea\b",
        r"\bchest pain\b", r"\bdizziness\b", r"\bheadache\b", r"\brefund\b",
        r"\bcomplaint\b", r"\bscam\b", r"\bfraud\b", r"\bpoor quality\b",
        r"\bnot effective\b", r"\bno results?\b", r"\bwaste of money\b",
    ],
    "hi": [
        r"काम नहीं", r"साइड इफेक्ट", r"प्रॉब्लम", r"एलर्जी",
        r"उल्टी", r"चक्कर", r"सिरदर्द", r"रिफंड", r"शिकायत",
        r"धोखा", r"असर नहीं", r"फायदा नहीं",
    ],
}

def _detect_escalation(message: str, language: str = "en") -> bool:
    """Returns True if the message needs human escalation."""
    text = message.lower()
    patterns = ESCALATION_PATTERNS.get(language, ESCALATION_PATTERNS["en"])
    # Always check English patterns regardless of language
    all_patterns = patterns + (ESCALATION_PATTERNS["en"] if language != "en" else [])
    for pattern in all_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def _save_message_to_memory(user_id: str, role: str, content: str):
    """
    Persist a message to Firestore chatMemory collection.
    Keeps rolling window — auto-trims to last 20.
    Non-blocking — called as background task.
    """
    try:
        db  = firestore.client()
        col = db.collection("chatMemory").document(user_id).collection("messages")

        # Add new message
        col.add({
            "role":      role,
            "content":   content,
            "timestamp": datetime.utcnow().isoformat(),
        })

        # Trim to last 20 messages (delete oldest if over limit)
        all_docs = list(col.order_by("timestamp").stream())
        if len(all_docs) > 20:
            for old in all_docs[: len(all_docs) - 20]:
                old.reference.delete()

    except Exception as e:
        logger.warning(f"Memory save failed for {user_id}: {e}")


# ── System Prompt — Complete Rewrite ──────────────────────────────
BASE_SYSTEM_PROMPT = """
You are VI — the personal health advisor for Vita Intelligence, India's AI-powered men's Ayurvedic wellness platform.

━━━━━━━━━━━━━━━━━━━━━━
YOUR IDENTITY
━━━━━━━━━━━━━━━━━━━━━━
You are not a chatbot. You are the user's personal health coach — someone who knows their profile, remembers their journey, and gives real guidance tailored to them.

Tone: Confident. Direct. Empathetic. Like a knowledgeable older brother who knows men's health deeply.
Energy: Masculine. No fluff. No corporate speak. Speak like a human.
Length: Keep responses under 120 words unless the topic demands more. Short is strong.

━━━━━━━━━━━━━━━━━━━━━━
HOW TO RESPOND (READ CAREFULLY)
━━━━━━━━━━━━━━━━━━━━━━

ALWAYS START with their specific situation. Never with a generic opener.
BAD: "Great question! Testosterone is an important hormone..."
GOOD: "Your VitaScore is 42 — that's in the declining range for your age group. Here's what's happening..."

USE their data. If you have bodyType, scores, streak, symptoms — reference them directly.
BAD: "Many men experience low energy."
GOOD: "Your quiz showed high stress + low energy — that's the cortisol-testosterone spiral. Chronic stress literally suppresses T production."

RECOMMEND with WHY. Never just name a product. Explain the mechanism.
BAD: "I recommend Vajra Veerya."
GOOD: "Vajra Veerya with KSM-66 Ashwagandha — clinical studies show 17% T increase in stressed men. Your cortisol levels are exactly what this targets."

IF user owns a product: Guide usage, not reselling.
IF user is inactive (churn risk noted): Lead with empathy. No product push. Ask what's going on.
IF reorder opportunity noted: Weave it in naturally, don't make it feel like a sales pitch.
IF cross-sell opportunity noted: Bring it up only when contextually relevant, not immediately.

━━━━━━━━━━━━━━━━━━━━━━
ESCALATION PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━
If user mentions: side effects, medical problems, allergic reactions, complaints, or "not working after X weeks":
1. Acknowledge immediately with care and no defensiveness
2. Do NOT deflect or get defensive about VI products
3. Provide the human support escalation message (template below)
4. Do NOT continue pushing products

Escalation message template:
"I hear you, and this matters. Please reach out to our care team directly:
📱 WhatsApp: +91-XXXXX XXXXX
📧 Email: care@vitaintelligence.in
They're available 9 AM – 9 PM. I want to make sure you get proper support for this."

━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE RULES
━━━━━━━━━━━━━━━━━━━━━━
• Match the user's language exactly
• Hindi users: use natural conversational Hindi. Use "bhai", "yaar" sparingly but naturally
• Technical terms: explain in local language equivalent
• NEVER mix languages awkwardly. If unsure, stick to English
• AYUSH compliance: use "may support", "is known to help", "traditionally used for" — never "cures" or "treats"
• No diagnosis. For medical concerns: "Isko doctor se zaroor confirm karo" / "Please confirm this with a doctor"

━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━━━━
• End with ONE clear next step or a question that advances the conversation
• Use bullet points only when listing 3+ items
• Bold key product names or key numbers for scanability
• Never give a list when a sentence will do

USER CONTEXT (personalise every response using this):
"""


SUGGESTED_PROMPTS = {
    "en": [
        "Why is my energy still low after 5 days?",
        "Which product is most important for me to take first?",
        "What happens if I miss a day?",
        "How long until I notice real results?",
        "Can I take two products at the same time?",
    ],
    "hi": [
        "5 दिन बाद भी मेरी एनर्जी कम क्यों है?",
        "मेरे लिए सबसे पहले कौन सा प्रोडक्ट लेना चाहिए?",
        "एक दिन मिस हो गया — क्या करूं?",
        "रिजल्ट कब तक दिखेगा?",
        "क्या 2 प्रोडक्ट एक साथ ले सकते हैं?",
    ],
    "kn": [
        "5 ದಿನ ನಂತರವೂ ನನ್ನ ಶಕ್ತಿ ಕಡಿಮೆ ಏಕೆ?",
        "ನನಗೆ ಮೊದಲು ಯಾವ ಉತ್ಪನ್ನ ತೆಗೆದುಕೊಳ್ಳಬೇಕು?",
        "ಒಂದು ದಿನ ಮಿಸ್ ಆಯ್ತು — ಏನು ಮಾಡಲಿ?",
    ],
    "te": [
        "5 రోజుల తర్వాత కూడా నా శక్తి తక్కువగా ఎందుకు ఉంది?",
        "నాకు ముందు ఏ ఉత్పత్తి తీసుకోవాలి?",
        "ఒక రోజు మిస్ అయింది — ఏం చేయాలి?",
    ],
    "ta": [
        "5 நாட்களுக்கு பிறகும் என் ஆற்றல் ஏன் குறைவாக உள்ளது?",
        "எனக்கு முதலில் எந்த தயாரிப்பு எடுக்க வேண்டும்?",
    ],
    "mr": [
        "5 दिवसांनंतरही माझी ऊर्जा कमी का आहे?",
        "मला आधी कोणते उत्पादन घ्यायचे?",
    ],
}

# ── In-memory rate counter (use Redis in production) ──────────────
_rate_counter: dict = {}
RATE_LIMIT_PER_HOUR = 50


def _check_rate(key: str) -> bool:
    import time
    now      = int(time.time())
    hour_key = f"{key}:{now // 3600}"
    count    = _rate_counter.get(hour_key, 0)
    if count >= RATE_LIMIT_PER_HOUR:
        return False
    _rate_counter[hour_key] = count + 1
    if len(_rate_counter) > 10000:
        _rate_counter.clear()
    return True


# ── Models ────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role:    str
    content: str

class ChatRequest(BaseModel):
    message:  str
    userId:   Optional[str]           = None
    language: Optional[str]           = "en"
    history:  Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    reply:        str
    contextUsed:  bool
    tokensUsed:   int
    isEscalated:  bool = False


# ── Main Chat Endpoint ────────────────────────────────────────────
@router.post("/", response_model=ChatResponse)
async def chat(body: ChatRequest, request: Request):
    user_id  = body.userId
    message  = body.message.strip()
    language = body.language or "en"

    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    rate_key = user_id or request.client.host
    if not _check_rate(rate_key):
        raise HTTPException(status_code=429, detail="Too many messages. Please wait a moment.")

    # ── Escalation check ─────────────────────────────────────────
    is_escalated = _detect_escalation(message, language)

    # ── Build context ────────────────────────────────────────────
    ctx          = build_full_context(user_id)
    context_str  = format_context_for_prompt(ctx)
    context_used = not ctx.get("is_guest", True)

    system_prompt = BASE_SYSTEM_PROMPT + "\n" + context_str

    if is_escalated:
        system_prompt += """

⚠️ ESCALATION MODE: User has mentioned a concern (side effect/complaint/not working).
MANDATORY RESPONSE STRUCTURE:
1. First sentence: Acknowledge their concern with empathy (not defensiveness)
2. Second: Provide human support contact
3. Third: Offer to note their issue for the team
DO NOT push products. DO NOT minimise their concern.
"""

    # ── Build message history ────────────────────────────────────
    # Priority: Firestore memory > in-request history
    messages = []

    if user_id:
        # Fetch persisted memory from Firestore
        db       = firestore.client()
        stored   = _get_chat_memory(db, user_id, limit=20)
        if stored:
            messages = stored
        else:
            # Fall back to in-request history
            for msg in (body.history or [])[-10:]:
                if msg.role in ("user", "assistant") and msg.content.strip():
                    messages.append({"role": msg.role, "content": msg.content})
    else:
        # Guest — use in-request history only
        for msg in (body.history or [])[-6:]:
            if msg.role in ("user", "assistant") and msg.content.strip():
                messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": message})

    # ── Call Claude ──────────────────────────────────────────────
    try:
        response = anthropic_client.messages.create(
            model      = "claude-haiku-4-5-20251001",
            max_tokens = 700,
            system     = system_prompt,
            messages   = messages,
        )

        reply  = response.content[0].text
        tokens = response.usage.input_tokens + response.usage.output_tokens

        logger.info(f"Chat OK user={user_id} tokens={tokens} escalated={is_escalated}")

        # ── Persist to memory (non-blocking) ─────────────────────
        if user_id:
            try:
                _save_message_to_memory(user_id, "user",      message)
                _save_message_to_memory(user_id, "assistant", reply)
            except Exception as me:
                logger.warning(f"Memory persist failed: {me}")

        return ChatResponse(
            reply        = reply,
            contextUsed  = context_used,
            tokensUsed   = tokens,
            isEscalated  = is_escalated,
        )

    except Exception as e:
        logger.error(f"Claude API error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="AI service temporarily unavailable")


@router.get("/prompts")
def get_suggested_prompts(language: str = "en"):
    return {"prompts": SUGGESTED_PROMPTS.get(language, SUGGESTED_PROMPTS["en"]), "language": language}


@router.delete("/memory/{user_id}")
def clear_chat_memory(user_id: str):
    """Clear conversation memory for a user (on logout or user request)."""
    try:
        db   = firestore.client()
        col  = db.collection("chatMemory").document(user_id).collection("messages")
        docs = col.stream()
        for d in docs:
            d.reference.delete()
        return {"cleared": True, "userId": user_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
