# VI V2 → V3 Migration Guide

## STEP 1 — Backend (do first, non-breaking)

### 1a. Copy new files
```
backend/main.py           ← REPLACE (fixes router prefix bug)
backend/routes/coupons.py ← REPLACE (fixes field names)
backend/routes/activations.py ← NEW
backend/routes/tracking.py    ← NEW
backend/seed_firestore.py     ← REPLACE (V3 seed)
```

### 1b. Run V3 seed (one-time)
```bash
cd backend
FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json python seed_firestore.py
```
This seeds: products (with numId), coupons (fixed schema), appConfig/activation, quizMappings, taskTemplates.

### 1c. Update requirements.txt — no new deps needed ✅

### 1d. Verify backend starts clean
```bash
uvicorn main:app --reload
# Check: GET /health → {"status": "healthy", "firebase": "connected"}
# Check: GET /api/products/ → products list
# Check: GET /api/plans/ → plans list (separate from products now)
```

---

## STEP 2 — Frontend

### 2a. Copy new/updated files
```
frontend/src/context/AppContext.jsx   ← REPLACE (V3 state fields)
frontend/src/App.jsx                  ← REPLACE (new routes)
frontend/src/utils/api.js             ← NEW (centralised API client)
frontend/src/utils/bodyTypes.js       ← NEW (centralised body type data)
frontend/src/screens/BodyAvatarScreen.jsx     ← NEW
frontend/src/screens/ProductStackScreen.jsx  ← NEW (replaces PlanScreen + ProductScreen)
frontend/src/screens/ActivationScreen.jsx    ← NEW
frontend/src/screens/Day7ConversionScreen.jsx ← NEW
frontend/src/screens/DashboardScreen.jsx     ← REPLACE (real data)
```

### 2b. Update .env files

`frontend/.env`:
```
VITE_API_URL=https://your-backend.com
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxx
```

`backend/.env`:
```
FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
ALLOWED_ORIGINS=https://your-frontend.com
ACTIVATION_AMOUNT_PAISE=9900
ACTIVATION_DAYS=7
ENV=production
# NEVER set SKIP_AUTH=true in production
```

### 2c. Add Razorpay script to index.html
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### 2d. Update firestore.rules
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## STEP 3 — Existing flow (NO changes needed)

These screens are untouched and keep working:
- SplashScreen, SignupScreen, OTPScreen
- RoutineScreen, AgeGroupScreen
- Quiz1Screen, Quiz2Screen, Quiz3Screen
- AnalyzingScreen, FinalLoadingScreen
- ResultScreen, RootCauseScreen
- PaymentScreens (SuccessScreen, FailureScreen)
- ProfileScreen

Old route `/plan` and `/product` → no longer in the router.
Replace any links to these with `/product-stack`.

---

## STEP 4 — Post-deploy verification checklist

- [ ] GET /health returns firebase: connected
- [ ] GET /api/products/ returns 11 products
- [ ] GET /api/coupons/validate/VI20 returns valid: true
- [ ] POST /api/activations/create-order works with valid token
- [ ] Body avatar scan animation plays on /body-avatar
- [ ] Dashboard stats load from Firestore (not hardcoded)
- [ ] Task toggle saves to dailyLogs collection
- [ ] Streak increments after saving log
- [ ] Day 7 banner appears when activationDay >= 7

---

## BREAKING CHANGES SUMMARY

| Old | New | Action |
|-----|-----|--------|
| `/plan` route | `/product-stack` | Update any nav links |
| `/product` route | `/product-stack` | Update any nav links |
| `vi_app_state` localStorage key | `vi_app_state_v3` | First load will reset state (users re-login) |
| Plans API (`/api/`) shadowed | `/api/plans/` | Update frontend API calls |
| Products API (`/api/`) shadowed | `/api/products/` | Update frontend API calls |
| Coupon `discountPct` field | `discount` | Re-seed fixes this |
| Coupon `active` field | `isActive` | Re-seed fixes this |

---

## NEW COLLECTIONS ADDED TO FIRESTORE

| Collection | Purpose |
|---|---|
| `activations/{userId}` | ₹99 activation record |
| `dailyLogs/{userId}/logs/{date}` | Daily supplement log |
| `weeklyCheckins/{userId}/weeks/{n}` | Weekly check-in |
| `taskTemplates/{bodyTypeId}` | Per-body-type daily tasks |
| `appConfig/activation` | Admin-adjustable ₹99 amount |
