"""
VI V3 — Quiz (unchanged from V2, server-side score validation preserved)
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from firebase_admin import firestore
from typing import Optional
from datetime import datetime
from middleware.auth import verify_token

router = APIRouter()
logger = logging.getLogger("vi-api")

SCORE_MAP = {
    "energyLevel":     {"High": 10, "Medium": 6, "Low": 3},
    "workoutLevel":    {"Yes": 10, "Sometimes": 5, "No": 2},
    "fatigueLevel":    {"Rarely": 5, "Sometimes": 3, "Frequently": 2},
    "stressLevel":     {"Low": 10, "Moderate": 6, "High": 2},
    "anxietyLevel":    {"No": 10, "Sometimes": 5, "Often": 2},
    "focusLevel":      {"Good": 5, "Average": 3, "Poor": 2},
    "libidoLevel":     {"High": 10, "Moderate": 6, "Low": 3},
    "timingControl":   {"No": 10, "Sometimes": 6, "Often": 2},
    "erectionQuality": {"Strong": 5, "Moderate": 3, "Weak": 2},
}
AGE_DEDUCTION = {"36-45": 2, "45+": 4}

def _score(field, value): return SCORE_MAP.get(field, {}).get(value, 0)

def compute_scores(q: dict) -> dict:
    phys  = _score("energyLevel",q.get("energyLevel","")) + _score("workoutLevel",q.get("workoutLevel","")) + _score("fatigueLevel",q.get("fatigueLevel",""))
    ment  = _score("stressLevel",q.get("stressLevel","")) + _score("anxietyLevel",q.get("anxietyLevel","")) + _score("focusLevel",q.get("focusLevel",""))
    perf  = _score("libidoLevel",q.get("libidoLevel","")) + _score("timingControl",q.get("timingControl","")) + _score("erectionQuality",q.get("erectionQuality",""))
    life  = float(q.get("lifestyleScore", 0))
    ded   = AGE_DEDUCTION.get(q.get("ageGroup",""), 0)
    vita  = max(0, min(100, life + phys + ment + perf - ded))
    return {"lifestyleScore": round(life,1), "physicalScore": round(phys,1),
            "mentalScore": round(ment,1), "performanceScore": round(perf,1), "vitaScore": round(vita,1)}

def server_detect_body_type(quiz: dict, scores: dict) -> str:
    ag = quiz.get("ageGroup","")
    if ag in ("36-45","45+"): return "AGE_RELATED_DROP"
    st = sum([scores["mentalScore"]<10, scores["lifestyleScore"]<10,
              quiz.get("stressLevel")=="High", quiz.get("anxietyLevel")=="Often",
              quiz.get("fatigueLevel")=="Frequently"])
    if st >= 3: return "HIGH_STRESS_LOW_VITALITY"
    pi = sum([scores["performanceScore"]<10,
              quiz.get("timingControl") in ("Often","Sometimes"),
              quiz.get("erectionQuality") in ("Weak","Moderate")])
    if pi >= 2: return "PERFORMANCE_DEFICIT"
    hi = sum([scores["physicalScore"]<10, quiz.get("libidoLevel")=="Low",
              scores["vitaScore"]<55, scores["mentalScore"]<12 and scores["performanceScore"]<12])
    if hi >= 2: return "HORMONAL_DECLINE"
    return "PEAK_PERFORMANCE"

class QuizSaveBody(BaseModel):
    userId: str
    ageGroup: Optional[str]=None; wakeTime: Optional[str]=None; breakfastTime: Optional[str]=None
    lunchTime: Optional[str]=None; dinnerTime: Optional[str]=None; sleepTime: Optional[str]=None
    energyLevel: Optional[str]=None; workoutLevel: Optional[str]=None; fatigueLevel: Optional[str]=None
    stressLevel: Optional[str]=None; anxietyLevel: Optional[str]=None; focusLevel: Optional[str]=None
    libidoLevel: Optional[str]=None; timingControl: Optional[str]=None; erectionQuality: Optional[str]=None
    lifestyleScore: Optional[float]=None; physicalScore: Optional[float]=None
    mentalScore: Optional[float]=None; performanceScore: Optional[float]=None; vitaScore: Optional[float]=None
    bodyTypeId: Optional[str]=None; recommendedPlan: Optional[str]=None

class QuizCompleteBody(BaseModel):
    userId: str; bodyTypeId: str; recommendedPlan: str
    vitaScore: float; lifestyleScore: float; physicalScore: float
    mentalScore: float; performanceScore: float

@router.post("/save")
def save_quiz(body: QuizSaveBody, cu: dict = Depends(verify_token)):
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        db  = firestore.client()
        upd = {k:v for k,v in body.dict().items() if v is not None and k!="userId"}
        if not upd: return {"status":"no_changes"}
        upd.update({"userId": body.userId, "updatedAt": datetime.utcnow().isoformat()})
        db.collection("user_responses").document(body.userId).set(upd, merge=True)
        return {"status":"saved","fields":list(upd.keys())}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.post("/complete")
def complete_quiz(body: QuizCompleteBody, cu: dict = Depends(verify_token)):
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        db  = firestore.client()
        saved = db.collection("user_responses").document(body.userId).get()
        saved_data = saved.to_dict() if saved.exists else {}
        server_scores    = compute_scores(saved_data)
        server_body_type = server_detect_body_type(saved_data, server_scores)
        if abs(body.vitaScore - server_scores["vitaScore"]) > 10:
            logger.warning(f"VitaScore mismatch user={body.userId} fe={body.vitaScore} sv={server_scores['vitaScore']}")
        final = {"userId":body.userId,"bodyTypeId":server_body_type,"recommendedPlan":"stack",
                 **server_scores,"hasCompletedQuiz":True,
                 "completedAt":datetime.utcnow().isoformat(),"updatedAt":datetime.utcnow().isoformat()}
        db.collection("user_responses").document(body.userId).set(final, merge=True)
        db.collection("users").document(body.userId).set({
            "hasCompletedQuiz":True,"bodyTypeId":server_body_type,"vitaScore":server_scores["vitaScore"],
            "updatedAt":datetime.utcnow().isoformat()}, merge=True)
        return {"status":"quiz_complete","bodyTypeId":server_body_type,"scores":server_scores}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}")
def get_quiz(user_id: str, cu: dict = Depends(verify_token)):
    if cu.get("uid") != user_id and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        doc = firestore.client().collection("user_responses").document(user_id).get()
        return {"hasData": doc.exists, "quizResult": doc.to_dict() if doc.exists else None}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{user_id}/reset")
def reset_quiz(user_id: str, cu: dict = Depends(verify_token)):
    if cu.get("uid") != user_id and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        db = firestore.client()
        db.collection("user_responses").document(user_id).delete()
        db.collection("users").document(user_id).set({
            "hasCompletedQuiz":False,"bodyTypeId":"","vitaScore":0,
            "updatedAt":datetime.utcnow().isoformat()}, merge=True)
        return {"status":"reset","userId":user_id}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
