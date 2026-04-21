"""
VI Vita Intelligence — Cash on Delivery (COD) Route
=====================================================
COD is 55-60% of D2C orders in Tier 2/3 India.
This unlocks the majority of the addressable market.

Routes:
  POST /api/cod/create-order     → Place COD order (no payment gateway)
  POST /api/cod/confirm/{id}     → Admin confirms COD order after dispatch
  POST /api/cod/cancel/{id}      → Cancel COD order
  GET  /api/cod/eligibility      → Check if COD available for pincode

COD Logic:
  - Available for orders ₹500 – ₹3,000 (configurable)
  - Extra ₹49 COD handling fee added to order total
  - Certain pincodes blocked based on non-delivery history
  - Admin must confirm before dispatching
  - Auto-cancelled if not confirmed in 48 hours
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, validator
from firebase_admin import firestore
from typing import Optional, List
from datetime import datetime, timedelta
from middleware.auth import verify_token

router = APIRouter()
logger = logging.getLogger("vi-cod")

# ── Config (override via appConfig/cod in Firestore) ─────────────
COD_MIN_RS          = 500
COD_MAX_RS          = 3000
COD_HANDLING_FEE_RS = 49
COD_CONFIRM_HOURS   = 48   # Auto-cancel if unconfirmed

VALID_PRODUCT_IDS = {
    "testosterone_boost", "timing_control", "erection_support", "stress_calm",
    "intimacy_shot", "night_recovery", "performance_oil", "age_performance",
    "libido_boost", "sperm_health", "ultra_performance",
}

def _db():
    return firestore.client()


# ── Models ────────────────────────────────────────────────────────
class ShippingInfo(BaseModel):
    name:         str
    phone:        str
    addressLine1: str
    addressLine2: Optional[str] = ""
    city:         str
    state:        str
    pincode:      str

class CODOrderBody(BaseModel):
    userId:       str
    products:     List[str]
    shipping:     ShippingInfo
    bodyTypeId:   Optional[str] = ""
    couponCode:   Optional[str] = ""

    @validator("products")
    def check_products(cls, v):
        if not v:
            raise ValueError("At least 1 product required")
        bad = [p for p in v if p not in VALID_PRODUCT_IDS]
        if bad:
            raise ValueError(f"Invalid products: {bad}")
        return v

    @validator("shipping")
    def check_pincode(cls, v):
        if not v.pincode.isdigit() or len(v.pincode) != 6:
            raise ValueError("Invalid pincode — must be 6 digits")
        return v


# ── Helpers ───────────────────────────────────────────────────────
def _get_product_prices(db, product_ids: List[str]) -> dict:
    """Fetch product prices from Firestore."""
    prices = {}
    for pid in product_ids:
        doc = db.collection("products").document(pid).get()
        if doc.exists:
            prices[pid] = doc.to_dict().get("price", 0)
        else:
            prices[pid] = 0
    return prices

def _is_pincode_blocked(db, pincode: str) -> bool:
    """Check if pincode is on the COD blocked list."""
    doc = db.collection("codBlockedPincodes").document(pincode).get()
    return doc.exists and doc.to_dict().get("blocked", False)

def _apply_coupon(db, code: str, amount_rs: int) -> int:
    """Apply coupon discount. Returns discounted amount."""
    if not code:
        return amount_rs
    doc = db.collection("coupons").document(code.upper()).get()
    if not doc.exists:
        return amount_rs
    c = doc.to_dict()
    if not c.get("isActive", False):
        return amount_rs
    discount = c.get("discount", 0)
    return max(0, amount_rs - discount)

def _queue_whatsapp_cod_confirmation(db, user_id: str, order_id: str, phone: str, amount: int):
    """Queue WhatsApp message confirming COD order."""
    db.collection("whatsappQueue").add({
        "userId":    user_id,
        "orderId":   order_id,
        "type":      "cod_confirmation",
        "phone":     phone,
        "amount":    amount,
        "status":    "pending",
        "createdAt": datetime.utcnow().isoformat(),
    })


# ── Routes ────────────────────────────────────────────────────────

@router.get("/eligibility")
def check_cod_eligibility(pincode: str, amount: int = 0):
    """
    Check if COD is available for a given pincode and amount.
    Frontend should call this after user enters address.
    """
    db = _db()

    # Amount range check
    if amount and (amount < COD_MIN_RS or amount > COD_MAX_RS):
        return {
            "eligible":  False,
            "reason":    f"COD available for orders ₹{COD_MIN_RS}–₹{COD_MAX_RS} only",
            "handlingFee": 0,
        }

    # Pincode format
    if not pincode.isdigit() or len(pincode) != 6:
        return {"eligible": False, "reason": "Invalid pincode", "handlingFee": 0}

    # Blocked pincode check
    if _is_pincode_blocked(db, pincode):
        return {
            "eligible":  False,
            "reason":    "COD not available at this pincode due to past non-delivery",
            "handlingFee": 0,
        }

    return {
        "eligible":    True,
        "handlingFee": COD_HANDLING_FEE_RS,
        "message":     f"COD available. ₹{COD_HANDLING_FEE_RS} handling fee applies.",
    }


@router.post("/create-order")
def create_cod_order(
    body: CODOrderBody,
    background_tasks: BackgroundTasks,
    cu: dict = Depends(verify_token),
):
    """
    Place a COD order. No payment gateway involved.
    Order status starts as 'cod_pending' until admin confirms.
    """
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    db  = _db()
    now = datetime.utcnow()

    # Block if pincode is flagged
    pincode = body.shipping.pincode
    if _is_pincode_blocked(db, pincode):
        raise HTTPException(
            status_code=400,
            detail="COD not available at this pincode. Please use online payment."
        )

    # Calculate pricing
    prices    = _get_product_prices(db, body.products)
    raw_total = sum(prices.get(p, 0) for p in body.products)

    if raw_total < COD_MIN_RS:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order for COD is ₹{COD_MIN_RS}. Add more products."
        )
    if raw_total > COD_MAX_RS:
        raise HTTPException(
            status_code=400,
            detail=f"COD available for orders up to ₹{COD_MAX_RS}. Use online payment for larger orders."
        )

    # Apply coupon discount
    discounted = _apply_coupon(db, body.couponCode, raw_total)

    # Add COD handling fee
    final_amount = discounted + COD_HANDLING_FEE_RS

    # Build order document
    order_id  = f"COD{int(now.timestamp())}{body.userId[-4:]}"
    order_doc = {
        "orderId":        order_id,
        "userId":         body.userId,
        "products":       body.products,
        "shipping":       body.shipping.dict(),
        "paymentMethod":  "cod",
        "orderStatus":    "cod_pending",
        "rawAmount":      raw_total,
        "couponCode":     body.couponCode or "",
        "discountedAmount": discounted,
        "handlingFee":    COD_HANDLING_FEE_RS,
        "amount":         final_amount,
        "bodyTypeId":     body.bodyTypeId or "",
        "createdAt":      now.isoformat(),
        "confirmBy":      (now + timedelta(hours=COD_CONFIRM_HOURS)).isoformat(),
        "paidAt":         None,
    }

    # Save to Firestore
    db.collection("orders").document(order_id).set(order_doc)

    # Update user record
    db.collection("users").document(body.userId).set({
        "hasActivePlan": True,
        "paidOrderId":   order_id,
    }, merge=True)

    # Queue WhatsApp confirmation (non-blocking)
    background_tasks.add_task(
        _queue_whatsapp_cod_confirmation,
        db, body.userId, order_id, body.shipping.phone, final_amount
    )

    logger.info(f"COD order {order_id} created — ₹{final_amount} — user {body.userId}")

    return {
        "success":    True,
        "orderId":    order_id,
        "amount":     final_amount,
        "handlingFee": COD_HANDLING_FEE_RS,
        "message":    "Order placed! Pay ₹{} cash on delivery.".format(final_amount),
        "confirmBy":  (now + timedelta(hours=COD_CONFIRM_HOURS)).isoformat(),
    }


@router.post("/confirm/{order_id}")
def confirm_cod_order(order_id: str, cu: dict = Depends(verify_token)):
    """
    Admin-only: Confirm COD order for dispatch.
    Call this before creating Shiprocket shipment.
    """
    # Admin check (same pattern as admin.py)
    db  = _db()
    uid = cu.get("uid")
    admin_doc = db.collection("admins").document(uid).get()
    if not admin_doc.exists:
        raise HTTPException(status_code=403, detail="Admin access required")

    now = datetime.utcnow()
    order_ref = db.collection("orders").document(order_id)
    order = order_ref.get()

    if not order.exists:
        raise HTTPException(status_code=404, detail="Order not found")

    data = order.to_dict()
    if data.get("paymentMethod") != "cod":
        raise HTTPException(status_code=400, detail="Not a COD order")
    if data.get("orderStatus") not in ("cod_pending",):
        raise HTTPException(status_code=400, detail=f"Cannot confirm — status is {data.get('orderStatus')}")

    order_ref.update({
        "orderStatus": "processing",
        "confirmedAt": now.isoformat(),
        "confirmedBy": uid,
    })

    logger.info(f"COD order {order_id} confirmed by admin {uid}")
    return {"success": True, "orderId": order_id, "status": "processing"}


@router.post("/cancel/{order_id}")
def cancel_cod_order(order_id: str, cu: dict = Depends(verify_token)):
    """
    Cancel a COD order. Can be done by the user or admin before dispatch.
    """
    db        = _db()
    uid       = cu.get("uid")
    now       = datetime.utcnow()
    order_ref = db.collection("orders").document(order_id)
    order     = order_ref.get()

    if not order.exists:
        raise HTTPException(status_code=404, detail="Order not found")

    data = order.to_dict()

    # Only the order owner or admin can cancel
    is_admin    = db.collection("admins").document(uid).get().exists
    is_owner    = data.get("userId") == uid
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Forbidden")

    cancellable = {"cod_pending", "processing"}
    if data.get("orderStatus") not in cancellable:
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be cancelled — status is {data.get('orderStatus')}"
        )

    order_ref.update({
        "orderStatus": "cancelled",
        "cancelledAt": now.isoformat(),
        "cancelledBy": uid,
    })

    logger.info(f"COD order {order_id} cancelled by {uid}")
    return {"success": True, "orderId": order_id, "status": "cancelled"}
