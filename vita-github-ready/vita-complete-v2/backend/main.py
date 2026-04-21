"""
VI Vita Intelligence API — V3.2.0
==================================
Additions over V3.1:
  - Sentry error tracking
  - Redis-backed rate limiting (slowapi)
  - Redis cache client (shared across routes)
  - COD payments route
  - Shiprocket logistics route
  - Email service route
  - Global idempotency key check for Razorpay webhooks
"""
import os, time, logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials

# ── Sentry (must be imported before anything else) ─────────────────
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

load_dotenv()

SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.2,   # 20% of requests for performance tracing
        environment=os.getenv("ENV", "dev"),
        release=f"vi-api@3.2.0",
    )

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger("vi-api")

# ── Firebase ──────────────────────────────────────────────────────
cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
if os.path.exists(cred_path) and not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(cred_path))
    logger.info("Firebase Admin initialised ✅")
else:
    logger.warning("Firebase credentials not found — Firestore disabled")

# ── Redis Cache ────────────────────────────────────────────────────
import redis as redis_lib
_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
try:
    redis_client = redis_lib.from_url(_REDIS_URL, decode_responses=True)
    redis_client.ping()
    logger.info("Redis connected ✅")
except Exception as e:
    redis_client = None
    logger.warning(f"Redis not available — caching disabled: {e}")

# ── Rate Limiter ───────────────────────────────────────────────────
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_REDIS_URL if redis_client else "memory://",
    default_limits=["200/minute"],  # Global default
)

# ── App Startup/Shutdown ────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("VI API starting up...")
    yield
    logger.info("VI API shutting down...")
    if redis_client:
        redis_client.close()

_ENV = os.getenv("ENV", "dev")
app  = FastAPI(
    title="VI Vita Intelligence API",
    version="3.2.0",
    docs_url="/docs" if _ENV != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# ── Middleware ─────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    t    = time.time()
    resp = await call_next(request)
    ms   = round((time.time() - t) * 1000)
    logger.info(f"{request.method} {request.url.path} → {resp.status_code} [{ms}ms]")
    if ms > 3000:
        logger.warning(f"SLOW REQUEST: {request.url.path} took {ms}ms")
    return resp

@app.exception_handler(Exception)
async def global_exc(request: Request, exc: Exception):
    logger.error(f"Unhandled: {request.url.path} {exc}", exc_info=True)
    sentry_sdk.capture_exception(exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# ── V3 Core Routers ────────────────────────────────────────────────
from routes.products      import router as products_router
from routes.quiz          import router as quiz_router
from routes.payments      import router as payments_router
from routes.orders        import router as orders_router
from routes.coupons       import router as coupons_router
from routes.activations   import router as activations_router
from routes.tracking      import router as tracking_router
from routes.admin         import router as admin_router
from routes.whatsapp      import router as whatsapp_router

# ── Phase 1: Revenue Engine ────────────────────────────────────────
from routes.chat          import router as chat_router
from routes.subscriptions import router as subscriptions_router
from routes.referrals     import router as referrals_router

# ── Phase 2: Operations & Growth ──────────────────────────────────
from routes.cod           import router as cod_router
from routes.logistics     import router as logistics_router
from routes.email         import router as email_router
from routes.reviews       import router as reviews_router

# ── Register all routers ───────────────────────────────────────────
app.include_router(products_router,      prefix="/api/products",      tags=["Products"])
app.include_router(quiz_router,          prefix="/api/quiz",          tags=["Quiz"])
app.include_router(payments_router,      prefix="/api/payments",      tags=["Payments"])
app.include_router(orders_router,        prefix="/api/orders",        tags=["Orders"])
app.include_router(coupons_router,       prefix="/api/coupons",       tags=["Coupons"])
app.include_router(activations_router,   prefix="/api/activations",   tags=["Activations"])
app.include_router(tracking_router,      prefix="/api/tracking",      tags=["Tracking"])
app.include_router(admin_router,         prefix="/api/admin",         tags=["Admin"])
app.include_router(whatsapp_router,      prefix="/api/whatsapp",      tags=["WhatsApp"])
app.include_router(chat_router,          prefix="/api/chat",          tags=["AI Chat"])
app.include_router(subscriptions_router, prefix="/api/subscriptions", tags=["Subscriptions"])
app.include_router(referrals_router,     prefix="/api/referrals",     tags=["Referrals"])
app.include_router(cod_router,           prefix="/api/cod",           tags=["COD"])
app.include_router(logistics_router,     prefix="/api/logistics",     tags=["Logistics"])
app.include_router(email_router,         prefix="/api/email",         tags=["Email"])
app.include_router(reviews_router,       prefix="/api/reviews",       tags=["Reviews"])


@app.get("/")
def root():
    return {"status": "online", "app": "VI Vita Intelligence API", "version": "3.2.0"}


@app.get("/health")
def health():
    return {
        "status":   "healthy",
        "firebase": "connected" if firebase_admin._apps else "disconnected",
        "redis":    "connected" if redis_client and redis_client.ping() else "disconnected",
        "sentry":   "enabled"  if SENTRY_DSN else "disabled",
        "env":      _ENV,
        "version":  "3.2.0",
        "modules": {
            "chat": "enabled", "subscriptions": "enabled",
            "referrals": "enabled", "cod": "enabled",
            "logistics": "enabled", "email": "enabled", "reviews": "enabled",
        },
    }
