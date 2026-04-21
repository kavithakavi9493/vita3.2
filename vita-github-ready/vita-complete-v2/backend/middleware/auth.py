"""
VI V3 — Firebase Auth Middleware
SKIP_AUTH is blocked in production. Hard-fails at startup if misused.
"""
import os, logging
from fastapi import Header, HTTPException, status
from firebase_admin import auth

logger    = logging.getLogger("vi-api")
_ENV      = os.getenv("ENV", "dev")
_SKIP_AUTH = os.getenv("SKIP_AUTH", "false").lower() == "true"

if _SKIP_AUTH and _ENV == "production":
    raise RuntimeError("🚨 CRITICAL: SKIP_AUTH=true is FORBIDDEN in production. Fix .env immediately.")
if _SKIP_AUTH:
    logger.warning("⚠️  SKIP_AUTH active — dev only. NEVER deploy this setting.")

async def verify_token(authorization: str = Header(None)) -> dict:
    if _SKIP_AUTH:
        return {"uid": "dev-user-001", "dev": True}
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Authorization header missing",
                            headers={"WWW-Authenticate": "Bearer"})
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid Authorization format. Expected: Bearer <token>")
    try:
        return auth.verify_id_token(parts[1])
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired. Re-login.")
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Auth error: {e}")
