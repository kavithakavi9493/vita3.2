"""
VI V3 — Admin Panel API (/api/admin/*)
Single admin access verified via Firestore admins collection.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from firebase_admin import firestore, auth as fb_auth
from typing import Optional, List
from datetime import datetime
from middleware.auth import verify_token

router = APIRouter()
logger = logging.getLogger("vi-api")

def _db(): return firestore.client()

async def require_admin(cu: dict = Depends(verify_token)):
    uid = cu.get("uid")
    if cu.get("dev"): return cu   # dev mode bypass
    doc = _db().collection("admins").document(uid).get()
    if not doc.exists or not doc.to_dict().get("active", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return cu

# ── DASHBOARD SUMMARY ─────────────────────────────────────
@router.get("/summary")
def admin_summary(_: dict = Depends(require_admin)):
    try:
        db = _db()
        orders     = list(db.collection("orders").stream())
        users      = list(db.collection("users").stream())
        activations= list(db.collection("activations").stream())
        paid_orders= [o for o in orders if o.to_dict().get("status") == "paid"]
        total_rev  = sum(o.to_dict().get("amount", 0) for o in paid_orders)
        return {
            "totalUsers":       len(users),
            "totalOrders":      len(orders),
            "paidOrders":       len(paid_orders),
            "activations":      len(activations),
            "totalRevenue":     total_rev,
            "pendingShipments": len([o for o in paid_orders
                                     if o.to_dict().get("orderStatus") in ("placed","processing")]),
        }
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# ── ORDERS ────────────────────────────────────────────────
@router.get("/orders")
def list_orders(status: Optional[str] = None, limit: int = 50, _: dict = Depends(require_admin)):
    try:
        db  = _db()
        ref = db.collection("orders").order_by("createdAt", direction=firestore.Query.DESCENDING).limit(limit)
        if status:
            ref = db.collection("orders").where("orderStatus","==",status).order_by("createdAt", direction=firestore.Query.DESCENDING).limit(limit)
        docs = ref.stream()
        return {"orders": [{"id": d.id, **d.to_dict()} for d in docs]}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

class TrackingUpdate(BaseModel):
    trackingId:  Optional[str] = ""
    trackingUrl: Optional[str] = ""
    courierName: Optional[str] = ""
    orderStatus: Optional[str] = ""

@router.put("/orders/{order_id}/tracking")
def admin_update_tracking(order_id: str, body: TrackingUpdate, _: dict = Depends(require_admin)):
    try:
        db  = _db()
        doc = db.collection("orders").document(order_id).get()
        if not doc.exists: raise HTTPException(status_code=404, detail="Order not found")
        now     = datetime.utcnow().isoformat()
        updates = {k: v for k,v in body.dict().items() if v}
        updates["updatedAt"] = now
        if body.orderStatus == "shipped":   updates["shippedAt"]   = now
        if body.orderStatus == "delivered": updates["deliveredAt"] = now
        db.collection("orders").document(order_id).update(updates)

        # Trigger WhatsApp for shipping events
        if body.orderStatus in ("shipped","out_for_delivery","delivered"):
            od = doc.to_dict()
            db.collection("whatsappQueue").add({
                "userId":      od.get("userId"),
                "orderId":     order_id,
                "type":        f"shipping_{body.orderStatus}",
                "phone":       od.get("shipping",{}).get("phone",""),
                "trackingId":  body.trackingId or od.get("trackingId",""),
                "trackingUrl": body.trackingUrl or od.get("trackingUrl",""),
                "courierName": body.courierName or od.get("courierName",""),
                "status":      "pending",
                "sendAt":      now,
                "createdAt":   now,
            })
        return {"status": "updated", "orderId": order_id}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# ── PRODUCTS ──────────────────────────────────────────────
@router.get("/products")
def list_all_products(_: dict = Depends(require_admin)):
    try:
        docs = _db().collection("products").stream()
        return {"products": [{"id": d.id, **d.to_dict()} for d in docs]}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

class ProductUpdate(BaseModel):
    brand:       Optional[str]       = None
    hindi:       Optional[str]       = None
    cat:         Optional[str]       = None
    mrp:         Optional[int]       = None
    price:       Optional[int]       = None
    benefits:    Optional[List[str]] = None
    ingredients: Optional[str]       = None
    usage:       Optional[str]       = None
    active:      Optional[bool]      = None

@router.patch("/products/{product_id}")
def update_product(product_id: str, body: ProductUpdate, _: dict = Depends(require_admin)):
    try:
        updates = {k:v for k,v in body.dict().items() if v is not None}
        if not updates: raise HTTPException(status_code=400, detail="No fields to update")
        updates["updatedAt"] = datetime.utcnow().isoformat()
        _db().collection("products").document(product_id).set(updates, merge=True)
        return {"status": "updated", "id": product_id, "fields": list(updates.keys())}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# ── USERS ─────────────────────────────────────────────────
@router.get("/users")
def list_users(limit: int = 50, _: dict = Depends(require_admin)):
    try:
        docs = (_db().collection("users")
                .order_by("createdAt", direction=firestore.Query.DESCENDING)
                .limit(limit).stream())
        return {"users": [{"id": d.id, **d.to_dict()} for d in docs]}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/{user_id}")
def get_user_detail(user_id: str, _: dict = Depends(require_admin)):
    try:
        db   = _db()
        user = db.collection("users").document(user_id).get()
        quiz = db.collection("user_responses").document(user_id).get()
        act  = db.collection("activations").document(user_id).get()
        ords = list(db.collection("orders").where("userId","==",user_id).stream())
        return {
            "user":       user.to_dict() if user.exists else None,
            "quiz":       quiz.to_dict() if quiz.exists else None,
            "activation": act.to_dict()  if act.exists  else None,
            "orders":     [{"id":d.id,**d.to_dict()} for d in ords],
        }
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# ── CONTENT (videos + articles) ───────────────────────────
class ContentBody(BaseModel):
    type:        str              # "video" or "article"
    title:       str
    description: Optional[str]   = ""
    url:         Optional[str]   = ""   # YouTube URL or article URL
    thumbnailUrl:Optional[str]   = ""
    duration:    Optional[str]   = ""   # "8:45"
    expert:      Optional[str]   = ""
    category:    Optional[str]   = ""   # "Ayurveda" | "Yoga" | "Sleep" | "Hormones"
    bodyTypes:   Optional[List[str]] = []  # which body types see this
    active:      Optional[bool]  = True

@router.post("/content")
def create_content(body: ContentBody, _: dict = Depends(require_admin)):
    try:
        ref  = _db().collection("content").document()
        data = {**body.dict(), "contentId": ref.id, "createdAt": datetime.utcnow().isoformat()}
        ref.set(data)
        return {"contentId": ref.id, "status": "created"}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.get("/content")
def list_content(_: dict = Depends(require_admin)):
    try:
        docs = _db().collection("content").order_by("createdAt", direction=firestore.Query.DESCENDING).stream()
        return {"content": [{"id": d.id, **d.to_dict()} for d in docs]}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.patch("/content/{content_id}")
def update_content(content_id: str, body: ContentBody, _: dict = Depends(require_admin)):
    try:
        updates = {k:v for k,v in body.dict().items() if v is not None}
        updates["updatedAt"] = datetime.utcnow().isoformat()
        _db().collection("content").document(content_id).set(updates, merge=True)
        return {"status": "updated", "contentId": content_id}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.delete("/content/{content_id}")
def delete_content(content_id: str, _: dict = Depends(require_admin)):
    try:
        _db().collection("content").document(content_id).set(
            {"active": False, "updatedAt": datetime.utcnow().isoformat()}, merge=True)
        return {"status": "deactivated"}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# ── APP CONFIG (₹99 adjustable) ──────────────────────────
class AppConfigUpdate(BaseModel):
    amountPaise:  Optional[int] = None
    days:         Optional[int] = None
    label:        Optional[str] = None

@router.patch("/config/activation")
def update_activation_config(body: AppConfigUpdate, _: dict = Depends(require_admin)):
    try:
        updates = {k:v for k,v in body.dict().items() if v is not None}
        if "amountPaise" in updates:
            updates["amountDisplay"] = updates["amountPaise"] // 100
        updates["updatedAt"] = datetime.utcnow().isoformat()
        _db().collection("appConfig").document("activation").set(updates, merge=True)
        return {"status": "updated", "config": updates}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
def get_config(_: dict = Depends(require_admin)):
    try:
        doc = _db().collection("appConfig").document("activation").get()
        return doc.to_dict() if doc.exists else {}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# ── COUPONS ───────────────────────────────────────────────
class CouponBody(BaseModel):
    code:       str
    discount:   int
    type:       str = "percent"   # "percent" or "flat"
    isActive:   bool = True
    expiresAt:  Optional[str] = "2099-12-31T23:59:59"
    usageLimit: Optional[int] = None
    description:Optional[str] = ""

@router.post("/coupons")
def create_coupon(body: CouponBody, _: dict = Depends(require_admin)):
    try:
        data = {**body.dict(), "code": body.code.upper(), "usedCount": 0,
                "createdAt": datetime.utcnow().isoformat()}
        _db().collection("coupons").document(body.code.upper()).set(data)
        return {"status": "created", "code": body.code.upper()}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.get("/coupons")
def list_coupons(_: dict = Depends(require_admin)):
    try:
        docs = _db().collection("coupons").stream()
        return {"coupons": [{"id": d.id, **d.to_dict()} for d in docs]}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
