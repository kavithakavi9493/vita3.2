"""
VI Vita Intelligence — Reviews & Testimonials
=============================================
Social proof is the #1 conversion driver for health supplements.

Routes:
  POST /api/reviews/submit          → User submits review
  GET  /api/reviews/product/{id}    → Get reviews for a product
  GET  /api/reviews/summary/{id}    → Rating summary (for ProductStackScreen)
  POST /api/reviews/{id}/approve    → Admin approves review
  GET  /api/reviews/pending         → Admin: list pending reviews
  GET  /api/reviews/featured        → Homepage testimonials (pre-approved)

Schema:
  reviews/{reviewId}:
    userId       : str
    productId    : str
    rating       : int  (1-5)
    title        : str
    body         : str
    verified     : bool (purchased the product)
    approved     : bool (admin-approved)
    featured     : bool (shown on homepage)
    createdAt    : str
    helpfulCount : int
"""

import logging
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from firebase_admin import firestore
from typing import Optional, List
from datetime import datetime
from middleware.auth import verify_token

router = APIRouter()
logger = logging.getLogger("vi-reviews")

VALID_PRODUCT_IDS = {
    "testosterone_boost", "timing_control", "erection_support", "stress_calm",
    "intimacy_shot", "night_recovery", "performance_oil", "age_performance",
    "libido_boost", "sperm_health", "ultra_performance",
}

def _db():
    return firestore.client()


class ReviewBody(BaseModel):
    userId:    str
    productId: str
    rating:    int
    title:     str
    body:      str

    @validator("rating")
    def check_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError("Rating must be 1-5")
        return v

    @validator("productId")
    def check_product(cls, v):
        if v not in VALID_PRODUCT_IDS:
            raise ValueError(f"Invalid product: {v}")
        return v

    @validator("title")
    def check_title(cls, v):
        if len(v.strip()) < 5:
            raise ValueError("Title too short")
        return v.strip()[:100]

    @validator("body")
    def check_body(cls, v):
        if len(v.strip()) < 20:
            raise ValueError("Review must be at least 20 characters")
        return v.strip()[:1000]


@router.post("/submit")
def submit_review(body: ReviewBody, cu: dict = Depends(verify_token)):
    """
    Submit a product review. Only verified purchasers can review.
    Goes to admin queue before appearing publicly.
    """
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    db  = _db()
    uid = body.userId

    # Check if user has purchased this product
    orders = (db.collection("orders")
              .where("userId", "==", uid)
              .where("orderStatus", "in", ["delivered", "shipped", "processing"])
              .limit(10).stream())

    verified = False
    for o in orders:
        if body.productId in o.to_dict().get("products", []):
            verified = True
            break

    # Check for duplicate review
    existing = (db.collection("reviews")
                .where("userId", "==", uid)
                .where("productId", "==", body.productId)
                .limit(1).stream())
    for _ in existing:
        raise HTTPException(status_code=400, detail="You've already reviewed this product")

    review_id = str(uuid.uuid4())
    db.collection("reviews").document(review_id).set({
        "reviewId":    review_id,
        "userId":      uid,
        "productId":   body.productId,
        "rating":      body.rating,
        "title":       body.title,
        "body":        body.body,
        "verified":    verified,
        "approved":    False,   # Admin must approve
        "featured":    False,
        "helpfulCount": 0,
        "createdAt":   datetime.utcnow().isoformat(),
    })

    logger.info(f"Review submitted: {review_id} product={body.productId} user={uid} verified={verified}")
    return {
        "success":  True,
        "reviewId": review_id,
        "verified": verified,
        "message":  "Your review is submitted and will appear after moderation. Thank you!",
    }


@router.get("/product/{product_id}")
def get_product_reviews(product_id: str, limit: int = 10):
    """Get approved reviews for a product."""
    db = _db()
    docs = (db.collection("reviews")
            .where("productId", "==", product_id)
            .where("approved",  "==", True)
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(min(limit, 50))
            .stream())
    return [d.to_dict() for d in docs]


@router.get("/summary/{product_id}")
def get_rating_summary(product_id: str):
    """
    Rating summary for ProductStackScreen display.
    Returns avg rating, count, and distribution.
    """
    db   = _db()
    docs = (db.collection("reviews")
            .where("productId", "==", product_id)
            .where("approved",  "==", True)
            .stream())

    reviews    = [d.to_dict() for d in docs]
    total      = len(reviews)
    if total == 0:
        return {"average": 0.0, "count": 0, "distribution": {}}

    avg = sum(r["rating"] for r in reviews) / total
    dist = {str(i): 0 for i in range(1, 6)}
    for r in reviews:
        dist[str(r["rating"])] = dist.get(str(r["rating"]), 0) + 1

    return {
        "average":      round(avg, 1),
        "count":        total,
        "distribution": dist,
        "verified":     sum(1 for r in reviews if r.get("verified")),
    }


@router.get("/featured")
def get_featured_reviews(limit: int = 6):
    """Featured testimonials for homepage/marketing."""
    db   = _db()
    docs = (db.collection("reviews")
            .where("featured", "==", True)
            .where("approved", "==", True)
            .limit(min(limit, 20))
            .stream())
    return [d.to_dict() for d in docs]


@router.get("/pending")
def get_pending_reviews(cu: dict = Depends(verify_token)):
    """Admin: list reviews awaiting moderation."""
    db  = _db()
    uid = cu.get("uid")
    if not db.collection("admins").document(uid).get().exists:
        raise HTTPException(status_code=403, detail="Admin only")

    docs = (db.collection("reviews")
            .where("approved", "==", False)
            .order_by("createdAt")
            .limit(50)
            .stream())
    return [d.to_dict() for d in docs]


@router.post("/{review_id}/approve")
def approve_review(review_id: str, featured: bool = False, cu: dict = Depends(verify_token)):
    """Admin: approve a review. Optionally mark as featured."""
    db  = _db()
    uid = cu.get("uid")
    if not db.collection("admins").document(uid).get().exists:
        raise HTTPException(status_code=403, detail="Admin only")

    ref = db.collection("reviews").document(review_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Review not found")

    ref.update({"approved": True, "featured": featured, "approvedAt": datetime.utcnow().isoformat()})
    return {"success": True, "reviewId": review_id, "featured": featured}


@router.post("/{review_id}/reject")
def reject_review(review_id: str, cu: dict = Depends(verify_token)):
    """Admin: reject and delete a review."""
    db  = _db()
    uid = cu.get("uid")
    if not db.collection("admins").document(uid).get().exists:
        raise HTTPException(status_code=403, detail="Admin only")

    ref = db.collection("reviews").document(review_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Review not found")
    ref.delete()
    return {"success": True, "reviewId": review_id}
