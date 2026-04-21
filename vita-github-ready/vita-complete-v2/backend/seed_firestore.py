"""
VI V3 — Firestore Seed (string IDs, unified coupon schema, task templates, app config)
Run once: FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json python seed_firestore.py
"""
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import os

cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(cred_path))
db = firestore.client()

def seed():
    print("🌱 Seeding VI V3 Firestore...")

    # ── Products (string IDs, Firestore-first) ─────────────
    products = [
        {"id":"testosterone_boost","icon":"💊","brand":"Vajra Veerya",    "hindi":"वज्र वीर्य",    "cat":"Testosterone Boost", "zone":"adrenal",      "mrp":1199,"price":849, "benefits":["Testosterone Rise","Energy Surge","Muscle Strength"],"ingredients":"Ashwagandha, Shilajit, Safed Musli, Gokshura, Kapikacchu","usage":"2 capsules daily after breakfast","rating":4.9,"reviews":3241,"active":True},
        {"id":"timing_control",     "icon":"⏱️","brand":"Sthambhan Shakti","hindi":"स्थम्भन शक्ति","cat":"Timing Control",     "zone":"reproductive", "mrp":999, "price":699, "benefits":["Better Control","Longer Duration","Confidence"],         "ingredients":"Jaiphal, Akarkara, Vidari Kanda, Ashwagandha, Shatavari",    "usage":"2 capsules 1 hour before activity",       "rating":4.8,"reviews":2847,"active":True},
        {"id":"erection_support",   "icon":"🔥","brand":"Dridha Stambh",   "hindi":"दृढ स्तम्भ",    "cat":"Erection Support",  "zone":"heart",        "mrp":1099,"price":779, "benefits":["Stronger Erection","Blood Flow","Vascular Health"],          "ingredients":"Vidarikanda, Kaunch Beej, Gokshura, Swarna Bhasma, Shilajit","usage":"2 capsules after dinner with warm milk",   "rating":4.8,"reviews":2103,"active":True},
        {"id":"stress_calm",        "icon":"🧠","brand":"Manas Veerya",    "hindi":"मनस् वीर्य",    "cat":"Stress & Calm",     "zone":"brain",        "mrp":899, "price":649, "benefits":["Calm Mind","Cortisol Control","Focus & Sleep"],              "ingredients":"Brahmi, Ashwagandha, Jatamansi, L-Theanine, Magnesium",      "usage":"1 capsule morning + 1 at night",          "rating":4.8,"reviews":1654,"active":True},
        {"id":"intimacy_shot",      "icon":"⚡","brand":"Kaam Agni Ras",   "hindi":"काम अग्नि रस",  "cat":"Pre-Intimacy Shots","zone":"reproductive", "mrp":1499,"price":999, "benefits":["Instant Ignition","Fast Absorb","Passion Boost"],            "ingredients":"Saffron, Shilajit Extract, Zinc, Ginseng, Vitamin B12",      "usage":"1 shot 30 minutes before activity",       "rating":4.9,"reviews":3102,"active":True},
        {"id":"night_recovery",     "icon":"🌿","brand":"Rasayana Shakti", "hindi":"रसायन शक्ति",   "cat":"Night Recovery",    "zone":"brain",        "mrp":1099,"price":799, "benefits":["Deep Sleep","Hormone Repair","Morning Energy"],              "ingredients":"Magnesium Glycinate, Tart Cherry, Zinc, Ashwagandha, Melatonin 0.5mg","usage":"1 scoop in warm water before bed","rating":4.7,"reviews":1287,"active":True},
        {"id":"performance_oil",    "icon":"🛢️","brand":"Vajra Tailam",    "hindi":"वज्र तैलम्",    "cat":"Performance Oil",   "zone":"reproductive", "mrp":799, "price":549, "benefits":["Fast Absorption","Blood Flow","Enhanced Sensitivity"],       "ingredients":"Nirgundi Oil, Akarkara, Clove Extract, Sesame Base, Camphor", "usage":"Apply gently 15 minutes before activity",  "rating":4.7,"reviews":1923,"active":True},
        {"id":"age_performance",    "icon":"💪","brand":"Yuva Vajra",      "hindi":"युवा वज्र",      "cat":"30+ Performance",   "zone":"adrenal",      "mrp":1299,"price":949, "benefits":["Age Reversal Formula","Testosterone Restore","Energy & Drive"],"ingredients":"Shilajit Resin, Safed Musli, Ashwagandha, Shatavari, Swarna Makshik Bhasma","usage":"2 capsules morning with warm milk","rating":4.9,"reviews":2567,"active":True},
        {"id":"libido_boost",       "icon":"🔥","brand":"Kaam Veerya",     "hindi":"काम वीर्य",      "cat":"Libido Boost",      "zone":"adrenal",      "mrp":999, "price":729, "benefits":["Reignite Desire","Hormonal Balance","Vitality"],             "ingredients":"Kapikacchu, Shatavari, Gokshura, Safed Musli, Ras Sindoor",  "usage":"2 capsules after dinner",                 "rating":4.8,"reviews":2198,"active":True},
        {"id":"sperm_health",       "icon":"🧬","brand":"Beej Shakti",     "hindi":"बीज शक्ति",      "cat":"Sperm Health",      "zone":"reproductive", "mrp":1199,"price":849, "benefits":["Sperm Count","Motility","Reproductive Vitality"],            "ingredients":"Ashwagandha, Shatavari, Kapikacchu, Zinc, Selenium, Gokshura","usage":"2 capsules daily after breakfast",        "rating":4.7,"reviews":1432,"active":True},
        {"id":"ultra_performance",  "icon":"👑","brand":"Maha Vajra",      "hindi":"महावज्र",         "cat":"Ultra Performance", "zone":"adrenal",      "mrp":1999,"price":1499,"benefits":["Maximum Potency","All-in-one Power","Premium Results"],     "ingredients":"Shilajit Resin 500mg, Swarna Bhasma, Ashwagandha KSM-66, Safed Musli, Saffron","usage":"1 capsule morning + 1 at night with warm milk","rating":5.0,"reviews":987,"active":True},
    ]
    for p in products:
        db.collection("products").document(p["id"]).set({**p,"updatedAt":datetime.utcnow().isoformat()})
    print(f"  ✅ {len(products)} products (string IDs)")

    # ── Coupons (FIXED unified schema) ─────────────────────
    coupons = [
        {"code":"VI20",    "discount":20,  "type":"percent","isActive":True,"expiresAt":"2099-12-31T23:59:59","usageLimit":500, "usedCount":0,"description":"20% off any stack"},
        {"code":"VI10",    "discount":10,  "type":"percent","isActive":True,"expiresAt":"2099-12-31T23:59:59","usageLimit":1000,"usedCount":0,"description":"10% off"},
        {"code":"WELCOME", "discount":15,  "type":"percent","isActive":True,"expiresAt":"2099-12-31T23:59:59","usageLimit":200, "usedCount":0,"description":"Welcome offer"},
        {"code":"SIDDHA",  "discount":25,  "type":"percent","isActive":True,"expiresAt":"2099-12-31T23:59:59","usageLimit":100, "usedCount":0,"description":"Special 25% off"},
        {"code":"FLAT500", "discount":500, "type":"flat",   "isActive":True,"expiresAt":"2099-12-31T23:59:59","usageLimit":300, "usedCount":0,"description":"₹500 flat off"},
    ]
    for c in coupons:
        db.collection("coupons").document(c["code"]).set(c)
    print(f"  ✅ {len(coupons)} coupons")

    # ── App config (₹99 activation — admin-adjustable) ─────
    db.collection("appConfig").document("activation").set({
        "amountPaise":9900, "amountDisplay":99, "days":7,
        "label":"7-Day Transformation Activation",
        "updatedAt":datetime.utcnow().isoformat(),
    })
    print("  ✅ appConfig/activation (₹99)")

    # ── Quiz mappings (string IDs) ─────────────────────────
    quiz_mappings = {
        "HIGH_STRESS_LOW_VITALITY": {"label":"High Stress / Low Vitality","productIds":["stress_calm","night_recovery","testosterone_boost","intimacy_shot","performance_oil","libido_boost"],"zones":["brain","adrenal"],"urgency":"HIGH"},
        "HORMONAL_DECLINE":         {"label":"Hormonal Decline",          "productIds":["testosterone_boost","libido_boost","sperm_health","intimacy_shot","night_recovery","performance_oil"],"zones":["adrenal","reproductive"],"urgency":"HIGH"},
        "PERFORMANCE_DEFICIT":      {"label":"Performance Deficit",       "productIds":["timing_control","erection_support","performance_oil","testosterone_boost","intimacy_shot","stress_calm"],"zones":["heart","reproductive"],"urgency":"HIGH"},
        "AGE_RELATED_DROP":         {"label":"Age-Related Decline",       "productIds":["age_performance","testosterone_boost","sperm_health","night_recovery","ultra_performance","libido_boost"],"zones":["brain","heart","adrenal","reproductive"],"urgency":"CRITICAL"},
        "PEAK_PERFORMANCE":         {"label":"Optimisation Mode",         "productIds":["testosterone_boost","intimacy_shot","performance_oil","stress_calm","night_recovery","sperm_health"],"zones":[],"urgency":"MODERATE"},
    }
    for k, v in quiz_mappings.items():
        db.collection("quizMappings").document(k).set(v)
    print(f"  ✅ {len(quiz_mappings)} quiz mappings")

    # ── Task templates (per body type) ─────────────────────
    task_templates = {
        "HIGH_STRESS_LOW_VITALITY": [
            {"id":"t1","label":"Manas Veerya — 1 cap with breakfast",  "time":"morning",  "icon":"🧠"},
            {"id":"t2","label":"Rasayana Shakti — 1 scoop before bed", "time":"night",    "icon":"🌿"},
            {"id":"t3","label":"10-min pranayama breathing",           "time":"morning",  "icon":"🧘"},
            {"id":"t4","label":"Testosterone Boost — 2 caps after lunch","time":"afternoon","icon":"💊"},
        ],
        "HORMONAL_DECLINE": [
            {"id":"t1","label":"Vajra Veerya — 2 caps after breakfast","time":"morning",  "icon":"💊"},
            {"id":"t2","label":"Kaam Veerya — 2 caps after dinner",    "time":"night",    "icon":"🔥"},
            {"id":"t3","label":"Night Recovery — 1 scoop before bed",  "time":"night",    "icon":"🌿"},
            {"id":"t4","label":"20-min strength walk",                  "time":"morning",  "icon":"🏃"},
        ],
        "PERFORMANCE_DEFICIT": [
            {"id":"t1","label":"Timing Control caps (as needed)",       "time":"evening",  "icon":"⏱️"},
            {"id":"t2","label":"Dridha Stambh — 2 caps after dinner",  "time":"night",    "icon":"🔥"},
            {"id":"t3","label":"Vajra Tailam — apply as directed",      "time":"evening",  "icon":"🛢️"},
            {"id":"t4","label":"Hydration — 3L water today",            "time":"morning",  "icon":"💧"},
        ],
        "AGE_RELATED_DROP": [
            {"id":"t1","label":"Yuva Vajra — 2 caps with morning milk","time":"morning",  "icon":"💪"},
            {"id":"t2","label":"Night Recovery — 1 scoop before bed",  "time":"night",    "icon":"🌿"},
            {"id":"t3","label":"Maha Vajra — 1 cap morning + 1 night", "time":"morning",  "icon":"👑"},
            {"id":"t4","label":"Beej Shakti — 2 caps after breakfast",  "time":"morning",  "icon":"🧬"},
        ],
        "PEAK_PERFORMANCE": [
            {"id":"t1","label":"Vajra Veerya — 2 caps after breakfast","time":"morning",  "icon":"💊"},
            {"id":"t2","label":"Kaam Agni Ras shot (as needed)",        "time":"evening",  "icon":"⚡"},
            {"id":"t3","label":"Manas Veerya — 1 cap morning",         "time":"morning",  "icon":"🧠"},
            {"id":"t4","label":"Evening workout — 30 mins",             "time":"evening",  "icon":"🏃"},
        ],
    }
    for bt, tasks in task_templates.items():
        db.collection("taskTemplates").document(bt).set({"bodyTypeId":bt,"tasks":tasks})
    print(f"  ✅ {len(task_templates)} task templates")

    print("\n🎉 VI V3 seed complete!")
    print("Collections: products, coupons, appConfig, quizMappings, taskTemplates")

if __name__ == "__main__":
    seed()
