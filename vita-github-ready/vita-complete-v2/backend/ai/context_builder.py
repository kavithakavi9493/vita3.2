"""
VI Vita Intelligence — AI Context Builder V2
=============================================
Major upgrades over V1:
  1. Symptom tracking integration (libido, sleep, stress, performance scores)
  2. Churn detection (flags users inactive 2-3+ days)
  3. Reorder prediction (purchase recency + compliance data)
  4. Cross-sell logic (what user is missing from their ideal stack)
  5. Conversation memory fetch (last 20 messages from Firestore)
  6. Richer prompt formatting — AI gets WHY to recommend each product
"""

import logging
from firebase_admin import firestore
from typing import Optional
from datetime import datetime, date, timedelta

logger = logging.getLogger("vi-ai")

# ── Product AI Context ─────────────────────────────────────────────
# (unchanged — but now enriched with symptom_signals for better matching)
PRODUCT_AI_CONTEXT = {
    "testosterone_boost": {
        "id": "testosterone_boost", "name": "Vajra Veerya", "price": 849,
        "supports": ["testosterone production", "energy levels", "muscle strength", "vitality", "stamina"],
        "best_for": ["low energy", "low libido", "muscle weakness", "hormonal decline", "morning fatigue"],
        "NOT_for": ["already high testosterone", "severe medical conditions"],
        "body_types": ["HORMONAL_DECLINE", "AGE_RELATED_DROP", "PEAK_PERFORMANCE"],
        "key_ingredients": ["Ashwagandha KSM-66", "Shilajit 500mg", "Safed Musli", "Gokshura", "Kapikacchu"],
        "usage": "2 capsules after breakfast with warm water or milk",
        "results_timeline": "4–6 weeks for noticeable improvement",
        "category": "Testosterone Boost",
        "synergies": ["libido_boost", "night_recovery"],
        "symptom_signals": ["energy_low", "libido_low", "stress_high"],   # maps to tracked symptoms
        "cross_sell_trigger": ["libido_low", "stress_high"],
    },
    "timing_control": {
        "id": "timing_control", "name": "Sthambhan Shakti", "price": 699,
        "supports": ["ejaculation control", "stamina during intimacy", "confidence", "duration"],
        "best_for": ["premature issues", "low confidence during intimacy", "timing concerns"],
        "NOT_for": [],
        "body_types": ["PERFORMANCE_DEFICIT"],
        "key_ingredients": ["Jaiphal", "Akarkara", "Vidari Kanda", "Ashwagandha", "Shatavari"],
        "usage": "2 capsules 1 hour before activity",
        "results_timeline": "Noticeable from first use; best results in 2–3 weeks",
        "category": "Timing Control",
        "synergies": ["erection_support", "performance_oil"],
        "symptom_signals": ["performance_low"],
        "cross_sell_trigger": ["performance_low"],
    },
    "erection_support": {
        "id": "erection_support", "name": "Dridha Stambh", "price": 779,
        "supports": ["erection quality", "blood flow", "vascular health", "firmness"],
        "best_for": ["weak erections", "inconsistent firmness", "blood circulation issues"],
        "NOT_for": [],
        "body_types": ["PERFORMANCE_DEFICIT"],
        "key_ingredients": ["Vidarikanda", "Kaunch Beej", "Gokshura", "Swarna Bhasma", "Shilajit"],
        "usage": "2 capsules after dinner with warm milk",
        "results_timeline": "2–4 weeks for consistent improvement",
        "category": "Erection Support",
        "synergies": ["timing_control", "intimacy_shot"],
        "symptom_signals": ["performance_low"],
        "cross_sell_trigger": ["performance_low"],
    },
    "stress_calm": {
        "id": "stress_calm", "name": "Manas Veerya", "price": 649,
        "supports": ["cortisol reduction", "mental calm", "focus", "sleep quality", "anxiety relief"],
        "best_for": ["high stress", "work pressure", "anxiety", "poor focus", "mental fatigue"],
        "NOT_for": [],
        "body_types": ["HIGH_STRESS_LOW_VITALITY"],
        "key_ingredients": ["Brahmi", "Ashwagandha", "Jatamansi", "L-Theanine", "Magnesium"],
        "usage": "1 capsule morning + 1 capsule at night",
        "results_timeline": "1–2 weeks for calm; 4 weeks for full benefit",
        "category": "Stress & Calm",
        "synergies": ["night_recovery", "testosterone_boost"],
        "symptom_signals": ["stress_high", "sleep_low"],
        "cross_sell_trigger": ["stress_high", "sleep_low"],
    },
    "intimacy_shot": {
        "id": "intimacy_shot", "name": "Kaam Agni Ras", "price": 999,
        "supports": ["instant energy", "fast arousal", "passion", "desire"],
        "best_for": ["before intimacy", "instant ignition", "low desire in the moment"],
        "NOT_for": [],
        "body_types": ["PERFORMANCE_DEFICIT", "HORMONAL_DECLINE", "PEAK_PERFORMANCE"],
        "key_ingredients": ["Saffron", "Shilajit Extract", "Zinc", "Ginseng", "Vitamin B12"],
        "usage": "1 shot 30 minutes before activity",
        "results_timeline": "Works within 30–45 minutes",
        "category": "Pre-Intimacy Shot",
        "synergies": ["timing_control", "erection_support"],
        "symptom_signals": ["libido_low", "performance_low"],
        "cross_sell_trigger": ["libido_low"],
    },
    "night_recovery": {
        "id": "night_recovery", "name": "Rasayana Shakti", "price": 799,
        "supports": ["deep sleep", "hormone repair overnight", "recovery", "morning energy"],
        "best_for": ["poor sleep", "waking tired", "hormone imbalance", "recovery after stress"],
        "NOT_for": [],
        "body_types": ["HIGH_STRESS_LOW_VITALITY", "HORMONAL_DECLINE", "AGE_RELATED_DROP"],
        "key_ingredients": ["Magnesium Glycinate", "Tart Cherry", "Zinc", "Ashwagandha", "Melatonin 0.5mg"],
        "usage": "1 scoop in warm water 30 minutes before bed",
        "results_timeline": "Better sleep within 3–5 nights; hormone repair in 3–4 weeks",
        "category": "Night Recovery",
        "synergies": ["stress_calm", "testosterone_boost"],
        "symptom_signals": ["sleep_low", "stress_high", "energy_low"],
        "cross_sell_trigger": ["sleep_low"],
    },
    "performance_oil": {
        "id": "performance_oil", "name": "Vajra Tailam", "price": 549,
        "supports": ["blood flow", "sensitivity", "local performance"],
        "best_for": ["enhanced sensitivity", "topical support", "performance preparation"],
        "NOT_for": [],
        "body_types": ["PERFORMANCE_DEFICIT", "HIGH_STRESS_LOW_VITALITY"],
        "key_ingredients": ["Nirgundi Oil", "Akarkara", "Clove Extract", "Sesame Base", "Camphor"],
        "usage": "Apply gently 15 minutes before activity; do not ingest",
        "results_timeline": "Immediate effect",
        "category": "Performance Oil",
        "synergies": ["timing_control", "erection_support"],
        "symptom_signals": ["performance_low"],
        "cross_sell_trigger": ["performance_low"],
    },
    "age_performance": {
        "id": "age_performance", "name": "Yuva Vajra", "price": 949,
        "supports": ["age-related decline reversal", "testosterone restoration", "energy & drive"],
        "best_for": ["men 35+", "energy decline with age", "reduced drive over years"],
        "NOT_for": ["men under 30 without hormonal issues"],
        "body_types": ["AGE_RELATED_DROP"],
        "key_ingredients": ["Shilajit Resin", "Safed Musli", "Ashwagandha", "Shatavari", "Swarna Makshik Bhasma"],
        "usage": "2 capsules in the morning with warm milk",
        "results_timeline": "6–8 weeks for significant reversal",
        "category": "30+ Performance",
        "synergies": ["testosterone_boost", "night_recovery"],
        "symptom_signals": ["energy_low", "libido_low"],
        "cross_sell_trigger": ["energy_low", "libido_low"],
    },
    "libido_boost": {
        "id": "libido_boost", "name": "Kaam Veerya", "price": 729,
        "supports": ["sexual desire", "hormonal balance", "vitality", "drive"],
        "best_for": ["low libido", "reduced desire", "hormonal imbalance", "relationship stress"],
        "NOT_for": [],
        "body_types": ["HIGH_STRESS_LOW_VITALITY", "HORMONAL_DECLINE"],
        "key_ingredients": ["Kapikacchu", "Shatavari", "Gokshura", "Safed Musli", "Ras Sindoor"],
        "usage": "2 capsules after dinner",
        "results_timeline": "2–4 weeks for noticeable desire improvement",
        "category": "Libido Boost",
        "synergies": ["testosterone_boost", "intimacy_shot"],
        "symptom_signals": ["libido_low"],
        "cross_sell_trigger": ["libido_low"],
    },
    "sperm_health": {
        "id": "sperm_health", "name": "Beej Shakti", "price": 849,
        "supports": ["sperm count", "sperm motility", "reproductive health", "fertility"],
        "best_for": ["fertility concerns", "sperm quality", "reproductive vitality"],
        "NOT_for": [],
        "body_types": ["HORMONAL_DECLINE", "AGE_RELATED_DROP"],
        "key_ingredients": ["Ashwagandha", "Shatavari", "Kapikacchu", "Zinc", "Selenium", "Gokshura"],
        "usage": "2 capsules daily after breakfast",
        "results_timeline": "90 days for full sperm cycle improvement",
        "category": "Sperm Health",
        "synergies": ["testosterone_boost", "night_recovery"],
        "symptom_signals": ["libido_low", "energy_low"],
        "cross_sell_trigger": [],
    },
    "ultra_performance": {
        "id": "ultra_performance", "name": "Maha Vajra", "price": 1499,
        "supports": ["maximum potency", "all-round performance", "premium results"],
        "best_for": ["serious performers", "comprehensive support", "maximum results seekers"],
        "NOT_for": [],
        "body_types": ["AGE_RELATED_DROP", "PEAK_PERFORMANCE"],
        "key_ingredients": ["Shilajit Resin 500mg", "Swarna Bhasma", "Ashwagandha KSM-66", "Safed Musli", "Saffron"],
        "usage": "1 capsule morning + 1 capsule at night with warm milk",
        "results_timeline": "2–3 weeks for significant effect",
        "category": "Ultra Performance",
        "synergies": ["intimacy_shot", "night_recovery"],
        "symptom_signals": ["energy_low", "performance_low", "libido_low"],
        "cross_sell_trigger": ["energy_low", "performance_low"],
    },
}

BODY_TYPE_PRODUCT_PRIORITY = {
    "HIGH_STRESS_LOW_VITALITY": ["stress_calm", "night_recovery", "testosterone_boost", "libido_boost", "intimacy_shot", "performance_oil"],
    "HORMONAL_DECLINE":         ["testosterone_boost", "libido_boost", "sperm_health", "night_recovery", "intimacy_shot", "performance_oil"],
    "PERFORMANCE_DEFICIT":      ["timing_control", "erection_support", "performance_oil", "intimacy_shot", "testosterone_boost", "stress_calm"],
    "AGE_RELATED_DROP":         ["age_performance", "testosterone_boost", "sperm_health", "night_recovery", "ultra_performance", "libido_boost"],
    "PEAK_PERFORMANCE":         ["testosterone_boost", "intimacy_shot", "performance_oil", "stress_calm", "night_recovery", "sperm_health"],
}

BODY_TYPE_DESCRIPTIONS = {
    "HIGH_STRESS_LOW_VITALITY": "high stress with depleted energy and vitality",
    "HORMONAL_DECLINE":         "declining testosterone and hormonal imbalance",
    "PERFORMANCE_DEFICIT":      "performance and timing challenges during intimacy",
    "AGE_RELATED_DROP":         "age-related decline in energy, drive, and performance",
    "PEAK_PERFORMANCE":         "optimisation-focused with strong baseline health",
}

# WHY explanations — used in chatbot AND product stack screen
BODY_TYPE_WHY = {
    "HIGH_STRESS_LOW_VITALITY": {
        "stress_calm":        "Your stress levels are suppressing testosterone. Manas Veerya breaks the stress-hormone loop first.",
        "night_recovery":     "Chronic stress destroys sleep quality. Rasayana Shakti repairs hormones during sleep — when 80% of testosterone is made.",
        "testosterone_boost": "Once stress is managed, Vajra Veerya accelerates the hormonal recovery your body is ready for.",
        "libido_boost":       "High cortisol crushes desire. Kaam Veerya rebalances the hormonal drivers of libido.",
        "intimacy_shot":      "For days when desire just isn't there — Kaam Agni Ras provides on-demand ignition.",
        "performance_oil":    "Direct blood flow support while your body recovers internally.",
    },
    "HORMONAL_DECLINE": {
        "testosterone_boost": "Your quiz shows classic hormonal decline markers. Vajra Veerya with KSM-66 Ashwagandha directly stimulates testosterone production.",
        "libido_boost":       "Low testosterone means low desire. Kaam Veerya targets the hormonal root cause, not just the symptom.",
        "sperm_health":       "Hormonal decline affects reproductive health. Beej Shakti protects and improves sperm quality.",
        "night_recovery":     "Testosterone is made during deep sleep. Rasayana Shakti optimises this window — critical for your body type.",
        "intimacy_shot":      "For immediate support while your hormones rebuild over weeks.",
        "performance_oil":    "Direct local support to complement the internal hormonal work.",
    },
    "PERFORMANCE_DEFICIT": {
        "timing_control":     "Your biggest challenge is timing. Sthambhan Shakti works from the first use — Akarkara and Jaiphal are proven for this specific issue.",
        "erection_support":   "Quality issues come from blood flow problems. Dridha Stambh improves vascular health at the root.",
        "performance_oil":    "Immediate local effect — works in 15 minutes. Complements what Sthambhan Shakti does internally.",
        "intimacy_shot":      "When confidence is low, Kaam Agni Ras provides the mental and physical boost before activity.",
        "testosterone_boost": "Low testosterone worsens performance issues. Vajra Veerya addresses the hormonal root.",
        "stress_calm":        "Performance anxiety creates a vicious cycle. Manas Veerya breaks the mental barrier.",
    },
    "AGE_RELATED_DROP": {
        "age_performance":    "Designed specifically for men 35+. Yuva Vajra's Shilajit Resin is clinically studied for reversing age-related decline.",
        "testosterone_boost": "Combines with Yuva Vajra to accelerate hormonal recovery — the two work synergistically.",
        "sperm_health":       "Age affects reproductive health significantly. Beej Shakti's 90-day protocol reverses this.",
        "night_recovery":     "Recovery slows with age. Rasayana Shakti optimises the sleep window for hormone production.",
        "ultra_performance":  "Maha Vajra with Swarna Bhasma — premium-tier support for men serious about reversing the clock.",
        "libido_boost":       "Age naturally reduces desire. Kaam Veerya's Kapikacchu rebuilds the drive that was there before.",
    },
    "PEAK_PERFORMANCE": {
        "testosterone_boost": "Even at peak, testosterone needs maintenance. Vajra Veerya keeps you at the top.",
        "intimacy_shot":      "Pre-activity boost for peak performers. Kaam Agni Ras adds the edge when you want more.",
        "performance_oil":    "Local enhancement to match your internal peak performance.",
        "stress_calm":        "Even high performers face stress. Manas Veerya protects your edge.",
        "night_recovery":     "Performance recovery happens at night. Don't skip this layer.",
        "sperm_health":       "Proactive reproductive health maintenance for peak men.",
    },
}


def _safe_get(doc_dict: dict, key: str, default=None):
    return doc_dict.get(key, default) if doc_dict else default


def _detect_churn_risk(user_data: dict, last_log_date: str) -> dict:
    """
    Detect churn risk based on activity patterns.
    Returns severity (none/low/high) and days_inactive.
    """
    if not last_log_date:
        return {"risk": "none", "days_inactive": 0}

    try:
        last = date.fromisoformat(last_log_date)
        days_inactive = (date.today() - last).days
    except Exception:
        return {"risk": "none", "days_inactive": 0}

    if days_inactive >= 3:
        return {"risk": "high",   "days_inactive": days_inactive}
    elif days_inactive >= 2:
        return {"risk": "low",    "days_inactive": days_inactive}
    return {"risk": "none", "days_inactive": days_inactive}


def _predict_reorder(purchased_products: list, last_order_date: str,
                     activation_day: int, compliance: int) -> dict:
    """
    Predict if user is likely to reorder.
    Returns: should_nudge (bool), urgency (low/medium/high), reason.
    """
    if not purchased_products:
        return {"should_nudge": False, "urgency": "none", "reason": ""}

    # Standard supplement pack lasts 30 days
    days_since_order = 0
    if last_order_date:
        try:
            order_dt = datetime.fromisoformat(last_order_date)
            days_since_order = (datetime.utcnow() - order_dt).days
        except Exception:
            pass

    # If user is on Day 14+ and compliance >70% — they're using it, nudge reorder
    if activation_day >= 21 and compliance >= 70:
        return {"should_nudge": True, "urgency": "high",
                "reason": f"Day {activation_day} with {compliance}% compliance — pack running low"}

    if days_since_order >= 25:
        return {"should_nudge": True, "urgency": "medium",
                "reason": "25+ days since purchase — product likely finishing"}

    if activation_day >= 14 and compliance >= 50:
        return {"should_nudge": True, "urgency": "low",
                "reason": "Mid-journey, good compliance — plant the reorder seed"}

    return {"should_nudge": False, "urgency": "none", "reason": ""}


def _get_cross_sell_products(purchased_ids: list, body_type: str,
                              symptom_scores: dict) -> list:
    """
    Find products NOT yet purchased that address tracked symptoms.
    Returns list of (product_id, why) tuples.
    """
    priority_ids  = BODY_TYPE_PRODUCT_PRIORITY.get(body_type, [])
    why_map       = BODY_TYPE_WHY.get(body_type, {})

    cross_sells = []
    for pid in priority_ids:
        if pid in purchased_ids:
            continue

        product = PRODUCT_AI_CONTEXT.get(pid, {})
        signals = product.get("cross_sell_trigger", [])

        # Check if any symptom signal is triggered
        triggered = False
        for sig in signals:
            symptom, threshold = sig.rsplit("_", 1) if "_" in sig else (sig, "low")
            score = symptom_scores.get(symptom, 5)
            if threshold == "low"  and score <= 4:  triggered = True
            if threshold == "high" and score >= 7:  triggered = True

        if triggered:
            cross_sells.append({
                "productId": pid,
                "name":      product.get("name", ""),
                "price":     product.get("price", 0),
                "why":       why_map.get(pid, product["best_for"][0] if product.get("best_for") else ""),
            })

        if len(cross_sells) >= 2:  # Max 2 cross-sell suggestions at once
            break

    return cross_sells


def _get_recent_symptoms(db, user_id: str) -> dict:
    """
    Fetch latest weekly symptom check-in scores.
    Returns dict with libido, sleep, stress, performance (1-10 each).
    Defaults to neutral (5) if no data.
    """
    defaults = {"libido": 5, "sleep": 5, "stress": 5, "performance": 5}
    try:
        # Get most recent symptom log
        docs = (db.collection("symptomLogs")
                .document(user_id)
                .collection("logs")
                .order_by("loggedAt", direction=firestore.Query.DESCENDING)
                .limit(1)
                .stream())
        for doc in docs:
            data = doc.to_dict()
            return {
                "libido":      data.get("libido", 5),
                "sleep":       data.get("sleep",  5),
                "stress":      data.get("stress", 5),
                "performance": data.get("performance", 5),
                "loggedAt":    data.get("loggedAt", ""),
            }
    except Exception as e:
        logger.warning(f"Symptom fetch failed for {user_id}: {e}")
    return defaults


def _get_chat_memory(db, user_id: str, limit: int = 20) -> list:
    """
    Fetch stored conversation memory for a user.
    Returns last N messages as list of {role, content} dicts.
    """
    try:
        docs = (db.collection("chatMemory")
                .document(user_id)
                .collection("messages")
                .order_by("timestamp", direction=firestore.Query.DESCENDING)
                .limit(limit)
                .stream())
        messages = []
        for doc in docs:
            d = doc.to_dict()
            messages.append({
                "role":    d.get("role", "user"),
                "content": d.get("content", ""),
            })
        return list(reversed(messages))  # chronological order
    except Exception as e:
        logger.warning(f"Memory fetch failed for {user_id}: {e}")
        return []


def build_user_context(user_id: str) -> dict:
    """
    Fetches and structures full user context from Firestore.
    Now includes: symptom scores, churn risk, reorder prediction, cross-sell.
    """
    db = firestore.client()

    quiz_doc  = db.collection("user_responses").document(user_id).get()
    quiz_data = quiz_doc.to_dict() if quiz_doc.exists else {}

    user_doc  = db.collection("users").document(user_id).get()
    user_data = user_doc.to_dict() if user_doc.exists else {}

    act_doc  = db.collection("activations").document(user_id).get()
    act_data = act_doc.to_dict() if act_doc.exists else {}

    # Last order
    orders = (db.collection("orders")
              .where("userId", "==", user_id)
              .order_by("createdAt", direction=firestore.Query.DESCENDING)
              .limit(1).stream())
    last_order = None
    for o in orders:
        last_order = o.to_dict()

    body_type  = _safe_get(quiz_data, "bodyTypeId", "") or _safe_get(user_data, "bodyTypeId", "")
    vita_score = _safe_get(quiz_data, "vitaScore",  0)  or _safe_get(user_data, "vitaScore",  0)
    streak     = _safe_get(user_data, "currentStreak", 0)
    compliance = _safe_get(user_data, "weeklyCompliance", 0)
    last_log   = _safe_get(user_data, "lastLogDate", "")

    health_profile = {
        "energyLevel":     _safe_get(quiz_data, "energyLevel",     "unknown"),
        "stressLevel":     _safe_get(quiz_data, "stressLevel",     "unknown"),
        "fatigueLevel":    _safe_get(quiz_data, "fatigueLevel",    "unknown"),
        "libidoLevel":     _safe_get(quiz_data, "libidoLevel",     "unknown"),
        "timingControl":   _safe_get(quiz_data, "timingControl",   "unknown"),
        "erectionQuality": _safe_get(quiz_data, "erectionQuality", "unknown"),
        "anxietyLevel":    _safe_get(quiz_data, "anxietyLevel",    "unknown"),
        "workoutLevel":    _safe_get(quiz_data, "workoutLevel",    "unknown"),
        "ageGroup":        _safe_get(quiz_data, "ageGroup",        "unknown"),
    }

    scores = {
        "vitaScore":        round(float(vita_score), 1),
        "physicalScore":    round(float(_safe_get(quiz_data, "physicalScore",     0)), 1),
        "mentalScore":      round(float(_safe_get(quiz_data, "mentalScore",       0)), 1),
        "performanceScore": round(float(_safe_get(quiz_data, "performanceScore",  0)), 1),
        "lifestyleScore":   round(float(_safe_get(quiz_data, "lifestyleScore",    0)), 1),
    }

    activation_day = _safe_get(act_data, "activationDay", 0)
    if not activation_day and act_data.get("activatedAt"):
        try:
            act_dt = datetime.fromisoformat(act_data["activatedAt"])
            activation_day = (datetime.utcnow() - act_dt).days + 1
        except Exception:
            pass

    purchased_products = last_order.get("products", []) if last_order else []
    last_order_date    = last_order.get("createdAt", "") if last_order else ""

    # ── Upgrades ──────────────────────────────────────────────────
    symptom_scores  = _get_recent_symptoms(db, user_id)
    churn_risk      = _detect_churn_risk(user_data, last_log)
    reorder_signal  = _predict_reorder(purchased_products, last_order_date, activation_day, compliance)
    cross_sells     = _get_cross_sell_products(purchased_products, body_type, symptom_scores)

    return {
        "userId":            user_id,
        "userName":          _safe_get(user_data, "userName", ""),
        "bodyType":          body_type,
        "bodyTypeDesc":      BODY_TYPE_DESCRIPTIONS.get(body_type, "general health optimisation"),
        "healthProfile":     health_profile,
        "scores":            scores,
        "isActivated":       bool(act_data),
        "activationDay":     activation_day,
        "currentStreak":     streak,
        "weeklyCompliance":  compliance,
        "purchasedProducts": purchased_products,
        "hasCompletedQuiz":  bool(quiz_data),
        "symptomScores":     symptom_scores,   # NEW: libido, sleep, stress, performance (1-10)
        "churnRisk":         churn_risk,        # NEW: {risk, days_inactive}
        "reorderSignal":     reorder_signal,    # NEW: {should_nudge, urgency, reason}
        "crossSells":        cross_sells,       # NEW: [{productId, name, price, why}]
        "lastLogDate":       last_log,
    }


def build_product_context(body_type: str, purchased_ids: list) -> list:
    priority_ids = BODY_TYPE_PRODUCT_PRIORITY.get(body_type, BODY_TYPE_PRODUCT_PRIORITY["PEAK_PERFORMANCE"])
    why_map      = BODY_TYPE_WHY.get(body_type, {})

    result = []
    for pid in priority_ids:
        product = PRODUCT_AI_CONTEXT.get(pid)
        if not product:
            continue
        entry                = dict(product)
        entry["user_has_this"] = pid in purchased_ids
        entry["why_for_user"]  = why_map.get(pid, "")  # NEW: personalised WHY
        result.append(entry)

    return result


def build_full_context(user_id: Optional[str]) -> dict:
    if not user_id:
        return {
            "user": None,
            "products": list(PRODUCT_AI_CONTEXT.values())[:6],
            "is_guest": True,
        }

    try:
        user_ctx    = build_user_context(user_id)
        product_ctx = build_product_context(user_ctx["bodyType"], user_ctx["purchasedProducts"])
        return {
            "user":     user_ctx,
            "products": product_ctx,
            "is_guest": False,
        }
    except Exception as e:
        logger.error(f"Context build failed for {user_id}: {e}", exc_info=True)
        return {
            "user":     None,
            "products": list(PRODUCT_AI_CONTEXT.values())[:6],
            "is_guest": True,
            "error":    str(e),
        }


def format_context_for_prompt(ctx: dict) -> str:
    """
    Converts context into a richly structured prompt block.
    The AI now gets: scores, symptoms, churn state, reorder signal, WHY per product.
    """
    lines = []

    if ctx.get("is_guest") or not ctx.get("user"):
        lines.append("USER: Guest (no quiz data yet)")
        lines.append("APPROACH: Focus on understanding their issue first. Then educate on VI's solutions.")
    else:
        u = ctx["user"]
        name = u.get("userName", "")
        lines.append("═══ USER PROFILE ═══")
        if name:
            lines.append(f"  Name: {name}")
        lines.append(f"  Body Type: {u['bodyType']} — {u['bodyTypeDesc']}")
        lines.append(f"  VitaScore: {u['scores']['vitaScore']}/100")
        lines.append(f"  Age Group: {u['healthProfile']['ageGroup']}")
        lines.append(f"  Activation Day: {u['activationDay']}")
        lines.append(f"  Streak: {u['currentStreak']} days  |  Weekly Compliance: {u['weeklyCompliance']}%")

        # Symptom scores (most important personalisation signal)
        s = u.get("symptomScores", {})
        if s:
            lines.append("  Current Symptom Scores (1=worst, 10=best):")
            lines.append(f"    • Libido:      {s.get('libido', '?')}/10")
            lines.append(f"    • Sleep:       {s.get('sleep',  '?')}/10")
            lines.append(f"    • Stress:      {10 - s.get('stress', 5)}/10  (higher = more stressed)")
            lines.append(f"    • Performance: {s.get('performance', '?')}/10")

        # Quiz highlights
        h = u["healthProfile"]
        lines.append("  Quiz Profile:")
        for k, label in [("energyLevel","Energy"), ("stressLevel","Stress"),
                          ("libidoLevel","Libido"), ("timingControl","Timing"),
                          ("erectionQuality","Erection Quality")]:
            if h.get(k) and h[k] != "unknown":
                lines.append(f"    • {label}: {h[k]}")

        # Purchased products
        if u["purchasedProducts"]:
            lines.append(f"  Owns: {', '.join(u['purchasedProducts'])}")
        else:
            lines.append("  Owns: Nothing yet")

        # Churn risk — CRITICAL AI signal
        churn = u.get("churnRisk", {})
        if churn.get("risk") == "high":
            lines.append(f"  ⚠️ CHURN RISK HIGH: User inactive {churn['days_inactive']} days.")
            lines.append("  PRIORITY: Re-engage. Show empathy. Don't push products yet. Ask what's going on.")
        elif churn.get("risk") == "low":
            lines.append(f"  ⚡ Slight inactivity: {churn['days_inactive']} days. Gently encourage return.")

        # Reorder signal
        reorder = u.get("reorderSignal", {})
        if reorder.get("should_nudge"):
            lines.append(f"  🔁 REORDER OPPORTUNITY ({reorder['urgency']}): {reorder['reason']}")
            lines.append("  When relevant, mention they can reorder with subscribe & save (15% off).")

        # Cross-sell
        cs = u.get("crossSells", [])
        if cs:
            lines.append("  💡 CROSS-SELL PRODUCTS (not yet purchased, relevant to their symptoms):")
            for c in cs:
                lines.append(f"    → {c['name']} (₹{c['price']}): {c['why']}")

    # Products
    lines.append("\n═══ RELEVANT PRODUCTS ═══")
    for p in ctx.get("products", []):
        has = " ✓ OWNS" if p.get("user_has_this") else ""
        lines.append(f"  • {p['name']} ({p['id']}) ₹{p['price']}{has}")
        lines.append(f"    WHY for this user: {p.get('why_for_user', p['best_for'][0] if p.get('best_for') else '')}")
        lines.append(f"    Usage: {p['usage']}  |  Results: {p['results_timeline']}")

    return "\n".join(lines)
