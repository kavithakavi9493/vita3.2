"""
VI Vita Intelligence — Tracking System V2
==========================================
Upgrades over V1:
  1. Symptom tracking: libido, sleep, stress, performance (1-10 scale)
     Stored separately in symptomLogs/{userId}/logs/{date}
  2. Dynamic VitaScore: recalculated from symptom trends over time
  3. Weekly symptom check-in — structured data, not just free text
  4. VitaScore history for graph (Day 1 → now)
  5. Richer stats endpoint — includes symptom trends and VitaScore trajectory
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from firebase_admin import firestore
from typing import Optional, List
from datetime import datetime, timedelta, date
from middleware.auth import verify_token

router = APIRouter()
logger = logging.getLogger("vi-api")


# ── Models ────────────────────────────────────────────────────────
class DailyLogBody(BaseModel):
    userId:         str
    date:           str           # YYYY-MM-DD
    tasksCompleted: List[str]
    energyRating:   Optional[int] = None   # 1-5
    moodRating:     Optional[int] = None   # 1-5
    notes:          Optional[str] = ""

class SymptomLogBody(BaseModel):
    """
    Daily symptom self-assessment.
    All scores 1-10 where 10 = best possible.
    Stress: 10 = completely calm, 1 = extremely stressed.
    """
    userId:      str
    date:        str    # YYYY-MM-DD
    libido:      int    # 1-10 (10 = very high)
    sleep:       int    # 1-10 (10 = perfect sleep)
    stress:      int    # 1-10 (10 = completely calm, 1 = very stressed)
    performance: int    # 1-10 (10 = excellent)
    notes:       Optional[str] = ""

    @validator("libido", "sleep", "stress", "performance")
    def check_range(cls, v):
        if not (1 <= v <= 10):
            raise ValueError("Score must be 1-10")
        return v

class WeeklyCheckinBody(BaseModel):
    """Upgraded weekly check-in with symptom scores + qualitative feedback."""
    userId:          str
    weekNumber:      int
    # Symptom scores (1-10)
    libido:          int
    sleep:           int
    stress:          int
    performance:     int
    # Qualitative
    energyImproved:  bool
    sleepImproved:   bool
    performanceNote: Optional[str] = ""
    overallRating:   int           # 1-5

    @validator("libido", "sleep", "stress", "performance")
    def check_range(cls, v):
        if not (1 <= v <= 10):
            raise ValueError("Score must be 1-10")
        return v

    @validator("overallRating")
    def check_overall(cls, v):
        if not (1 <= v <= 5):
            raise ValueError("Overall rating must be 1-5")
        return v


# ── VitaScore Dynamic Recalculation ──────────────────────────────
def _recalculate_vita_score(
    quiz_vita_score: float,
    symptom_scores: dict,
    activation_day: int,
    streak: int,
    compliance: int,
) -> float:
    """
    Dynamically recalculate VitaScore based on:
      - Quiz baseline (40% weight — the starting point)
      - Current symptoms (40% weight — most recent self-report)
      - Behaviour (20% weight — streak + compliance)

    Returns a score 0-100.
    """
    # Component 1: Quiz baseline (40%)
    quiz_component = min(quiz_vita_score, 100) * 0.40

    # Component 2: Symptom scores (40%)
    # symptoms are 1-10 scale, we normalise to 0-100
    s = symptom_scores
    if s and any(v > 0 for v in s.values()):
        # Stress: 10 = calm = good, so we use it directly
        avg_symptom = (
            s.get("libido", 5) +
            s.get("sleep",  5) +
            s.get("stress", 5) +      # already inverted: 10=calm=good
            s.get("performance", 5)
        ) / 4
        symptom_component = (avg_symptom / 10) * 100 * 0.40
    else:
        # No symptom data yet — use quiz baseline for this component too
        symptom_component = quiz_component

    # Component 3: Behaviour (20%)
    # streak out of 30 days, compliance 0-100
    streak_score     = min(streak / 30, 1.0) * 100
    behaviour_score  = (streak_score * 0.5 + compliance * 0.5)
    behaviour_component = behaviour_score * 0.20

    raw = quiz_component + symptom_component + behaviour_component
    return round(min(raw, 100), 1)


def _project_vita_score(current: float, activation_day: int,
                         compliance: int, streak: int) -> dict:
    """
    Project VitaScore at Day 30, Day 60, Day 90 based on current trajectory.
    Used in Day7ConversionScreen and Dashboard graphs.
    """
    if compliance < 30:
        daily_gain = 0.2
    elif compliance < 60:
        daily_gain = 0.4
    elif compliance < 80:
        daily_gain = 0.6
    else:
        daily_gain = 0.9

    max_score = 95  # Never promises 100
    day30 = min(current + daily_gain * (30 - activation_day), max_score)
    day60 = min(current + daily_gain * (60 - activation_day), max_score)
    day90 = min(current + daily_gain * (90 - activation_day), max_score)

    return {
        "current":   round(current, 1),
        "day30":     round(day30, 1),
        "day60":     round(day60, 1),
        "day90":     round(day90, 1),
        "dailyGain": round(daily_gain, 2),
    }


# ── Routes ────────────────────────────────────────────────────────

@router.post("/log")
def save_daily_log(body: DailyLogBody, current_user: dict = Depends(verify_token)):
    if current_user.get("uid") != body.userId and not current_user.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        db  = firestore.client()
        ref = (db.collection("dailyLogs").document(body.userId)
               .collection("logs").document(body.date))

        ref.set({
            "userId":         body.userId,
            "date":           body.date,
            "tasksCompleted": body.tasksCompleted,
            "taskCount":      len(body.tasksCompleted),
            "energyRating":   body.energyRating,
            "moodRating":     body.moodRating,
            "notes":          body.notes,
            "loggedAt":       datetime.utcnow().isoformat(),
        }, merge=True)

        streak = _compute_streak(db, body.userId)
        db.collection("users").document(body.userId).set({
            "currentStreak":    streak,
            "lastLogDate":      body.date,
            "weeklyCompliance": _compute_weekly_compliance(db, body.userId),
        }, merge=True)

        return {"status": "logged", "date": body.date, "streak": streak}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/symptoms")
def log_symptoms(body: SymptomLogBody, current_user: dict = Depends(verify_token)):
    """
    Log daily symptom scores. Can be called once per day.
    This is the primary input for dynamic VitaScore recalculation.
    """
    if current_user.get("uid") != body.userId and not current_user.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        db  = firestore.client()
        now = datetime.utcnow().isoformat()

        # Save symptom log
        (db.collection("symptomLogs").document(body.userId)
         .collection("logs").document(body.date)).set({
            "userId":      body.userId,
            "date":        body.date,
            "libido":      body.libido,
            "sleep":       body.sleep,
            "stress":      body.stress,
            "performance": body.performance,
            "notes":       body.notes or "",
            "loggedAt":    now,
        })

        # Recalculate VitaScore dynamically
        user_doc    = db.collection("users").document(body.userId).get()
        user_data   = user_doc.to_dict() if user_doc.exists else {}
        quiz_doc    = db.collection("user_responses").document(body.userId).get()
        quiz_data   = quiz_doc.to_dict() if quiz_doc.exists else {}

        quiz_vita   = float(quiz_data.get("vitaScore", user_data.get("vitaScore", 50)))
        streak      = user_data.get("currentStreak", 0)
        compliance  = user_data.get("weeklyCompliance", 0)
        act_day     = user_data.get("activationDay", 1)

        symptom_dict = {
            "libido": body.libido, "sleep": body.sleep,
            "stress": body.stress, "performance": body.performance,
        }

        new_vita = _recalculate_vita_score(quiz_vita, symptom_dict, act_day, streak, compliance)
        projection = _project_vita_score(new_vita, act_day, compliance, streak)

        # Update user record with new VitaScore + save to history
        db.collection("users").document(body.userId).set({
            "vitaScore":        new_vita,
            "vitaScoreUpdated": now,
        }, merge=True)

        # Save to VitaScore history for graph
        (db.collection("vitaScoreHistory").document(body.userId)
         .collection("history").document(body.date)).set({
            "date":       body.date,
            "vitaScore":  new_vita,
            "activationDay": act_day,
            "loggedAt":   now,
        })

        logger.info(f"Symptoms logged for {body.userId}: vitaScore {quiz_vita}→{new_vita}")

        return {
            "status":     "logged",
            "vitaScore":  new_vita,
            "projection": projection,
            "date":       body.date,
        }
    except Exception as e:
        logger.error(f"Symptom log error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/symptoms/{user_id}/history")
def get_symptom_history(user_id: str, days: int = 30,
                         current_user: dict = Depends(verify_token)):
    """Get symptom score history for trend graphs."""
    if current_user.get("uid") != user_id and not current_user.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        db   = firestore.client()
        docs = (db.collection("symptomLogs").document(user_id)
                .collection("logs")
                .order_by("date", direction=firestore.Query.DESCENDING)
                .limit(days).stream())
        logs = [d.to_dict() for d in docs]
        return {"logs": list(reversed(logs)), "count": len(logs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vitascore/{user_id}/history")
def get_vitascore_history(user_id: str, days: int = 90,
                            current_user: dict = Depends(verify_token)):
    """VitaScore history for progress graph in Day7 screen and Dashboard."""
    if current_user.get("uid") != user_id and not current_user.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        db   = firestore.client()
        docs = (db.collection("vitaScoreHistory").document(user_id)
                .collection("history")
                .order_by("date")
                .limit(days).stream())
        history = [d.to_dict() for d in docs]
        return {"history": history, "count": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/log/{user_id}/today")
def get_today_log(user_id: str, current_user: dict = Depends(verify_token)):
    if current_user.get("uid") != user_id and not current_user.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    today = date.today().isoformat()
    try:
        db  = firestore.client()
        log_doc = (db.collection("dailyLogs").document(user_id)
                   .collection("logs").document(today).get())
        sym_doc = (db.collection("symptomLogs").document(user_id)
                   .collection("logs").document(today).get())
        return {
            "hasLog":     log_doc.exists,
            "hasSymptoms": sym_doc.exists,
            "log":        log_doc.to_dict() if log_doc.exists else None,
            "symptoms":   sym_doc.to_dict() if sym_doc.exists else None,
            "date":       today,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/log/{user_id}/history")
def get_log_history(user_id: str, days: int = 30,
                     current_user: dict = Depends(verify_token)):
    if current_user.get("uid") != user_id and not current_user.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        db   = firestore.client()
        docs = (db.collection("dailyLogs").document(user_id)
                .collection("logs")
                .order_by("date", direction=firestore.Query.DESCENDING)
                .limit(days).stream())
        return {"logs": [d.to_dict() for d in docs]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/{user_id}")
def get_stats(user_id: str, current_user: dict = Depends(verify_token)):
    """
    Upgraded stats endpoint.
    Now returns: streak, compliance, vitaScore, projection, symptom trends.
    """
    if current_user.get("uid") != user_id and not current_user.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        db         = firestore.client()
        streak     = _compute_streak(db, user_id)
        total_days = _compute_total_days(db, user_id)
        compliance = _compute_weekly_compliance(db, user_id)

        # Activation day
        act_doc    = db.collection("activations").document(user_id).get()
        day_number = 1
        if act_doc.exists:
            act_at = act_doc.to_dict().get("activatedAt", "")
            if act_at:
                try:
                    act_dt     = datetime.fromisoformat(act_at)
                    day_number = min((datetime.utcnow() - act_dt).days + 1, 90)
                except Exception:
                    pass

        week_number = max((day_number - 1) // 7 + 1, 1)

        # Current VitaScore
        user_doc   = db.collection("users").document(user_id).get()
        user_data  = user_doc.to_dict() if user_doc.exists else {}
        quiz_doc   = db.collection("user_responses").document(user_id).get()
        quiz_data  = quiz_doc.to_dict() if quiz_doc.exists else {}

        vita_score = user_data.get("vitaScore") or quiz_data.get("vitaScore", 50)
        projection = _project_vita_score(float(vita_score), day_number, compliance, streak)

        # Latest symptom scores
        latest_symptoms = {}
        sym_docs = (db.collection("symptomLogs").document(user_id)
                    .collection("logs")
                    .order_by("loggedAt", direction=firestore.Query.DESCENDING)
                    .limit(1).stream())
        for d in sym_docs:
            s = d.to_dict()
            latest_symptoms = {
                "libido":      s.get("libido", 0),
                "sleep":       s.get("sleep",  0),
                "stress":      s.get("stress", 0),
                "performance": s.get("performance", 0),
                "date":        s.get("date", ""),
            }

        return {
            "streak":           streak,
            "totalDaysActive":  total_days,
            "dayNumber":        day_number,
            "weekNumber":       week_number,
            "weeklyCompliance": compliance,
            "vitaScore":        round(float(vita_score), 1),
            "projection":       projection,
            "latestSymptoms":   latest_symptoms,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/checkin")
def save_weekly_checkin(body: WeeklyCheckinBody, current_user: dict = Depends(verify_token)):
    """Upgraded weekly check-in with symptom scores."""
    if current_user.get("uid") != body.userId and not current_user.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        db  = firestore.client()
        now = datetime.utcnow().isoformat()

        (db.collection("weeklyCheckins").document(body.userId)
         .collection("weeks").document(str(body.weekNumber))).set({
            "userId":          body.userId,
            "weekNumber":      body.weekNumber,
            "libido":          body.libido,
            "sleep":           body.sleep,
            "stress":          body.stress,
            "performance":     body.performance,
            "energyImproved":  body.energyImproved,
            "sleepImproved":   body.sleepImproved,
            "performanceNote": body.performanceNote or "",
            "overallRating":   body.overallRating,
            "submittedAt":     now,
        })

        # Also save as symptom log for the current date
        today = date.today().isoformat()
        (db.collection("symptomLogs").document(body.userId)
         .collection("logs").document(today)).set({
            "userId":      body.userId,
            "date":        today,
            "libido":      body.libido,
            "sleep":       body.sleep,
            "stress":      body.stress,
            "performance": body.performance,
            "source":      "weekly_checkin",
            "loggedAt":    now,
        }, merge=True)

        return {"status": "saved", "week": body.weekNumber}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report/{user_id}/week/{week_num}")
def get_weekly_report(user_id: str, week_num: int,
                       current_user: dict = Depends(verify_token)):
    if current_user.get("uid") != user_id and not current_user.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        db        = firestore.client()
        today     = date.today()
        week_end  = today - timedelta(days=(today.weekday() + 1) % 7)
        week_start = week_end - timedelta(days=(week_num - 1) * 7 + 6)
        week_end_calc = week_start + timedelta(days=6)
        dates     = [(week_start + timedelta(days=i)).isoformat() for i in range(7)]

        logs      = []
        symptoms  = []
        for d in dates:
            log_doc = (db.collection("dailyLogs").document(user_id)
                       .collection("logs").document(d).get())
            sym_doc = (db.collection("symptomLogs").document(user_id)
                       .collection("logs").document(d).get())
            if log_doc.exists: logs.append(log_doc.to_dict())
            if sym_doc.exists: symptoms.append(sym_doc.to_dict())

        compliance   = round(len(logs) / 7 * 100)
        avg_energy   = round(sum(l.get("energyRating", 0) for l in logs
                                 if l.get("energyRating")) /
                             max(len([l for l in logs if l.get("energyRating")]), 1), 1)
        total_tasks  = sum(l.get("taskCount", 0) for l in logs)

        # Symptom averages for the week
        sym_avgs = {}
        if symptoms:
            for metric in ("libido", "sleep", "stress", "performance"):
                vals = [s.get(metric, 0) for s in symptoms if s.get(metric)]
                sym_avgs[metric] = round(sum(vals) / max(len(vals), 1), 1)

        return {
            "weekNumber":    week_num,
            "dateRange":     f"{week_start.isoformat()} → {week_end_calc.isoformat()}",
            "daysLogged":    len(logs),
            "compliance":    compliance,
            "avgEnergy":     avg_energy,
            "totalTasks":    total_tasks,
            "symptomAvgs":   sym_avgs,
            "logs":          logs,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Helpers ───────────────────────────────────────────────────────
def _compute_streak(db, user_id: str) -> int:
    streak     = 0
    check_date = date.today()
    for _ in range(90):
        doc = (db.collection("dailyLogs").document(user_id)
               .collection("logs").document(check_date.isoformat()).get())
        if doc.exists and doc.to_dict().get("taskCount", 0) > 0:
            streak    += 1
            check_date -= timedelta(days=1)
        else:
            break
    return streak


def _compute_total_days(db, user_id: str) -> int:
    docs = (db.collection("dailyLogs").document(user_id).collection("logs").stream())
    return sum(1 for d in docs if d.to_dict().get("taskCount", 0) > 0)


def _compute_weekly_compliance(db, user_id: str) -> int:
    logged = 0
    for i in range(7):
        d   = (date.today() - timedelta(days=i)).isoformat()
        doc = (db.collection("dailyLogs").document(user_id)
               .collection("logs").document(d).get())
        if doc.exists and doc.to_dict().get("taskCount", 0) > 0:
            logged += 1
    return round(logged / 7 * 100)
