"""
VI Vita Intelligence — WhatsApp Sender V2
==========================================
Complete rewrite. Every message is now:
  1. Personalised with name, bodyType, streak, products owned
  2. Triggered by actual user behaviour (streak, inactivity, day in journey)
  3. Contextually appropriate (don't push products to churned users immediately)
  4. Language-aware (Hindi users get Hindi messages)

New message types:
  - re_engagement_day2: User inactive 2 days — soft nudge
  - re_engagement_day3: User inactive 3 days — stronger nudge
  - streak_milestone: Day 7, 14, 21, 30 streak achievements
  - symptom_reminder: Haven't logged symptoms this week
  - reorder_nudge:    Day 20+ with good compliance

Cron trigger: Run every 5 minutes via Cloud Run / Render Cron.
Also checks for newly inactive users on every run.
"""
import os
import asyncio
import logging
import argparse
from datetime import datetime, date, timedelta
from typing import Optional

import firebase_admin
from firebase_admin import credentials, firestore
from routes.whatsapp import send_whatsapp

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("vi-worker")

cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(cred_path))


# ── Personalised Message Templates ───────────────────────────────
# All messages use {name}, {streak}, {product} variables
# These map to your WhatsApp Business template names

MESSAGE_TEMPLATES = {

    # ── Day 1 Post-Purchase ─────────────────────────────────────
    "day1": {
        "en": "🌟 {name}, your VI Health Stack is on the way! While you wait, set a daily reminder to take your supplements. Consistency is everything — your 7-day trial starts strong. The VI Team",
        "hi": "🌟 {name}, आपका VI Health Stack आ रहा है! जब तक प्रतीक्षा करें, सप्लीमेंट्स के लिए रोज़ रिमाइंडर सेट करें। Consistency ही सब कुछ है — आपका 7-दिन का ट्रायल शुरू होने वाला है। VI Team",
    },

    # ── Day 3 — First Check-in ──────────────────────────────────
    "day3": {
        "en": "💪 Day 3, {name}! Most men notice first signs around day 3-5 — slightly better morning energy. How are you feeling? Keep your streak going. Your {product} works best with consistency. Reply 'GREAT' or 'HELP' and we'll respond.",
        "hi": "💪 {name}, तीसरा दिन! ज़्यादातर पुरुषों को Day 3-5 के आसपास पहला बदलाव दिखता है — सुबह की एनर्जी थोड़ी बेहतर। आप कैसा महसूस कर रहे हैं? {product} के साथ Consistency रखें। 'GREAT' या 'HELP' reply करें।",
    },

    # ── Day 7 — Conversion Push ─────────────────────────────────
    "day7": {
        "en": "🎯 7 Days DONE, {name}! Your foundation is built. Men who complete Day 7 with a streak of {streak}+ days see 3x better results in the full course. Don't stop now — open VI to see your full programme. [link]",
        "hi": "🎯 {name}, 7 दिन पूरे! आपकी नींव तैयार है। {streak}+ दिन की Streak वाले पुरुषों को Full Course में 3x बेहतर नतीजे मिलते हैं। अभी रुकें नहीं — VI खोलें और अपना पूरा प्रोग्राम देखें। [link]",
    },

    # ── Day 15 — Mid Journey Re-engagement ─────────────────────
    "day15": {
        "en": "⚡ Day 15, {name}! You're halfway through Phase 1. At this point, {product} has started laying its foundation — but the real results are in weeks 3-4. Your streak: {streak} days. Keep it locked in.",
        "hi": "⚡ {name}, दिन 15! आप Phase 1 के बीच में हैं। अभी {product} ने नींव बनानी शुरू की है — असली नतीजे हफ्ते 3-4 में आते हैं। आपकी Streak: {streak} दिन। बनाए रखें।",
    },

    # ── Re-engagement: 2 days inactive ──────────────────────────
    "re_engagement_day2": {
        "en": "Hey {name} 👋 We noticed you haven't logged today. Life gets busy — we get it. Just take 2 minutes: take your supplement, open VI, and check in. Your body will thank you. Streak: {streak} days.",
        "hi": "हे {name} 👋 आज आपने log नहीं किया। जिंदगी व्यस्त हो जाती है — हम समझते हैं। बस 2 मिनट: सप्लीमेंट लें, VI खोलें, check-in करें। Streak: {streak} दिन।",
    },

    # ── Re-engagement: 3 days inactive — stronger ───────────────
    "re_engagement_day3": {
        "en": "⚠️ {name}, 3 days without logging. The hardest part of any health journey isn't starting — it's the middle. Don't let 3 days become 7. You've come too far to quit. Open VI now — takes 60 seconds. [link]",
        "hi": "⚠️ {name}, 3 दिन बिना log के। किसी भी health journey का सबसे कठिन हिस्सा शुरुआत नहीं — बीच का हिस्सा होता है। 3 दिन को 7 मत बनने दें। आप बहुत आगे आ गए हैं। अभी VI खोलें — 60 सेकंड लगते हैं। [link]",
    },

    # ── Streak Milestones ────────────────────────────────────────
    "streak_7": {
        "en": "🔥 7-Day Streak, {name}! You're in the top 20% of VI users who actually stick to the programme. This is where results start building. Keep going — Day 14 is your next milestone.",
        "hi": "🔥 {name}, 7 दिन की Streak! आप उन Top 20% VI Users में हैं जो programme follow करते हैं। यहीं से असली नतीजे बनने शुरू होते हैं। जारी रखें — Day 14 आपका अगला milestone है।",
    },
    "streak_14": {
        "en": "💎 14 Days Strong, {name}! 2 weeks of consistency. Most men give up by Day 10 — you didn't. Your body has now adapted to the supplements. Phase 2 of your transformation has begun.",
        "hi": "💎 {name}, 14 दिन मज़बूत! 2 हफ्तों की Consistency। ज़्यादातर पुरुष Day 10 तक छोड़ देते हैं — आपने नहीं छोड़ा। आपका शरीर अब supplements के साथ adapt हो गया है। Transformation का Phase 2 शुरू हो गया।",
    },
    "streak_21": {
        "en": "🏆 21 Days, {name}! This is where Ayurveda works best — 21 days to build a new biological habit. Your testosterone cycle has now completed one full adaptive phase. Real transformation territory.",
        "hi": "🏆 {name}, 21 दिन! यहीं Ayurveda सबसे अच्छा काम करता है — 21 दिन नई biological habit बनाने के लिए। आपका testosterone cycle अब एक पूरा adaptive phase पूरा कर चुका है।",
    },
    "streak_30": {
        "en": "🌟 30 DAYS! {name}, you've achieved something less than 15% of men do — 30 days of consistent supplementation. The results you're seeing are just the beginning. Ready to lock in the next 60 days?",
        "hi": "🌟 30 दिन! {name}, आपने वो हासिल किया जो 15% से कम पुरुष करते हैं — 30 दिन की consistent supplementation। जो नतीजे आप देख रहे हैं वो सिर्फ शुरुआत है। अगले 60 दिन lock-in करने के लिए तैयार?",
    },

    # ── Symptom Check-in Reminder ────────────────────────────────
    "symptom_reminder": {
        "en": "📊 Weekly Check-in, {name}! Rate how you're feeling this week — energy, sleep, stress, performance. This helps VI personalise your programme. Takes 30 seconds. Open VI now. [link]",
        "hi": "📊 {name}, साप्ताहिक Check-in! इस हफ्ते आप कैसा महसूस कर रहे हैं — energy, sleep, stress, performance — रेट करें। इससे VI आपका programme personalise करता है। 30 सेकंड लगते हैं। VI खोलें। [link]",
    },

    # ── Reorder Nudge ────────────────────────────────────────────
    "reorder_nudge": {
        "en": "🔁 {name}, Day {day} — your {product} pack may be running low. Subscribe & Save to get 15% off and never miss a day of your programme. Consistency is what separates results from guesses. [link]",
        "hi": "🔁 {name}, दिन {day} — आपका {product} pack खत्म होने वाला होगा। Subscribe & Save करें — 15% off पाएं और programme का कोई दिन miss न करें। [link]",
    },
}

BODY_TYPE_PRODUCT_NAME = {
    "HIGH_STRESS_LOW_VITALITY": "Manas Veerya (Stress Calm)",
    "HORMONAL_DECLINE":         "Vajra Veerya (Testosterone Boost)",
    "PERFORMANCE_DEFICIT":      "Sthambhan Shakti (Timing Control)",
    "AGE_RELATED_DROP":         "Yuva Vajra (Age Performance)",
    "PEAK_PERFORMANCE":         "Vajra Veerya (Testosterone Boost)",
}


def _get_message(template_key: str, language: str, variables: dict) -> str:
    """Get personalised message text in the correct language."""
    tmpl_set = MESSAGE_TEMPLATES.get(template_key, {})
    template = tmpl_set.get(language) or tmpl_set.get("en", "")
    if not template:
        return ""
    try:
        return template.format(**variables)
    except KeyError:
        # Fall back gracefully if variable missing
        return template.format_map({**{"name": "there", "streak": "0", "product": "supplement", "day": "1"}, **variables})


def _get_user_language(user_data: dict) -> str:
    """Get stored language preference or default to 'en'."""
    return user_data.get("language", "en") or "en"


def _detect_inactive_users(db) -> list:
    """
    Scan users who haven't logged in 2+ days and aren't already in the queue.
    Returns list of user_data dicts for users who need re-engagement.
    """
    today      = date.today()
    day2_cutoff = (today - timedelta(days=2)).isoformat()

    try:
        # Find users whose lastLogDate is 2+ days ago
        users = (db.collection("users")
                 .where("isActivated", "==", True)
                 .where("lastLogDate", "<=", day2_cutoff)
                 .limit(100)
                 .stream())
        inactive = []
        for u in users:
            data = u.to_dict()
            uid  = u.id
            # Don't re-queue if already queued in last 24h
            existing = (db.collection("whatsappQueue")
                        .where("userId", "==", uid)
                        .where("type", "in", ["re_engagement_day2", "re_engagement_day3"])
                        .where("createdAt", ">=", (datetime.utcnow() - timedelta(hours=24)).isoformat())
                        .limit(1).stream())
            already_queued = any(True for _ in existing)
            if not already_queued:
                data["_uid"] = uid
                inactive.append(data)
        return inactive
    except Exception as e:
        logger.error(f"Inactive user scan failed: {e}")
        return []


async def process_queue():
    db  = firestore.client()
    now = datetime.utcnow().isoformat()

    # ── Step 1: Auto-detect and queue inactive users ─────────────
    inactive_users = _detect_inactive_users(db)
    for user in inactive_users:
        uid  = user.get("_uid", "")
        phone = user.get("phone", "")
        if not phone or not uid:
            continue

        last_log = user.get("lastLogDate", "")
        try:
            days_inactive = (date.today() - date.fromisoformat(last_log)).days
        except Exception:
            days_inactive = 0

        msg_type = "re_engagement_day3" if days_inactive >= 3 else "re_engagement_day2"

        # Queue re-engagement message
        db.collection("whatsappQueue").add({
            "userId":    uid,
            "type":      msg_type,
            "phone":     phone,
            "sendAt":    now,
            "status":    "pending",
            "createdAt": now,
        })
        logger.info(f"Auto-queued {msg_type} for inactive user {uid} ({days_inactive} days)")

    # ── Step 2: Check streak milestones ──────────────────────────
    streak_users = (db.collection("users")
                    .where("isActivated", "==", True)
                    .where("currentStreak", "in", [7, 14, 21, 30])
                    .limit(50).stream())
    for u in streak_users:
        uid   = u.id
        data  = u.to_dict()
        streak = data.get("currentStreak", 0)
        today  = date.today().isoformat()
        # Check if we already sent this milestone
        existing = (db.collection("whatsappQueue")
                    .where("userId", "==", uid)
                    .where("type", "==", f"streak_{streak}")
                    .limit(1).stream())
        if not any(True for _ in existing):
            db.collection("whatsappQueue").add({
                "userId": uid, "type": f"streak_{streak}",
                "phone": data.get("phone", ""),
                "sendAt": now, "status": "pending", "createdAt": now,
            })
            logger.info(f"Queued streak_{streak} milestone for {uid}")

    # ── Step 3: Process pending queue ────────────────────────────
    docs = (db.collection("whatsappQueue")
            .where("status", "==", "pending")
            .limit(100).stream())

    processed = 0
    for doc in docs:
        data     = doc.to_dict()
        uid      = data.get("userId", "")
        msg_type = data.get("type", "")

        # Skip if not due yet
        send_at = data.get("sendAt", "")
        if send_at and send_at > now:
            continue

        # Fetch user context
        user_doc  = db.collection("users").document(uid).get()
        user_data = user_doc.to_dict() if user_doc.exists else {}
        name      = user_data.get("userName", "") or "there"
        phone     = data.get("phone", "") or user_data.get("phone", "")
        language  = _get_user_language(user_data)
        streak    = user_data.get("currentStreak", 0)
        body_type = user_data.get("bodyTypeId", "PEAK_PERFORMANCE")
        product   = BODY_TYPE_PRODUCT_NAME.get(body_type, "supplement")

        # Activation day for reorder nudge
        act_doc   = db.collection("activations").document(uid).get()
        act_day   = 1
        if act_doc.exists:
            act_at = act_doc.to_dict().get("activatedAt", "")
            if act_at:
                try:
                    act_dt  = datetime.fromisoformat(act_at)
                    act_day = (datetime.utcnow() - act_dt).days + 1
                except Exception:
                    pass

        if not phone:
            logger.warning(f"No phone for user {uid} — skipping {msg_type}")
            doc.reference.update({"status": "skipped", "reason": "no_phone", "processedAt": now})
            continue

        variables = {
            "name":    name,
            "streak":  str(streak),
            "product": product,
            "day":     str(act_day),
        }

        # Route to correct template
        sends_due = []

        # Multi-day sequences (activation, post-purchase)
        if msg_type in ("activation_series", "post_purchase"):
            for day_key in ("day1", "day3", "day7", "day15"):
                send_key = f"{day_key}SendAt"
                if data.get(send_key, "9999") <= now:
                    sends_due.append(day_key)

        # Single-send types
        elif msg_type in (
            "re_engagement_day2", "re_engagement_day3",
            "streak_7", "streak_14", "streak_21", "streak_30",
            "symptom_reminder", "reorder_nudge",
        ):
            sends_due.append(msg_type)

        # Shipping types
        elif msg_type.startswith("shipping_"):
            if data.get("sendAt", "9999") <= now:
                sends_due.append(msg_type)

        if not sends_due:
            continue

        all_ok = True
        for tpl_key in sends_due:
            message_text = _get_message(tpl_key, language, {
                **variables,
                "trackingUrl": data.get("trackingUrl", ""),
                "courierName": data.get("courierName", ""),
                "trackingId":  data.get("trackingId", ""),
            })

            if message_text:
                # Send as text message (for providers that support it)
                ok = await send_whatsapp(
                    phone=phone,
                    template_key=tpl_key,
                    variables={
                        **variables,
                        "message_text": message_text,  # Personalised text for providers that support it
                        "trackingUrl":  data.get("trackingUrl", ""),
                        "courierName":  data.get("courierName", ""),
                        "trackingId":   data.get("trackingId", ""),
                    }
                )
            else:
                ok = await send_whatsapp(
                    phone=phone,
                    template_key=tpl_key,
                    variables=variables,
                )

            if not ok:
                all_ok = False
                logger.error(f"Failed to send {tpl_key} to {phone}")
            else:
                logger.info(f"✅ Sent '{tpl_key}' to {name} ({uid})")

        doc.reference.update({
            "status":      "sent" if all_ok else "partial",
            "processedAt": now,
            "sentCount":   len(sends_due),
        })
        processed += 1

    logger.info(f"Worker run: processed {processed} items, queued {len(inactive_users)} re-engagements")
    return processed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()

    async def run():
        if args.once:
            await process_queue()
        else:
            while True:
                try:
                    await process_queue()
                except Exception as e:
                    logger.error(f"Worker error: {e}", exc_info=True)
                await asyncio.sleep(300)

    asyncio.run(run())


if __name__ == "__main__":
    main()
