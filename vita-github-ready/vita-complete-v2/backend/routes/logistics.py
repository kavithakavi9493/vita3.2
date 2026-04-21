"""
VI Vita Intelligence — Shiprocket Logistics Integration
========================================================
Automates order dispatch, tracking, and delivery updates.
Eliminates manual tracking number entry.

Routes:
  POST /api/logistics/create-shipment/{order_id}  → Push order to Shiprocket
  GET  /api/logistics/track/{order_id}            → Get live tracking
  POST /api/logistics/webhook                     → Shiprocket status webhook
  GET  /api/logistics/serviceability              → Check pincode serviceability

Setup:
  1. Create account at shiprocket.in
  2. Add SHIPROCKET_EMAIL + SHIPROCKET_PASSWORD to .env
  3. Shiprocket auto-generates AWB (tracking) number after pickup
"""

import os
import logging
import httpx
from fastapi import APIRouter, HTTPException, Depends, Request, Header, BackgroundTasks
from firebase_admin import firestore
from typing import Optional
from datetime import datetime
from middleware.auth import verify_token

router = APIRouter()
logger = logging.getLogger("vi-logistics")

SHIPROCKET_EMAIL    = os.getenv("SHIPROCKET_EMAIL", "")
SHIPROCKET_PASSWORD = os.getenv("SHIPROCKET_PASSWORD", "")
SHIPROCKET_BASE     = "https://apiv2.shiprocket.in/v1/external"

# ── Token cache (Shiprocket tokens expire in 10 days) ─────────────
_sr_token       = None
_sr_token_expiry = None


async def _get_shiprocket_token() -> str:
    """
    Get Shiprocket auth token. Caches it for 9 days.
    In production, store this in Redis with TTL.
    """
    global _sr_token, _sr_token_expiry
    from datetime import timedelta

    now = datetime.utcnow()
    if _sr_token and _sr_token_expiry and now < _sr_token_expiry:
        return _sr_token

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SHIPROCKET_BASE}/auth/login",
            json={"email": SHIPROCKET_EMAIL, "password": SHIPROCKET_PASSWORD},
            timeout=10,
        )
        resp.raise_for_status()
        data        = resp.json()
        _sr_token   = data["token"]
        _sr_token_expiry = now + timedelta(days=9)
        return _sr_token


def _db():
    return firestore.client()


# ── Product dimension lookup (for shipment weight/size) ───────────
PRODUCT_DIMS = {
    "testosterone_boost": {"weight": 0.25, "length": 10, "breadth": 7,  "height": 7},
    "timing_control":     {"weight": 0.25, "length": 10, "breadth": 7,  "height": 7},
    "erection_support":   {"weight": 0.25, "length": 10, "breadth": 7,  "height": 7},
    "stress_calm":        {"weight": 0.20, "length": 10, "breadth": 6,  "height": 6},
    "intimacy_shot":      {"weight": 0.15, "length": 8,  "breadth": 5,  "height": 5},
    "night_recovery":     {"weight": 0.25, "length": 10, "breadth": 7,  "height": 7},
    "performance_oil":    {"weight": 0.10, "length": 8,  "breadth": 5,  "height": 5},
    "age_performance":    {"weight": 0.30, "length": 12, "breadth": 8,  "height": 8},
    "libido_boost":       {"weight": 0.25, "length": 10, "breadth": 7,  "height": 7},
    "sperm_health":       {"weight": 0.25, "length": 10, "breadth": 7,  "height": 7},
    "ultra_performance":  {"weight": 0.40, "length": 14, "breadth": 10, "height": 10},
    "_default":           {"weight": 0.30, "length": 12, "breadth": 8,  "height": 8},
}


def _calculate_package(products: list) -> dict:
    """Calculate total weight and max dimensions for a multi-product order."""
    total_weight = 0
    max_l = max_b = max_h = 0
    for p in products:
        dims = PRODUCT_DIMS.get(p, PRODUCT_DIMS["_default"])
        total_weight += dims["weight"]
        max_l = max(max_l, dims["length"])
        max_b = max(max_b, dims["breadth"])
        max_h = max(max_h, dims["height"])
    return {
        "weight": round(total_weight, 2),
        "length": max_l,
        "breadth": max_b,
        "height": max_h,
    }


# ── Routes ────────────────────────────────────────────────────────

@router.get("/serviceability")
async def check_serviceability(pincode: str, cod: bool = False):
    """
    Check if Shiprocket can deliver to a pincode.
    Call this when user enters delivery address.
    """
    if not SHIPROCKET_EMAIL:
        return {"serviceable": True, "cod": True, "note": "Shiprocket not configured — assuming serviceable"}

    try:
        token = await _get_shiprocket_token()
        params = {
            "pickup_postcode":   "560070",   # Your warehouse pincode
            "delivery_postcode": pincode,
            "cod":               1 if cod else 0,
            "weight":            0.5,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SHIPROCKET_BASE}/courier/serviceability/",
                params=params,
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()

        couriers = data.get("data", {}).get("available_courier_companies", [])
        return {
            "serviceable": len(couriers) > 0,
            "cod":         any(c.get("cod") for c in couriers),
            "couriers":    len(couriers),
        }
    except Exception as e:
        logger.error(f"Serviceability check error: {e}")
        return {"serviceable": True, "cod": True, "note": "Check unavailable — assuming serviceable"}


@router.post("/create-shipment/{order_id}")
async def create_shipment(order_id: str, cu: dict = Depends(verify_token)):
    """
    Admin-only: Push a confirmed order to Shiprocket.
    Call after admin confirms the order is ready to dispatch.
    Returns AWB (tracking) number.
    """
    db  = _db()
    uid = cu.get("uid")

    # Admin check
    if not db.collection("admins").document(uid).get().exists:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Fetch order
    order_doc = db.collection("orders").document(order_id).get()
    if not order_doc.exists:
        raise HTTPException(status_code=404, detail="Order not found")
    order = order_doc.to_dict()

    if order.get("shiprocketOrderId"):
        raise HTTPException(status_code=400, detail="Shipment already created for this order")

    # Fetch product prices for declaration
    products = order.get("products", [])
    prices   = {}
    for p in products:
        pdoc = db.collection("products").document(p).get()
        prices[p] = pdoc.to_dict().get("price", 0) if pdoc.exists else 0

    shipping    = order.get("shipping", {})
    pkg         = _calculate_package(products)
    is_cod      = order.get("paymentMethod") == "cod"
    order_value = order.get("amount", 0)

    order_items = []
    for p in products:
        pdoc = db.collection("products").document(p).get()
        name = pdoc.to_dict().get("name", p) if pdoc.exists else p
        order_items.append({
            "name":       name,
            "sku":        p,
            "units":      1,
            "selling_price": str(prices.get(p, 0)),
        })

    # Build Shiprocket payload
    payload = {
        "order_id":             order_id,
        "order_date":           order.get("createdAt", datetime.utcnow().isoformat())[:10],
        "pickup_location":      "Primary",   # Set up in Shiprocket dashboard
        "billing_customer_name": shipping.get("name", ""),
        "billing_address":      shipping.get("addressLine1", ""),
        "billing_address_2":    shipping.get("addressLine2", ""),
        "billing_city":         shipping.get("city", ""),
        "billing_pincode":      shipping.get("pincode", ""),
        "billing_state":        shipping.get("state", ""),
        "billing_country":      "India",
        "billing_email":        "",
        "billing_phone":        shipping.get("phone", ""),
        "shipping_is_billing":  True,
        "order_items":          order_items,
        "payment_method":       "COD" if is_cod else "Prepaid",
        "sub_total":            order_value,
        "length":               pkg["length"],
        "breadth":              pkg["breadth"],
        "height":               pkg["height"],
        "weight":               pkg["weight"],
    }

    if not SHIPROCKET_EMAIL:
        # Dev mode — simulate success
        logger.warning("Shiprocket not configured — simulating shipment creation")
        db.collection("orders").document(order_id).update({
            "shiprocketOrderId": f"SR_SIM_{order_id}",
            "awbCode":           f"AWB_SIM_{order_id}",
            "courierName":       "Simulated Courier",
            "trackingUrl":       f"https://shiprocket.co/tracking/AWB_SIM_{order_id}",
            "orderStatus":       "shipped",
            "shippedAt":         datetime.utcnow().isoformat(),
        })
        return {
            "success":          True,
            "shiprocketOrderId": f"SR_SIM_{order_id}",
            "awbCode":           f"AWB_SIM_{order_id}",
            "note":              "Simulated — configure Shiprocket for production",
        }

    try:
        token = await _get_shiprocket_token()
        async with httpx.AsyncClient() as client:
            # Step 1: Create order
            resp = await client.post(
                f"{SHIPROCKET_BASE}/orders/create/adhoc",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
                timeout=15,
            )
            resp.raise_for_status()
            sr_data    = resp.json()
            sr_order_id = sr_data.get("order_id")
            shipment_id = sr_data.get("shipment_id")

            # Step 2: Assign courier and generate AWB
            awb_resp = await client.post(
                f"{SHIPROCKET_BASE}/courier/assign/awb",
                json={"shipment_id": shipment_id},
                headers={"Authorization": f"Bearer {token}"},
                timeout=15,
            )
            awb_resp.raise_for_status()
            awb_data  = awb_resp.json()
            awb_code  = awb_data.get("response", {}).get("data", {}).get("awb_code", "")
            courier   = awb_data.get("response", {}).get("data", {}).get("courier_name", "")

        # Update Firestore
        db.collection("orders").document(order_id).update({
            "shiprocketOrderId": str(sr_order_id),
            "shipmentId":        str(shipment_id),
            "awbCode":           awb_code,
            "courierName":       courier,
            "trackingUrl":       f"https://shiprocket.co/tracking/{awb_code}",
            "orderStatus":       "shipped",
            "shippedAt":         datetime.utcnow().isoformat(),
        })

        logger.info(f"Shipment created for {order_id} — AWB: {awb_code} via {courier}")
        return {
            "success":           True,
            "shiprocketOrderId": sr_order_id,
            "awbCode":           awb_code,
            "courierName":       courier,
            "trackingUrl":       f"https://shiprocket.co/tracking/{awb_code}",
        }

    except httpx.HTTPError as e:
        logger.error(f"Shiprocket API error: {e}")
        raise HTTPException(status_code=502, detail=f"Shiprocket error: {str(e)}")


@router.get("/track/{order_id}")
async def track_order(order_id: str, cu: dict = Depends(verify_token)):
    """Get live tracking status for an order."""
    db    = _db()
    order_doc = db.collection("orders").document(order_id).get()
    if not order_doc.exists:
        raise HTTPException(status_code=404, detail="Order not found")

    order = order_doc.to_dict()
    awb   = order.get("awbCode", "")

    if not awb:
        return {
            "status":      order.get("orderStatus", "placed"),
            "tracking":    None,
            "trackingUrl": None,
        }

    if not SHIPROCKET_EMAIL:
        return {
            "status":      order.get("orderStatus", "shipped"),
            "awbCode":     awb,
            "trackingUrl": order.get("trackingUrl", ""),
            "note":        "Live tracking requires Shiprocket config",
        }

    try:
        token = await _get_shiprocket_token()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SHIPROCKET_BASE}/courier/track/awb/{awb}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            resp.raise_for_status()
            track_data = resp.json()

        tracking_info = track_data.get("tracking_data", {})
        return {
            "status":       order.get("orderStatus"),
            "awbCode":      awb,
            "courierName":  order.get("courierName", ""),
            "trackingUrl":  order.get("trackingUrl", ""),
            "currentStatus": tracking_info.get("shipment_track", [{}])[0].get("current_status", ""),
            "history":       tracking_info.get("shipment_track_activities", []),
        }

    except Exception as e:
        logger.error(f"Tracking error for {order_id}: {e}")
        return {
            "status":      order.get("orderStatus"),
            "awbCode":     awb,
            "trackingUrl": order.get("trackingUrl", ""),
        }


@router.post("/webhook")
async def shiprocket_webhook(request: Request):
    """
    Shiprocket sends status updates here.
    Configure this URL in Shiprocket dashboard → Settings → Webhooks
    """
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    awb         = data.get("awb", "")
    new_status  = data.get("current_status", "")
    order_id    = data.get("order_id", "")

    logger.info(f"Shiprocket webhook: order={order_id} awb={awb} status={new_status}")

    if not order_id:
        return {"received": True}

    # Map Shiprocket statuses to VI statuses
    STATUS_MAP = {
        "Pickup Scheduled":   "processing",
        "Picked Up":          "shipped",
        "In Transit":         "shipped",
        "Out For Delivery":   "out_for_delivery",
        "Delivered":          "delivered",
        "Undelivered":        "undelivered",
        "Cancelled":          "cancelled",
        "RTO Initiated":      "rto_initiated",
        "RTO Delivered":      "rto_delivered",
    }
    vi_status = STATUS_MAP.get(new_status)

    if vi_status:
        db = _db()
        update_data = {
            "orderStatus":          vi_status,
            "lastTrackingStatus":   new_status,
            "lastTrackingUpdate":   datetime.utcnow().isoformat(),
        }
        if vi_status == "delivered":
            update_data["deliveredAt"] = datetime.utcnow().isoformat()

        # Find order by Shiprocket order_id
        orders = (db.collection("orders")
                  .where("shiprocketOrderId", "==", str(order_id))
                  .limit(1).stream())
        for o in orders:
            o.reference.update(update_data)
            logger.info(f"Updated order {o.id} → {vi_status}")

    return {"received": True, "status": vi_status or "unmapped"}
