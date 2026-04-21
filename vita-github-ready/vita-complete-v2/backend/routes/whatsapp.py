"""
VI V3 — WhatsApp Route + Abstraction Layer
==========================================
Router: /api/whatsapp
Provider-agnostic: console | gupshup | wati | interakt
"""
import os, logging, httpx
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from firebase_admin import firestore
from datetime import datetime
from middleware.auth import verify_token

router   = APIRouter()
logger   = logging.getLogger("vi-api")
PROVIDER = os.getenv("WHATSAPP_PROVIDER", "console")
API_KEY  = os.getenv("WHATSAPP_API_KEY", "")
SENDER   = os.getenv("WHATSAPP_SENDER", "")

TEMPLATES = {
    "day1":    "Your VI transformation has started, {name}! Stay consistent. Your body is already responding.",
    "day3":    "How are you feeling, {name}? 3 days in — your body is adapting. Keep the streak going! 🔥",
    "day7":    "Your 7-day progress report is ready, {name}. Don't stop now — the real change starts here.",
    "day15":   "You've come this far, {name}. 15 days strong. Let's take it to the next level.",
    "shipping_shipped":          "Your VI stack is on the way, {name}! 📦 Courier: {courierName} | Track: {trackingUrl}",
    "shipping_out_for_delivery": "Your VI stack arrives today, {name}! 🚚 Keep an eye out.",
    "shipping_delivered":        "Your VI stack has arrived, {name}! ✅ Open the app and start Day 1 today.",
    "activation_day7":           "Your 7-day activation is complete, {name}. Order your full stack to continue.",
    "referral_credited":         "Great news, {name}! ₹{amount} has been credited to your VI account. Keep referring! 🎁",
    "subscription_renewed":      "Your VI subscription has been renewed, {name}. Your next stack is on its way! 💊",
}


async def send_whatsapp(phone: str, template_key: str, variables: dict = {}) -> bool:
    if not phone or len(phone) < 10:
        logger.warning(f"Invalid phone: '{phone}'")
        return False
    phone = phone.strip().replace(" ", "").replace("-", "")
    if not phone.startswith("+"):
        phone = "+91" + phone.lstrip("0")
    template = TEMPLATES.get(template_key, "")
    if not template:
        logger.warning(f"Unknown template: {template_key}")
        return False
    message = template.format(**{k: v or "" for k, v in variables.items()})
    try:
        if PROVIDER == "console":
            logger.info(f"[WhatsApp CONSOLE] → {phone}: {message}")
            return True
        elif PROVIDER == "gupshup":
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    "https://api.gupshup.io/sm/api/v1/msg",
                    headers={"apikey": API_KEY},
                    data={"channel": "whatsapp", "source": SENDER, "destination": phone,
                          "message": message, "src.name": "VI Vita Intelligence"},
                )
                return resp.status_code == 202
        elif PROVIDER == "wati":
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://live-server-XXXX.wati.io/api/v1/sendSessionMessage/{phone}",
                    headers={"Authorization": f"Bearer {API_KEY}"},
                    json={"messageText": message},
                )
                return resp.status_code == 200
        elif PROVIDER == "interakt":
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    "https://api.interakt.ai/v1/public/message/",
                    headers={"Authorization": f"Basic {API_KEY}"},
                    json={"countryCode": "+91", "phoneNumber": phone.lstrip("+91"),
                          "type": "Text", "data": {"message": message}},
                )
                return resp.status_code == 200
        else:
            logger.warning(f"Unknown provider: {PROVIDER}")
            return False
    except Exception as e:
        logger.error(f"WhatsApp send error ({PROVIDER}) → {phone}: {e}")
        return False


class SendBody(BaseModel):
    phone:        str
    templateKey:  str
    variables:    dict = {}

@router.post("/send")
async def send_message(body: SendBody, _: dict = Depends(verify_token)):
    """Admin endpoint to manually trigger a WhatsApp message."""
    success = await send_whatsapp(body.phone, body.templateKey, body.variables)
    if not success:
        raise HTTPException(status_code=500, detail="Message failed to send")
    return {"status": "sent", "phone": body.phone, "template": body.templateKey}


@router.post("/process-queue")
async def process_queue_endpoint(background_tasks: BackgroundTasks, _: dict = Depends(verify_token)):
    """Trigger background queue processing (also runs via cron worker)."""
    background_tasks.add_task(_process_queue_bg)
    return {"status": "queued"}


async def _process_queue_bg():
    """Process pending WhatsApp queue items."""
    db  = firestore.client()
    now = datetime.utcnow().isoformat()
    docs = (db.collection("whatsappQueue")
            .where("status", "==", "pending")
            .limit(50)
            .stream())
    for doc in docs:
        data = doc.to_dict()
        uid  = data.get("userId", "")
        user_doc = db.collection("users").document(uid).get()
        user = user_doc.to_dict() if user_doc.exists else {}
        name  = user.get("userName", "there")
        phone = data.get("phone", "") or user.get("phone", "")
        msg_type = data.get("type", "")
        sends_due = []
        if msg_type in ("activation_series", "post_purchase"):
            for day in ["day1", "day3", "day7", "day15"]:
                key = f"{day}SendAt"
                if data.get(key, "9999") <= now:
                    sends_due.append(day)
        elif msg_type == "referral_credited":
            sends_due = ["referral_credited"]
        elif msg_type == "subscription_renewed":
            sends_due = ["subscription_renewed"]
        elif msg_type.startswith("shipping_"):
            sends_due = [msg_type]
        for day in sends_due:
            await send_whatsapp(phone, day, {
                "name": name,
                "courierName": data.get("courierName", ""),
                "trackingUrl": data.get("trackingUrl", ""),
                "amount": str(data.get("amount", 200)),
            })
        if sends_due:
            db.collection("whatsappQueue").document(doc.id).update({
                "status": "sent", "sentAt": now,
            })
