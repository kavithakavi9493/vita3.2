"""
VI Phase 1 — Firestore Schema Seed
====================================
Run ONCE after deploying Phase 1 backend to add:
  - appConfig/subscription  (discount settings)
  - appConfig/referral      (reward amounts)
  - appConfig/languages     (supported languages)

Command:
  FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json python seed_phase1.py
"""
import os
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(cred_path))

db  = firestore.client()
now = datetime.utcnow().isoformat()


def seed_phase1():
    print("Seeding VI Phase 1 Firestore additions...")

    # ── Subscription config ──────────────────────────────────────
    db.collection("appConfig").document("subscription").set({
        "discountPercent": 15,
        "bundleDiscount":  15,
        "totalCycles":     12,
        "currency":        "INR",
        "updatedAt":       now,
    })
    print("  OK appConfig/subscription")

    # ── Referral config ──────────────────────────────────────────
    db.collection("appConfig").document("referral").set({
        "referrerCreditRs": 200,
        "refereeCreditRs":  200,
        "minOrderValueRs":  500,
        "updatedAt":        now,
    })
    print("  OK appConfig/referral")

    # ── Supported languages ──────────────────────────────────────
    db.collection("appConfig").document("languages").set({
        "supported": ["en", "hi", "kn", "te", "ta", "mr"],
        "default":   "en",
        "updatedAt": now,
    })
    print("  OK appConfig/languages")

    print("")
    print("Phase 1 seed complete!")
    print("")
    print("New Firestore collections created by the app at runtime:")
    print("  subscriptions/{userId}  — created when user subscribes")
    print("  referrals/{code}        — created when user gets a code")
    print("  referralEvents/{id}     — created when code is applied")
    print("")
    print("New fields added to users/{userId} documents:")
    print("  referralCode, referralCredit, referredBy,")
    print("  referralCode_used, pendingRefereeCredit, language")
    print("")
    print("Deploy Firestore rules and indexes:")
    print("  firebase deploy --only firestore:rules,firestore:indexes")


if __name__ == "__main__":
    seed_phase1()
