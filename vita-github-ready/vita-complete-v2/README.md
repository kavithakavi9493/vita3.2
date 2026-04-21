# VI Vita Intelligence — v3.2.0

AI-powered men's Ayurvedic wellness platform for India.

## Stack
- **Frontend**: React + Vite → Vercel
- **Backend**: FastAPI + Firebase/Firestore → Render
- **Payments**: Razorpay (online + COD)
- **AI**: Claude Haiku (chatbot with memory)
- **Cache**: Redis
- **Logistics**: Shiprocket
- **Email**: SendGrid
- **Errors**: Sentry
- **Messaging**: WhatsApp (Gupshup/WATI/Interakt)

## Quick Start (Local)

```bash
# 1. Clone and set up env
cp backend/.env.example backend/.env
# Fill in all values in backend/.env

# 2. Add Firebase service account
# Download serviceAccountKey.json from Firebase Console
# Place in backend/serviceAccountKey.json

# 3. Start everything
docker-compose up --build

# Frontend: http://localhost:5173
# Backend:  http://localhost:8080
# Backend docs: http://localhost:8080/docs
```

## Manual Setup (without Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
python seed_firestore.py    # seed products, coupons, config
python seed_phase1.py       # seed subscription + referral config
uvicorn main:app --reload --port 8080

# Frontend
cd frontend
npm install
npm run dev
```

## Deployment

- **Backend** → Render (Web Service, Docker)
- **Frontend** → Vercel (auto-deploy from git)
- **Redis** → Render Redis or Railway
- **CI/CD** → GitHub Actions (`.github/workflows/ci-cd.yml`)

## What's in This Package

### Original Features (V3.1)
Quiz funnel → Body type detection → Product stack → ₹99 activation → Dashboard + streak → AI chatbot → Subscriptions → Referrals → Admin panel → Multi-language (6 languages)

### Added in V3.2 (This Release)
- **COD orders** — `/api/cod/*` — Cash on delivery for Tier 2/3 India
- **Shiprocket** — `/api/logistics/*` — Automated shipping + live tracking  
- **Email** — `/api/email/*` — SendGrid transactional emails
- **Reviews** — `/api/reviews/*` — Social proof collection + moderation
- **Rate limiting** — slowapi on all endpoints
- **Sentry** — Production error tracking
- **Redis** — Caching layer
- **PWA** — manifest.json + service worker
- **Admin guard** — Fixed: /admin was open to everyone
- **CI/CD** — GitHub Actions pipeline
- **Tests** — `backend/tests/test_api.py`

### Improved in V3.2
- **Chatbot** — Memory (20 msgs), escalation detection, better system prompt
- **Context builder** — Churn detection, reorder prediction, cross-sell, WHY per product
- **Tracking** — Symptom inputs (libido/sleep/stress/performance), dynamic VitaScore
- **WhatsApp** — Personalised messages, auto inactive-user detection, streak milestones
- **Day7 Screen** — VitaScore graph, countdown timer, loss aversion, social proof
- **Recommendations** — WHY explanations per body type + product

## Environment Variables

See `backend/.env.example` for all required variables.

Critical ones to set before going live:
- `FIREBASE_CREDENTIALS_PATH`
- `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`
- `ANTHROPIC_API_KEY`
- `REDIS_URL`
- `SENTRY_DSN`
- `SENDGRID_API_KEY`
- `SUPPORT_WHATSAPP` + `SUPPORT_EMAIL` (for chatbot escalation)

## New Firestore Collections (V3.2)

| Collection | Purpose |
|---|---|
| `symptomLogs/{uid}/logs/{date}` | Daily symptom scores (libido/sleep/stress/perf) |
| `chatMemory/{uid}/messages/{id}` | AI conversation memory (last 20 msgs) |
| `vitaScoreHistory/{uid}/history/{date}` | VitaScore over time (for graphs) |
| `reviews/{reviewId}` | Product reviews + moderation |
| `codBlockedPincodes/{pincode}` | Pincodes where COD is blocked |

## Developer Notes

- Run `firebase deploy --only firestore:rules` after updating firestore.rules
- WhatsApp templates: copy messages from `backend/worker/whatsapp_sender.py` → MESSAGE_TEMPLATES
- To test chatbot escalation: send "not working" or "side effect" in chat
- Shiprocket warehouse pincode: set in `backend/routes/logistics.py` line ~100
