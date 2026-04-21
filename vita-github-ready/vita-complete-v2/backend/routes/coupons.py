"""
VI V3 — Coupons (FIXED: field names unified: discountPct→discount, active→isActive)
"""
from fastapi import APIRouter, HTTPException, Depends
from firebase_admin import firestore
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from middleware.auth import verify_token

router = APIRouter()

class ApplyCouponBody(BaseModel):
    code:   str
    userId: str
    amount: int   # original amount in rupees

class CreateCouponBody(BaseModel):
    code:        str
    discount:    int           # value
    type:        str           # "percent" or "flat"
    isActive:    bool = True
    expiresAt:   Optional[str] = None
    usageLimit:  Optional[int] = None
    description: Optional[str] = ""


@router.get("/validate/{code}")
def validate_coupon(code: str):
    """Validate coupon — returns discount info or error message."""
    try:
        db  = firestore.client()
        doc = db.collection("coupons").document(code.upper()).get()
        if not doc.exists:
            return {"valid": False, "discount": 0, "message": "Invalid coupon code"}

        data = doc.to_dict()

        # FIXED: use 'isActive' (unified field name)
        if not data.get("isActive", False):
            return {"valid": False, "discount": 0, "message": "Coupon is no longer active"}

        # Check expiry
        expires_at = data.get("expiresAt")
        if expires_at:
            try:
                exp_dt = datetime.fromisoformat(expires_at.replace("Z", ""))
                if datetime.utcnow() > exp_dt:
                    return {"valid": False, "discount": 0, "message": "Coupon has expired"}
            except Exception:
                pass

        # Check usage limit
        usage_limit = data.get("usageLimit")
        used_count  = data.get("usedCount", 0)
        if usage_limit and used_count >= usage_limit:
            return {"valid": False, "discount": 0, "message": "Coupon usage limit reached"}

        return {
            "valid":       True,
            "discount":    data.get("discount", 0),
            "type":        data.get("type", "percent"),   # "percent" or "flat"
            "description": data.get("description", ""),
            "message":     "Coupon applied successfully! 🎉",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply")
def apply_coupon(body: ApplyCouponBody, _: dict = Depends(verify_token)):
    """Apply coupon and return final discounted amount."""
    result = validate_coupon(body.code)
    if not result["valid"]:
        raise HTTPException(status_code=400, detail=result["message"])
    try:
        discount_val = result["discount"]
        coupon_type  = result["type"]
        if coupon_type == "percent":
            saving      = round(body.amount * discount_val / 100)
            final_price = body.amount - saving
        else:  # flat
            saving      = min(discount_val, body.amount)
            final_price = body.amount - saving

        # Increment usage counter
        db  = firestore.client()
        ref = db.collection("coupons").document(body.code.upper())
        ref.update({"usedCount": firestore.Increment(1)})

        return {
            "valid":       True,
            "originalAmount": body.amount,
            "saving":      saving,
            "finalAmount": max(final_price, 0),
            "code":        body.code.upper(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
def create_coupon(body: CreateCouponBody, _: dict = Depends(verify_token)):
    try:
        db = firestore.client()
        db.collection("coupons").document(body.code.upper()).set({
            "code":        body.code.upper(),
            "discount":    body.discount,
            "type":        body.type,
            "isActive":    body.isActive,
            "expiresAt":   body.expiresAt,
            "usageLimit":  body.usageLimit,
            "usedCount":   0,
            "description": body.description,
            "createdAt":   datetime.utcnow().isoformat(),
        })
        return {"status": "created", "code": body.code.upper()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
