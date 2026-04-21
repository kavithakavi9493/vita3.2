"""
VI V3 + Phase 1 — Orders
=========================
Surgical additions vs V3:
  1. Referral credit deduction at checkout (after coupon, before save)
  2. credit_referral_on_purchase() called after order saved (non-blocking)
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from firebase_admin import firestore
from typing import Optional, List
from datetime import datetime
from middleware.auth import verify_token

# Phase 1: referral credit (non-blocking import)
try:
    from routes.referrals import credit_referral_on_purchase
    _referrals_enabled = True
except ImportError:
    _referrals_enabled = False

router = APIRouter()
logger = logging.getLogger("vi-orders")

VALID_PRODUCT_IDS = {
    "testosterone_boost","timing_control","erection_support","stress_calm",
    "intimacy_shot","night_recovery","performance_oil","age_performance",
    "libido_boost","sperm_health","ultra_performance",
}

ORDER_STATUSES = {"placed","processing","shipped","out_for_delivery","delivered","cancelled","refunded"}

class ShippingInfo(BaseModel):
    name: str; phone: str; addressLine1: str
    addressLine2: Optional[str] = ""
    city: str; state: str; pincode: str

class CreateOrderBody(BaseModel):
    userId:             str
    products:           List[str]
    shipping:           ShippingInfo
    bodyTypeId:         Optional[str]  = ""
    couponCode:         Optional[str]  = ""
    subscribeAndSave:   Optional[bool] = False
    useReferralCredit:  Optional[bool] = True   # Phase 1: auto-apply referral credit

    @validator("products")
    def check_products(cls, v):
        if not v: raise ValueError("At least 1 product required")
        bad = [p for p in v if p not in VALID_PRODUCT_IDS]
        if bad: raise ValueError(f"Invalid product IDs: {bad}")
        return v

class UpdateTrackingBody(BaseModel):
    trackingId:   Optional[str] = ""
    trackingUrl:  Optional[str] = ""
    courierName:  Optional[str] = ""
    orderStatus:  Optional[str] = ""

    @validator("orderStatus")
    def check_status(cls, v):
        if v and v not in ORDER_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {ORDER_STATUSES}")
        return v

def _db(): return firestore.client()

@router.post("/create")
def create_order(body: CreateOrderBody, cu: dict = Depends(verify_token)):
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        db = _db()

        # ── 1. Server-side pricing ────────────────────────────
        total   = 0
        details = []
        for pid in body.products:
            doc = db.collection("products").document(pid).get()
            if not doc.exists:
                raise HTTPException(status_code=400, detail=f"Product '{pid}' not found")
            p = doc.to_dict()
            if not p.get("active", True):
                raise HTTPException(status_code=400, detail=f"Product '{pid}' is unavailable")
            details.append({"id": pid, "brand": p.get("brand",""), "price": p.get("price",0)})
            total += p.get("price", 0)

        # ── 2. Bundle discount (2+ products → 15% off) ────────
        if len(body.products) >= 2:
            total = round(total * 0.85)

        # ── 3. Subscribe & save (additional 15% off) ──────────
        if body.subscribeAndSave:
            total = round(total * 0.85)

        # ── 4. Coupon ─────────────────────────────────────────
        discount    = 0
        coupon_used = ""
        if body.couponCode:
            code = body.couponCode.strip().upper()
            cdoc = db.collection("coupons").document(code).get()
            if cdoc.exists:
                cd = cdoc.to_dict()
                if (cd.get("isActive") and
                    cd.get("expiresAt","9999") > datetime.utcnow().isoformat() and
                    (not cd.get("usageLimit") or cd.get("usedCount",0) < cd.get("usageLimit",9999))):
                    if cd.get("type") == "percent":
                        discount = round(total * cd["discount"] / 100)
                    else:
                        discount = min(cd.get("discount",0), total)
                    total       = max(total - discount, 0)
                    coupon_used = code
                    db.collection("coupons").document(code).update({"usedCount": firestore.Increment(1)})

        # ── 5. Phase 1: Referral credit deduction ────────────
        referral_credit_applied = 0
        if body.useReferralCredit:
            user_snap  = db.collection("users").document(body.userId).get()
            user_data  = user_snap.to_dict() if user_snap.exists else {}
            avail_credit = user_data.get("referralCredit", 0)
            if avail_credit > 0:
                referral_credit_applied = min(avail_credit, total)
                total = max(total - referral_credit_applied, 0)
                db.collection("users").document(body.userId).update({
                    "referralCredit": firestore.Increment(-referral_credit_applied),
                    "updatedAt":      datetime.utcnow().isoformat(),
                })
                logger.info(f"Referral credit applied user={body.userId} amount=₹{referral_credit_applied}")

        # ── 6. Save order ─────────────────────────────────────
        ref = db.collection("orders").document()
        ref.set({
            "orderId":               ref.id,
            "userId":                body.userId,
            "products":              body.products,
            "productDetails":        details,
            "amount":                total,
            "couponCode":            coupon_used,
            "discountAmount":        discount,
            "referralCreditApplied": referral_credit_applied,
            "subscribeAndSave":      body.subscribeAndSave,
            "bodyTypeId":            body.bodyTypeId,
            "status":                "pending",
            "orderStatus":           "placed",
            "shipping":              body.shipping.dict(),
            "trackingId":            "",
            "trackingUrl":           "",
            "courierName":           "",
            "createdAt":             datetime.utcnow().isoformat(),
            "paidAt":                "",
            "shippedAt":             "",
            "deliveredAt":           "",
        })

        # ── 7. Phase 1: Credit referral on first qualifying purchase (non-blocking) ──
        if _referrals_enabled:
            try:
                credit_referral_on_purchase(
                    user_id      = body.userId,
                    order_id     = ref.id,
                    order_amount = total * 100,   # paise
                    db           = db,
                )
            except Exception as ref_err:
                logger.warning(f"Referral credit post-order failed (non-blocking): {ref_err}")

        return {
            "orderId":               ref.id,
            "amount":                total,
            "referralCreditApplied": referral_credit_applied,
            "status":                "created",
        }

    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}")
def get_user_orders(user_id: str, cu: dict = Depends(verify_token)):
    if cu.get("uid") != user_id and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        docs = (_db().collection("orders")
                .where("userId","==",user_id)
                .order_by("createdAt", direction=firestore.Query.DESCENDING)
                .limit(20).stream())
        return {"orders": [{"id": d.id, **d.to_dict()} for d in docs]}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.get("/detail/{order_id}")
def get_order(order_id: str, cu: dict = Depends(verify_token)):
    try:
        doc = _db().collection("orders").document(order_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Order not found")
        data = doc.to_dict()
        if cu.get("uid") != data.get("userId") and not cu.get("dev"):
            raise HTTPException(status_code=403, detail="Forbidden")
        return {"id": doc.id, **data}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.put("/tracking/{order_id}")
def update_tracking(order_id: str, body: UpdateTrackingBody, cu: dict = Depends(verify_token)):
    try:
        db  = _db()
        doc = db.collection("orders").document(order_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Order not found")

        updates = {k: v for k, v in body.dict().items() if v}
        now     = datetime.utcnow().isoformat()
        updates["updatedAt"] = now

        if body.orderStatus == "shipped":   updates["shippedAt"]   = now
        if body.orderStatus == "delivered": updates["deliveredAt"] = now

        db.collection("orders").document(order_id).update(updates)

        order_data = doc.to_dict()
        if body.orderStatus in ("shipped", "out_for_delivery", "delivered"):
            db.collection("whatsappQueue").add({
                "userId":      order_data.get("userId"),
                "orderId":     order_id,
                "type":        f"shipping_{body.orderStatus}",
                "phone":       order_data.get("shipping",{}).get("phone",""),
                "trackingId":  body.trackingId or order_data.get("trackingId",""),
                "trackingUrl": body.trackingUrl or order_data.get("trackingUrl",""),
                "courierName": body.courierName or order_data.get("courierName",""),
                "status":      "pending",
                "sendAt":      now,
                "createdAt":   now,
            })

        return {"status": "updated", "orderId": order_id, "orderStatus": body.orderStatus}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.post("/reorder/{order_id}")
def reorder(order_id: str, cu: dict = Depends(verify_token)):
    try:
        db  = _db()
        doc = db.collection("orders").document(order_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Order not found")
        data = doc.to_dict()
        if cu.get("uid") != data.get("userId") and not cu.get("dev"):
            raise HTTPException(status_code=403, detail="Forbidden")

        ref = db.collection("orders").document()
        ref.set({
            **{k: v for k, v in data.items() if k not in (
                "orderId","status","orderStatus","paidAt","shippedAt","deliveredAt",
                "trackingId","trackingUrl","razorpayOrderId","paymentId","createdAt",
                "referralCreditApplied",
            )},
            "orderId":               ref.id,
            "status":                "pending",
            "orderStatus":           "placed",
            "trackingId":            "",
            "trackingUrl":           "",
            "courierName":           "",
            "referralCreditApplied": 0,
            "isReorder":             True,
            "reorderedFrom":         order_id,
            "createdAt":             datetime.utcnow().isoformat(),
        })
        return {"orderId": ref.id, "amount": data.get("amount"), "status": "created"}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
