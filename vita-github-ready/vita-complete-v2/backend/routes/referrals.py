"""
VI Vita Intelligence — Referral System
=======================================
Give ₹200 / Get ₹200

Routes:
  POST /api/referrals/generate           → Generate code for user (auto on signup)
  GET  /api/referrals/{user_id}          → Get user's referral dashboard
  POST /api/referrals/apply              → Apply referral code at checkout
  POST /api/referrals/claim-credit       → Claim pending referral credit
  GET  /api/referrals/{user_id}/history  → Full referral history

Firestore Schema:
  users/{userId}:
    referralCode  : str   (e.g. "VRJ8K2")
    referredBy    : str | null
    referralCredit: int   (in rupees)

  referrals/{referralCode}:
    ownerId           : str
    code              : str
    totalReferrals    : int
    successfulReferrals: int
    totalEarned       : int  (₹)
    createdAt         : str

  referralEvents/{eventId}:
    referralCode  : str
    referrerId    : str
    refereeId     : str
    status        : str  (pending | credited)
    referrerCredit: int  (200)
    refereeCredit : int  (200)
    orderId       : str  (the qualifying order)
    createdAt     : str
    creditedAt    : str | null
"""

import random
import string
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from firebase_admin import firestore
from typing import Optional
from datetime import datetime

from middleware.auth import verify_token

router = APIRouter()
logger = logging.getLogger("vi-referrals")

REFERRER_CREDIT_RS = 200
REFEREE_CREDIT_RS  = 200
MIN_ORDER_VALUE_RS = 500   # Minimum order to qualify referral

def _db():
    return firestore.client()


# ─────────────────────────────────────────────────────────────
# CODE GENERATOR
# ─────────────────────────────────────────────────────────────
def _generate_code(user_id: str) -> str:
    """
    Deterministic-first, collision-fallback code generator.
    Format: VI + 4 alphanumeric chars (e.g. VI8K2X)
    """
    # Use first 4 chars of userId for determinism
    base   = user_id[:4].upper().replace("-", "").replace("_", "")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=max(4, 6 - len(base))))
    return f"VI{base}{suffix}"[:8]


def _ensure_unique_code(db, base_code: str) -> str:
    """Ensure code doesn't collide."""
    code = base_code
    for _ in range(10):
        doc = db.collection("referrals").document(code).get()
        if not doc.exists:
            return code
        # Collision — regenerate suffix
        code = "VI" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    raise ValueError("Could not generate unique referral code")


# ─────────────────────────────────────────────────────────────
# GENERATE CODE (idempotent — safe to call on every signup)
# ─────────────────────────────────────────────────────────────
@router.post("/generate")
def generate_referral_code(cu: dict = Depends(verify_token)):
    """
    Called automatically on user signup / first dashboard load.
    Idempotent — returns existing code if already generated.
    """
    user_id = cu["uid"]
    db      = _db()
    now     = datetime.utcnow().isoformat()

    # ── Check if code already exists ────────────────────────
    user_doc = db.collection("users").document(user_id).get()
    user_data = user_doc.to_dict() if user_doc.exists else {}
    existing_code = user_data.get("referralCode", "")

    if existing_code:
        return {"code": existing_code, "status": "existing"}

    # ── Generate new code ────────────────────────────────────
    base_code = _generate_code(user_id)
    code      = _ensure_unique_code(db, base_code)

    # ── Save to Firestore ────────────────────────────────────
    db.collection("referrals").document(code).set({
        "ownerId":             user_id,
        "code":                code,
        "totalReferrals":      0,
        "successfulReferrals": 0,
        "totalEarned":         0,
        "createdAt":           now,
    })

    db.collection("users").document(user_id).set({
        "referralCode":   code,
        "referralCredit": 0,
        "updatedAt":      now,
    }, merge=True)

    logger.info(f"Referral code generated user={user_id} code={code}")
    return {"code": code, "status": "created"}


# ─────────────────────────────────────────────────────────────
# GET REFERRAL DASHBOARD
# ─────────────────────────────────────────────────────────────
@router.get("/{user_id}")
def get_referral_dashboard(user_id: str, cu: dict = Depends(verify_token)):
    if cu.get("uid") != user_id and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    db       = _db()
    user_doc = db.collection("users").document(user_id).get()
    user     = user_doc.to_dict() if user_doc.exists else {}

    code = user.get("referralCode", "")
    credit = user.get("referralCredit", 0)

    ref_stats = {}
    if code:
        ref_doc = db.collection("referrals").document(code).get()
        ref_stats = ref_doc.to_dict() if ref_doc.exists else {}

    # Fetch referral events for this user
    events = []
    event_docs = (db.collection("referralEvents")
                  .where("referrerId", "==", user_id)
                  .order_by("createdAt", direction=firestore.Query.DESCENDING)
                  .limit(20)
                  .stream())
    for e in event_docs:
        events.append(e.to_dict())

    share_message = (
        f"Hey! I've been using VI Vita Intelligence for men's health and it's been amazing! 🔥\n"
        f"Join using my code *{code}* and get ₹200 off your first order.\n"
        f"Sign up here: https://vita.in?ref={code}"
    )

    return {
        "code":            code,
        "availableCredit": credit,
        "totalReferrals":  ref_stats.get("totalReferrals", 0),
        "successfulReferrals": ref_stats.get("successfulReferrals", 0),
        "totalEarned":     ref_stats.get("totalEarned", 0),
        "recentEvents":    events[:5],
        "shareMessage":    share_message,
        "whatsappUrl":     f"https://wa.me/?text={share_message.replace(' ', '%20').replace('\n', '%0A')}",
        "rewards": {
            "referrer": REFERRER_CREDIT_RS,
            "referee":  REFEREE_CREDIT_RS,
        }
    }


# ─────────────────────────────────────────────────────────────
# APPLY REFERRAL CODE (at signup or checkout)
# ─────────────────────────────────────────────────────────────
class ApplyReferralBody(BaseModel):
    userId: str
    code:   str

@router.post("/apply")
def apply_referral_code(body: ApplyReferralBody, cu: dict = Depends(verify_token)):
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    db      = _db()
    code    = body.code.strip().upper()
    user_id = body.userId
    now     = datetime.utcnow().isoformat()

    # ── Validate code exists ─────────────────────────────────
    ref_doc = db.collection("referrals").document(code).get()
    if not ref_doc.exists:
        raise HTTPException(status_code=404, detail="Referral code not found")

    ref_data = ref_doc.to_dict()

    # ── Can't use your own code ──────────────────────────────
    if ref_data["ownerId"] == user_id:
        raise HTTPException(status_code=400, detail="You cannot use your own referral code")

    # ── Check user not already referred ─────────────────────
    user_doc  = db.collection("users").document(user_id).get()
    user_data = user_doc.to_dict() if user_doc.exists else {}
    if user_data.get("referredBy"):
        raise HTTPException(status_code=400, detail="You have already used a referral code")

    # ── Record the referral (pending — credited on first order) ─
    event_ref = db.collection("referralEvents").document()
    event_ref.set({
        "eventId":      event_ref.id,
        "referralCode": code,
        "referrerId":   ref_data["ownerId"],
        "refereeId":    user_id,
        "status":       "pending",
        "referrerCredit": REFERRER_CREDIT_RS,
        "refereeCredit":  REFEREE_CREDIT_RS,
        "orderId":      None,
        "createdAt":    now,
        "creditedAt":   None,
    })

    # ── Mark user as referred ────────────────────────────────
    db.collection("users").document(user_id).set({
        "referredBy":         ref_data["ownerId"],
        "referralCode_used":  code,
        "pendingRefereeCredit": REFEREE_CREDIT_RS,
        "updatedAt":          now,
    }, merge=True)

    # ── Increment referral count ─────────────────────────────
    db.collection("referrals").document(code).update({
        "totalReferrals": firestore.Increment(1),
    })

    logger.info(f"Referral applied referee={user_id} code={code} referrer={ref_data['ownerId']}")

    return {
        "status":         "applied",
        "creditOnOrder":  REFEREE_CREDIT_RS,
        "message":        f"₹{REFEREE_CREDIT_RS} credit will be applied on your first order!",
    }


# ─────────────────────────────────────────────────────────────
# CREDIT REFERRAL (called by order system on first purchase)
# ─────────────────────────────────────────────────────────────
def credit_referral_on_purchase(user_id: str, order_id: str, order_amount: int, db):
    """
    Called internally from orders route when an order is placed.
    Credits both referrer and referee on first qualifying purchase.
    """
    if order_amount < MIN_ORDER_VALUE_RS * 100:  # amount in paise
        return

    now = datetime.utcnow().isoformat()

    # Check if user was referred
    user_doc  = db.collection("users").document(user_id).get()
    user_data = user_doc.to_dict() if user_doc.exists else {}

    referred_by = user_data.get("referredBy")
    code_used   = user_data.get("referralCode_used")
    pending_credit = user_data.get("pendingRefereeCredit", 0)

    if not referred_by or not pending_credit:
        return  # Not referred or already credited

    try:
        # ── Credit referee ──────────────────────────────────
        db.collection("users").document(user_id).update({
            "referralCredit":       firestore.Increment(pending_credit),
            "pendingRefereeCredit": 0,
            "updatedAt":            now,
        })

        # ── Credit referrer ──────────────────────────────────
        db.collection("users").document(referred_by).update({
            "referralCredit": firestore.Increment(REFERRER_CREDIT_RS),
            "updatedAt":      now,
        })

        # ── Update referral stats ────────────────────────────
        if code_used:
            db.collection("referrals").document(code_used).update({
                "successfulReferrals": firestore.Increment(1),
                "totalEarned":         firestore.Increment(REFERRER_CREDIT_RS),
            })

        # ── Update event ─────────────────────────────────────
        events = (db.collection("referralEvents")
                  .where("refereeId", "==", user_id)
                  .where("status", "==", "pending")
                  .limit(1)
                  .stream())
        for e in events:
            e.reference.update({
                "status":     "credited",
                "orderId":    order_id,
                "creditedAt": now,
            })

        # ── WhatsApp notification to referrer ─────────────────
        db.collection("whatsappQueue").add({
            "userId":    referred_by,
            "type":      "referral_credited",
            "amount":    REFERRER_CREDIT_RS,
            "status":    "pending",
            "createdAt": now,
            "day1SendAt": now,
        })

        logger.info(f"Referral credited referee={user_id} referrer={referred_by} orderId={order_id}")

    except Exception as e:
        logger.error(f"Referral credit failed: {e}", exc_info=True)


# ─────────────────────────────────────────────────────────────
# APPLY CREDIT AT CHECKOUT (deduct from order total)
# ─────────────────────────────────────────────────────────────
class ApplyCreditBody(BaseModel):
    userId:        str
    orderAmountRs: int

@router.post("/use-credit")
def use_referral_credit(body: ApplyCreditBody, cu: dict = Depends(verify_token)):
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    db       = _db()
    user_doc = db.collection("users").document(body.userId).get()
    user     = user_doc.to_dict() if user_doc.exists else {}
    credit   = user.get("referralCredit", 0)

    if credit <= 0:
        return {"applied": 0, "remaining": 0, "newTotal": body.orderAmountRs}

    applied  = min(credit, body.orderAmountRs)
    new_total = body.orderAmountRs - applied

    return {
        "applied":    applied,
        "remaining":  credit - applied,
        "newTotal":   new_total,
        "message":    f"₹{applied} referral credit applied!",
    }


# ─────────────────────────────────────────────────────────────
# HISTORY
# ─────────────────────────────────────────────────────────────
@router.get("/{user_id}/history")
def referral_history(user_id: str, cu: dict = Depends(verify_token)):
    if cu.get("uid") != user_id and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    db = _db()
    events = (db.collection("referralEvents")
              .where("referrerId", "==", user_id)
              .order_by("createdAt", direction=firestore.Query.DESCENDING)
              .limit(50)
              .stream())

    history = []
    for e in events:
        d = e.to_dict()
        # Mask referee ID for privacy
        d["refereeId"] = d["refereeId"][:6] + "****"
        history.append(d)

    return {"history": history, "count": len(history)}
