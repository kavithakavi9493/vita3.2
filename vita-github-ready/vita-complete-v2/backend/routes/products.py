"""
VI V3 — Products (Firestore-first, string IDs only, no in-memory lists)
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from firebase_admin import firestore
from typing import Optional, List
from datetime import datetime
from middleware.auth import verify_token

router = APIRouter()
logger = logging.getLogger("vi-api")

# Canonical string ID order (for display sorting)
PRODUCT_ORDER = [
    "testosterone_boost","timing_control","erection_support","stress_calm",
    "intimacy_shot","night_recovery","performance_oil","age_performance",
    "libido_boost","sperm_health","ultra_performance",
]

# Body type → ordered recommended product IDs
STACK_MAP = {
    "HIGH_STRESS_LOW_VITALITY": ["stress_calm","night_recovery","testosterone_boost","intimacy_shot","performance_oil","libido_boost"],
    "HORMONAL_DECLINE":         ["testosterone_boost","libido_boost","sperm_health","intimacy_shot","night_recovery","performance_oil"],
    "PERFORMANCE_DEFICIT":      ["timing_control","erection_support","performance_oil","testosterone_boost","intimacy_shot","stress_calm"],
    "AGE_RELATED_DROP":         ["age_performance","testosterone_boost","sperm_health","night_recovery","ultra_performance","libido_boost"],
    "PEAK_PERFORMANCE":         ["testosterone_boost","intimacy_shot","performance_oil","stress_calm","night_recovery","sperm_health"],
}

STACK_SIZE = {
    "AGE_RELATED_DROP": 5, "HIGH_STRESS_LOW_VITALITY": 4,
    "HORMONAL_DECLINE": 4, "PERFORMANCE_DEFICIT": 4, "PEAK_PERFORMANCE": 3,
}

class ProductUpsert(BaseModel):
    id:          str
    icon:        Optional[str]       = "💊"
    brand:       str
    hindi:       Optional[str]       = ""
    cat:         str
    zone:        Optional[str]       = "adrenal"   # brain | heart | adrenal | reproductive
    mrp:         int
    price:       int
    benefits:    Optional[List[str]] = []
    ingredients: Optional[str]       = ""
    usage:       Optional[str]       = ""
    rating:      Optional[float]     = 4.8
    reviews:     Optional[int]       = 0
    active:      Optional[bool]      = True

def _db(): return firestore.client()

@router.get("/")
def list_products():
    try:
        docs = _db().collection("products").where("active","==",True).stream()
        products = [d.to_dict() for d in docs]
        products.sort(key=lambda p: PRODUCT_ORDER.index(p["id"]) if p["id"] in PRODUCT_ORDER else 99)
        return {"products": products, "count": len(products)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommend/stack")
def recommend_stack(bodyTypeId: str = Query("PEAK_PERFORMANCE")):
    try:
        ids   = STACK_MAP.get(bodyTypeId, STACK_MAP["PEAK_PERFORMANCE"])
        size  = STACK_SIZE.get(bodyTypeId, 3)
        db    = _db()
        stack = []
        for pid in ids[:size]:
            doc = db.collection("products").document(pid).get()
            if doc.exists and doc.to_dict().get("active", True):
                stack.append(doc.to_dict())
        return {"stack": stack, "count": len(stack), "bodyTypeId": bodyTypeId}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{product_id}")
def get_product(product_id: str):
    try:
        doc = _db().collection("products").document(product_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found")
        return doc.to_dict()
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
def upsert_product(body: ProductUpsert, _: dict = Depends(verify_token)):
    try:
        _db().collection("products").document(body.id).set(
            {**body.dict(), "updatedAt": datetime.utcnow().isoformat()})
        return {"id": body.id, "status": "upserted"}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{product_id}")
def deactivate_product(product_id: str, _: dict = Depends(verify_token)):
    try:
        _db().collection("products").document(product_id).set(
            {"active": False, "updatedAt": datetime.utcnow().isoformat()}, merge=True)
        return {"id": product_id, "status": "deactivated"}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
