"""
VI Vita Intelligence — Subscription System
==========================================
Real recurring billing via Razorpay Subscriptions API.

Routes:
  POST /api/subscriptions/create        → Create subscription for user
  GET  /api/subscriptions/{user_id}     → Fetch user's active subscription
  POST /api/subscriptions/{sub_id}/pause
  POST /api/subscriptions/{sub_id}/resume
  POST /api/subscriptions/{sub_id}/cancel
  POST /api/subscriptions/{sub_id}/skip
  GET  /api/subscriptions/{user_id}/history
  POST /api/subscriptions/webhook       → Razorpay payment webhook

Firestore Schema:
  subscriptions/{userId}:
    subscriptionId    : str   (Razorpay sub ID)
    planId            : str   (Razorpay plan ID)
    status            : str   (created|authenticated|active|paused|cancelled|completed|expired)
    products          : list[str]
    totalAmountPaise  : int
    discountedPaise   : int   (after 15% subscribe & save)
    createdAt         : str
    nextBillingDate   : str
    cycleCount        : int
    billingHistory    : list  (last 6 payments)
    pausedAt          : str | null
"""

import os
import json
import hmac
import hashlib
import logging
from fastapi import APIRouter, HTTPException, Depends, Request, Header
from pydantic import BaseModel, validator
from firebase_admin import firestore
from typing import Optional, List
from datetime import datetime, timedelta
import razorpay

from middleware.auth import verify_token

router = APIRouter()
logger = logging.getLogger("vi-subscriptions")

SUBSCRIBE_DISCOUNT = 0.85        # 15% off
SUBSCRIPTION_MONTHS = 12         # 12 billing cycles
MIN_PRODUCTS = 1

VALID_PRODUCT_IDS = {
    "testosterone_boost", "timing_control", "erection_support", "stress_calm",
    "intimacy_shot", "night_recovery", "performance_oil", "age_performance",
    "libido_boost", "sperm_health", "ultra_performance",
}

def _rzp():
    return razorpay.Client(
        auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))
    )

def _db():
    return firestore.client()


# ─────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────
class CreateSubscriptionBody(BaseModel):
    userId:   str
    products: List[str]
    name:     Optional[str] = "VI Health Stack"
    email:    Optional[str] = None
    phone:    Optional[str] = None

    @validator("products")
    def check_products(cls, v):
        if not v:
            raise ValueError("At least 1 product required")
        bad = [p for p in v if p not in VALID_PRODUCT_IDS]
        if bad:
            raise ValueError(f"Invalid product IDs: {bad}")
        return v

class SkipCycleBody(BaseModel):
    userId: str

class CancelBody(BaseModel):
    userId: str
    reason: Optional[str] = ""


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────
def _compute_amount(products: List[str], db) -> dict:
    """Fetch prices from Firestore and compute stack total."""
    total_mrp  = 0
    total_sub  = 0
    details    = []
    for pid in products:
        doc = db.collection("products").document(pid).get()
        if not doc.exists:
            raise HTTPException(status_code=400, detail=f"Product '{pid}' not found")
        p = doc.to_dict()
        price = p.get("price", 0)
        total_mrp += price
        sub_price = round(price * SUBSCRIBE_DISCOUNT)
        total_sub += sub_price
        details.append({"id": pid, "name": p.get("brand", pid), "price": price, "subPrice": sub_price})

    # Bundle discount on top (≥2 products)
    if len(products) >= 2:
        total_sub = round(total_sub * 0.85)

    return {
        "mrpTotal":       total_mrp,
        "subscribedTotal": total_sub,
        "savedAmount":    total_mrp - total_sub,
        "totalPaise":     total_sub * 100,
        "details":        details,
    }


def _create_or_get_razorpay_plan(rzp_client, amount_paise: int, plan_name: str) -> str:
    """
    Create a Razorpay plan. In production, cache plan IDs by amount to avoid duplicates.
    """
    try:
        plan = rzp_client.plan.create({
            "period":   "monthly",
            "interval": 1,
            "item": {
                "name":        plan_name,
                "amount":      amount_paise,
                "currency":    "INR",
                "description": "VI Monthly Health Stack — Subscribe & Save 15%",
            },
        })
        return plan["id"]
    except Exception as e:
        logger.error(f"Razorpay plan create failed: {e}")
        raise HTTPException(status_code=500, detail="Could not create subscription plan")


# ─────────────────────────────────────────────────────────────
# CREATE SUBSCRIPTION
# ─────────────────────────────────────────────────────────────
@router.post("/create")
def create_subscription(body: CreateSubscriptionBody, cu: dict = Depends(verify_token)):
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    db        = _db()
    rzp       = _rzp()
    pricing   = _compute_amount(body.products, db)

    plan_name = f"VI Stack — {', '.join(body.products[:2])}{' +' if len(body.products) > 2 else ''}"
    plan_id   = _create_or_get_razorpay_plan(rzp, pricing["totalPaise"], plan_name)

    # Build subscription
    sub_data = {
        "plan_id":      plan_id,
        "total_count":  SUBSCRIPTION_MONTHS,
        "quantity":     1,
        "customer_notify": 1,
        "notes": {
            "userId":   body.userId,
            "products": ",".join(body.products),
        },
    }
    if body.email:
        sub_data["notify_info"] = {
            "notify_email": body.email,
            "notify_phone": body.phone or "",
        }

    try:
        rzp_sub = rzp.subscription.create(sub_data)
    except Exception as e:
        logger.error(f"Razorpay subscription create failed: {e}")
        raise HTTPException(status_code=500, detail="Could not create subscription")

    now = datetime.utcnow().isoformat()

    # ── Save to Firestore ────────────────────────────────────
    db.collection("subscriptions").document(body.userId).set({
        "userId":           body.userId,
        "subscriptionId":   rzp_sub["id"],
        "planId":           plan_id,
        "status":           "created",
        "products":         body.products,
        "totalMrpPaise":    pricing["mrpTotal"] * 100,
        "totalAmountPaise": pricing["totalPaise"],
        "savedPaise":       pricing["savedAmount"] * 100,
        "createdAt":        now,
        "nextBillingDate":  None,    # Razorpay fills this on authentication
        "cycleCount":       0,
        "pausedAt":         None,
        "cancelledAt":      None,
        "billingHistory":   [],
        "updatedAt":        now,
    })

    logger.info(f"Subscription created user={body.userId} subId={rzp_sub['id']}")

    return {
        "status":            "created",
        "subscriptionId":    rzp_sub["id"],
        "razorpayKeyId":     os.getenv("RAZORPAY_KEY_ID"),
        "amount":            pricing["totalPaise"],
        "currency":          "INR",
        "pricing":           pricing,
        "short_url":         rzp_sub.get("short_url", ""),
    }


# ─────────────────────────────────────────────────────────────
# GET SUBSCRIPTION
# ─────────────────────────────────────────────────────────────
@router.get("/{user_id}")
def get_subscription(user_id: str, cu: dict = Depends(verify_token)):
    if cu.get("uid") != user_id and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    doc = _db().collection("subscriptions").document(user_id).get()
    if not doc.exists:
        return {"hasSubscription": False, "subscription": None}

    sub = doc.to_dict()

    # Sync status from Razorpay in real-time
    try:
        rzp_sub = _rzp().subscription.fetch(sub["subscriptionId"])
        sub["status"]          = rzp_sub.get("status", sub["status"])
        sub["nextBillingDate"] = rzp_sub.get("charge_at")
        sub["paidCount"]       = rzp_sub.get("paid_count", 0)
        sub["remainingCount"]  = rzp_sub.get("remaining_count", 0)
    except Exception as e:
        logger.warning(f"Could not sync Razorpay status for {user_id}: {e}")

    return {"hasSubscription": True, "subscription": sub}


# ─────────────────────────────────────────────────────────────
# BILLING HISTORY
# ─────────────────────────────────────────────────────────────
@router.get("/{user_id}/history")
def get_billing_history(user_id: str, cu: dict = Depends(verify_token)):
    if cu.get("uid") != user_id and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    doc = _db().collection("subscriptions").document(user_id).get()
    if not doc.exists:
        return {"history": []}

    return {"history": doc.to_dict().get("billingHistory", [])}


# ─────────────────────────────────────────────────────────────
# PAUSE
# ─────────────────────────────────────────────────────────────
@router.post("/{sub_id}/pause")
def pause_subscription(sub_id: str, body: SkipCycleBody, cu: dict = Depends(verify_token)):
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        _rzp().subscription.pause(sub_id, {"pause_at": "now"})
    except Exception as e:
        logger.error(f"Pause failed: {e}")
        raise HTTPException(status_code=500, detail="Could not pause subscription")

    _db().collection("subscriptions").document(body.userId).update({
        "status":    "paused",
        "pausedAt":  datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat(),
    })

    return {"status": "paused", "message": "Subscription paused. No charges until you resume."}


# ─────────────────────────────────────────────────────────────
# RESUME
# ─────────────────────────────────────────────────────────────
@router.post("/{sub_id}/resume")
def resume_subscription(sub_id: str, body: SkipCycleBody, cu: dict = Depends(verify_token)):
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        _rzp().subscription.resume(sub_id, {"resume_at": "now"})
    except Exception as e:
        logger.error(f"Resume failed: {e}")
        raise HTTPException(status_code=500, detail="Could not resume subscription")

    _db().collection("subscriptions").document(body.userId).update({
        "status":    "active",
        "pausedAt":  None,
        "updatedAt": datetime.utcnow().isoformat(),
    })

    return {"status": "active", "message": "Subscription resumed. Next charge on your billing date."}


# ─────────────────────────────────────────────────────────────
# SKIP NEXT CYCLE
# ─────────────────────────────────────────────────────────────
@router.post("/{sub_id}/skip")
def skip_cycle(sub_id: str, body: SkipCycleBody, cu: dict = Depends(verify_token)):
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    # Razorpay doesn't natively "skip" — we pause then auto-resume after 30 days
    # In production, use a Cloud Scheduler job to resume
    try:
        _rzp().subscription.pause(sub_id, {"pause_at": "now"})
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not skip cycle")

    next_resume = (datetime.utcnow() + timedelta(days=30)).isoformat()

    _db().collection("subscriptions").document(body.userId).update({
        "status":           "paused",
        "pausedAt":         datetime.utcnow().isoformat(),
        "autoResumeAt":     next_resume,
        "updatedAt":        datetime.utcnow().isoformat(),
    })

    return {
        "status":         "skipped",
        "nextBillingDate": next_resume,
        "message":        "This month's cycle skipped. You'll be charged next month.",
    }


# ─────────────────────────────────────────────────────────────
# CANCEL
# ─────────────────────────────────────────────────────────────
@router.post("/{sub_id}/cancel")
def cancel_subscription(sub_id: str, body: CancelBody, cu: dict = Depends(verify_token)):
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        _rzp().subscription.cancel(sub_id, {"cancel_at_cycle_end": 1})
    except Exception as e:
        logger.error(f"Cancel failed: {e}")
        raise HTTPException(status_code=500, detail="Could not cancel subscription")

    _db().collection("subscriptions").document(body.userId).update({
        "status":       "cancelled",
        "cancelledAt":  datetime.utcnow().isoformat(),
        "cancelReason": body.reason,
        "updatedAt":    datetime.utcnow().isoformat(),
    })

    logger.info(f"Subscription cancelled user={body.userId} reason={body.reason}")
    return {"status": "cancelled", "message": "Subscription cancelled at end of current billing cycle."}


# ─────────────────────────────────────────────────────────────
# RAZORPAY WEBHOOK
# ─────────────────────────────────────────────────────────────
@router.post("/webhook")
async def subscription_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None)
):
    """
    Handles Razorpay subscription events:
      - subscription.activated
      - subscription.charged
      - subscription.paused
      - subscription.resumed
      - subscription.cancelled
    """
    body_bytes = await request.body()
    secret     = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

    # ── Signature verification ────────────────────────────
    if secret and x_razorpay_signature:
        expected = hmac.new(secret.encode(), body_bytes, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, x_razorpay_signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        event = json.loads(body_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = event.get("event", "")
    payload    = event.get("payload", {})
    sub_data   = payload.get("subscription", {}).get("entity", {})
    sub_id     = sub_data.get("id", "")
    notes      = sub_data.get("notes", {})
    user_id    = notes.get("userId", "")

    logger.info(f"Webhook: {event_type} sub={sub_id} user={user_id}")

    if not user_id:
        return {"status": "ignored", "reason": "no userId in notes"}

    db  = _db()
    now = datetime.utcnow().isoformat()

    if event_type == "subscription.activated":
        db.collection("subscriptions").document(user_id).update({
            "status":          "active",
            "nextBillingDate": sub_data.get("charge_at"),
            "updatedAt":       now,
        })

    elif event_type == "subscription.charged":
        payment_entity = payload.get("payment", {}).get("entity", {})
        history_entry  = {
            "paymentId":    payment_entity.get("id"),
            "amount":       payment_entity.get("amount", 0),
            "paidAt":       now,
            "status":       "paid",
        }
        db.collection("subscriptions").document(user_id).update({
            "status":          "active",
            "cycleCount":      firestore.Increment(1),
            "nextBillingDate": sub_data.get("charge_at"),
            "updatedAt":       now,
            "billingHistory":  firestore.ArrayUnion([history_entry]),
        })

        # ── Trigger WhatsApp reorder notification ─────────
        products = notes.get("products", "").split(",")
        if products:
            db.collection("whatsappQueue").add({
                "userId":   user_id,
                "type":     "subscription_renewed",
                "products": products,
                "status":   "pending",
                "createdAt": now,
                "day1SendAt": now,
            })

    elif event_type == "subscription.paused":
        db.collection("subscriptions").document(user_id).update({
            "status": "paused", "updatedAt": now
        })

    elif event_type == "subscription.resumed":
        db.collection("subscriptions").document(user_id).update({
            "status": "active", "pausedAt": None, "updatedAt": now
        })

    elif event_type == "subscription.cancelled":
        db.collection("subscriptions").document(user_id).update({
            "status": "cancelled", "updatedAt": now
        })

    return {"status": "processed", "event": event_type}
