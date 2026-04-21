"""
VI V3 — Payments (HMAC bug fixed, server-side amount validation)
"""
import os, hmac, hashlib, logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from firebase_admin import firestore
from datetime import datetime, timedelta
from middleware.auth import verify_token

router = APIRouter()
logger = logging.getLogger("vi-api")

RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID",    "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

class InitiatePaymentBody(BaseModel):
    userId:  str
    orderId: str
    amount:  int   # paise
    note:    str = "product_purchase"

class VerifyPaymentBody(BaseModel):
    razorpayOrderId:   str
    razorpayPaymentId: str
    razorpaySignature: str
    orderId:           str
    userId:            str

@router.post("/initiate")
def initiate_payment(body: InitiatePaymentBody, cu: dict = Depends(verify_token)):
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    # Server-side amount check against Firestore order record
    try:
        db  = firestore.client()
        doc = db.collection("orders").document(body.orderId).get()
        if doc.exists:
            stored_rupees = doc.to_dict().get("amount", 0)
            expected_paise = stored_rupees * 100
            if abs(expected_paise - body.amount) > 500:   # ₹5 tolerance
                raise HTTPException(status_code=400, detail="Amount mismatch — possible tampering")
    except HTTPException: raise
    except Exception as e:
        logger.warning(f"Amount pre-check skipped: {e}")
    try:
        import razorpay
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        order  = client.order.create({
            "amount": body.amount, "currency": "INR",
            "receipt": body.orderId[:40],
            "notes":   {"userId": body.userId, "type": body.note},
        })
        logger.info(f"Razorpay order {order['id']} ₹{body.amount//100} for user {body.userId}")
        return {"razorpayOrderId": order["id"], "amount": body.amount, "currency": "INR"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify")
def verify_payment(body: VerifyPaymentBody, cu: dict = Depends(verify_token)):
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        if RAZORPAY_KEY_SECRET:
            msg      = f"{body.razorpayOrderId}|{body.razorpayPaymentId}"
            expected = hmac.new(
                RAZORPAY_KEY_SECRET.encode("utf-8"),
                msg.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(expected, body.razorpaySignature):
                logger.warning(f"HMAC mismatch order={body.razorpayOrderId}")
                raise HTTPException(status_code=400, detail="Payment signature mismatch")

        db  = firestore.client()
        now = datetime.utcnow()

        db.collection("orders").document(body.orderId).update({
            "status":          "paid",
            "paymentId":       body.razorpayPaymentId,
            "razorpayOrderId": body.razorpayOrderId,
            "orderStatus":     "placed",
            "paidAt":          now.isoformat(),
        })
        db.collection("users").document(body.userId).set({
            "hasActivePlan": True,
            "paidOrderId":   body.orderId,
            "paidAt":        now.isoformat(),
        }, merge=True)

        # Queue WhatsApp retention messages
        db.collection("whatsappQueue").add({
            "userId":      body.userId,
            "orderId":     body.orderId,
            "type":        "post_purchase",
            "day1SendAt":  now.isoformat(),
            "day3SendAt":  (now + timedelta(days=3)).isoformat(),
            "day7SendAt":  (now + timedelta(days=7)).isoformat(),
            "day15SendAt": (now + timedelta(days=15)).isoformat(),
            "status":      "pending",
            "createdAt":   now.isoformat(),
        })
        logger.info(f"Payment verified {body.razorpayPaymentId} user={body.userId}")
        return {"status": "payment_verified", "orderId": body.orderId}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"verify_payment error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
