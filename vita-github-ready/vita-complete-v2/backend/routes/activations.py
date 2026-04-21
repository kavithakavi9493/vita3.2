"""
VI V3 — Activation System
₹99 seven-day activation: create Razorpay order → verify → activate user → schedule Day-7 push.
"""
import os, hmac, hashlib, logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from firebase_admin import firestore
from datetime import datetime, timedelta
from middleware.auth import verify_token

router = APIRouter()
logger = logging.getLogger("vi-api")

RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
ACTIVATION_AMOUNT   = int(os.getenv("ACTIVATION_AMOUNT_PAISE", "9900"))   # ₹99 in paise
ACTIVATION_DAYS     = int(os.getenv("ACTIVATION_DAYS", "7"))


# ── Models ────────────────────────────────────────────────
class CreateActivationBody(BaseModel):
    userId: str

class VerifyActivationBody(BaseModel):
    userId:            str
    razorpayOrderId:   str
    razorpayPaymentId: str
    razorpaySignature: str


# ── Create Razorpay order for ₹99 activation ─────────────
@router.post("/create-order")
def create_activation_order(body: CreateActivationBody, current_user: dict = Depends(verify_token)):
    if current_user.get("uid") != body.userId and not current_user.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        import razorpay
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        order = client.order.create({
            "amount":   ACTIVATION_AMOUNT,
            "currency": "INR",
            "receipt":  f"act_{body.userId[:12]}_{int(datetime.utcnow().timestamp())}",
            "notes":    {"userId": body.userId, "type": "activation"},
        })
        logger.info(f"Activation order created: {order['id']} for user {body.userId}")
        return {"razorpayOrderId": order["id"], "amount": ACTIVATION_AMOUNT, "currency": "INR"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Verify payment + activate user ───────────────────────
@router.post("/verify")
def verify_activation(body: VerifyActivationBody, current_user: dict = Depends(verify_token)):
    if current_user.get("uid") != body.userId and not current_user.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        # Verify Razorpay HMAC signature (FIXED: was using hmac.new incorrectly)
        if RAZORPAY_KEY_SECRET:
            message  = f"{body.razorpayOrderId}|{body.razorpayPaymentId}"
            expected = hmac.new(
                RAZORPAY_KEY_SECRET.encode("utf-8"),
                message.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(expected, body.razorpaySignature):
                raise HTTPException(status_code=400, detail="Payment signature mismatch")

        db  = firestore.client()
        now = datetime.utcnow()
        exp = now + timedelta(days=ACTIVATION_DAYS)

        # Write activation record
        db.collection("activations").document(body.userId).set({
            "userId":          body.userId,
            "status":          "active",
            "activatedAt":     now.isoformat(),
            "expiresAt":       exp.isoformat(),
            "activationDays":  ACTIVATION_DAYS,
            "razorpayOrderId": body.razorpayOrderId,
            "paymentId":       body.razorpayPaymentId,
            "amount":          ACTIVATION_AMOUNT,
            "convertedToPaid": False,
        })

        # Update user record
        db.collection("users").document(body.userId).set({
            "isActivated":    True,
            "activationExpiry": exp.isoformat(),
            "activatedAt":    now.isoformat(),
        }, merge=True)

        # Schedule WhatsApp/push queue entries
        db.collection("whatsappQueue").add({
            "userId":       body.userId,
            "type":         "activation_series",
            "day1SendAt":   now.isoformat(),
            "day3SendAt":   (now + timedelta(days=3)).isoformat(),
            "day5SendAt":   (now + timedelta(days=5)).isoformat(),
            "day7SendAt":   (now + timedelta(days=7)).isoformat(),
            "status":       "pending",
            "createdAt":    now.isoformat(),
        })

        logger.info(f"User {body.userId} activated. Expires: {exp.isoformat()}")
        return {
            "status":      "activated",
            "activatedAt": now.isoformat(),
            "expiresAt":   exp.isoformat(),
            "daysLeft":    ACTIVATION_DAYS,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Activation verify error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Check activation status ───────────────────────────────
@router.get("/status/{user_id}")
def get_activation_status(user_id: str, current_user: dict = Depends(verify_token)):
    if current_user.get("uid") != user_id and not current_user.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        db  = firestore.client()
        doc = db.collection("activations").document(user_id).get()
        if not doc.exists:
            return {"isActivated": False, "daysLeft": 0, "status": "none"}

        data = doc.to_dict()
        now  = datetime.utcnow().isoformat()
        exp  = data.get("expiresAt", "")
        is_active   = data.get("status") == "active" and exp > now
        activated_at = data.get("activatedAt", now)

        # Compute which activation day the user is on (1-7)
        try:
            act_dt = datetime.fromisoformat(activated_at)
            day_number = min((datetime.utcnow() - act_dt).days + 1, ACTIVATION_DAYS)
        except Exception:
            day_number = 1

        days_left = 0
        if is_active:
            try:
                exp_dt    = datetime.fromisoformat(exp)
                days_left = max((exp_dt - datetime.utcnow()).days, 0)
            except Exception:
                days_left = 0

        return {
            "isActivated":     is_active,
            "status":          data.get("status"),
            "activatedAt":     activated_at,
            "expiresAt":       exp,
            "daysLeft":        days_left,
            "dayNumber":       day_number,
            "convertedToPaid": data.get("convertedToPaid", False),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Mark activation converted to paid order ───────────────
@router.post("/convert/{user_id}")
def mark_converted(user_id: str, current_user: dict = Depends(verify_token)):
    if current_user.get("uid") != user_id and not current_user.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        db = firestore.client()
        db.collection("activations").document(user_id).set({
            "convertedToPaid": True,
            "convertedAt":     datetime.utcnow().isoformat(),
            "status":          "converted",
        }, merge=True)
        return {"status": "converted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
