"""
GUIDIFY Backend — Main Application

FastAPI application entry point.
Per architecture.md §2: Routes match api.md sections, all under /api/v1.
Per api.md: Bearer token (Supabase JWT) on all endpoints except /health.
Error responses follow: { "error": { "code": string, "message": string } }
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import os
import sys
import time

# Force UTF-8 encoding for stdout/stderr (Windows compatibility)
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Import core modules
from app.core.config import settings
from app.core.exceptions import GUIDIFYException
from app.core.logger import logger, log_request
from app.middleware.error_handler import (
    guidify_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    global_exception_handler
)

# Initialize Sentry if configured
if settings.ENABLE_SENTRY and getattr(settings, 'SENTRY_DSN', None):
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=0.1,
            environment=settings.ENVIRONMENT,
        )
        logger.info("Sentry initialized successfully")
    except Exception as sentry_err:
        logger.warning(f"Sentry initialization failed: {sentry_err}")

# Import rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import new API route modules (per architecture.md §2, api.md)
from app.api import auth, dashboard, resume, roadmap, missions, interview, adaptation, psychometric_test, psychometric

from prometheus_fastapi_instrumentator import Instrumentator

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="GUIDIFY — AI-powered personalized learning and career navigation API",
    version=settings.APP_VERSION,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    openapi_url="/api/openapi.json" if settings.DEBUG else None
)

logger.info(
    "Starting GUIDIFY API",
    extra={
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }
)

# Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Exception Handlers — per api.md error format: { "error": { "code", "message" } }
app.add_exception_handler(GUIDIFYException, guidify_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests with timing"""
    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000
    log_request(
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms
    )
    return response

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Security-Policy"] = "default-src 'self'"
    return response

# ── Route Registration ─────────────────────────────────────────────────
# All routes under /api/v1 per api.md §8 versioning strategy.
API_V1 = "/api/v1"

# Auth & Profile (api.md §1)
app.include_router(auth.router, prefix=API_V1, tags=["Auth & Profile"])

# Resume (api.md §2)
app.include_router(resume.router, prefix=API_V1, tags=["Resume"])

# Roadmap (api.md §3)
app.include_router(roadmap.router, prefix=API_V1, tags=["Roadmap"])

# Missions (api.md §4)
app.include_router(missions.router, prefix=API_V1, tags=["Missions"])

# Interview (api.md §5)
app.include_router(interview.router, prefix=API_V1, tags=["Interview"])

# Adaptation Engine (rules.md §1-4)
app.include_router(adaptation.router, prefix=API_V1, tags=["Adaptation"])

# Dashboard (api.md §6)
app.include_router(dashboard.router, prefix=API_V1, tags=["Dashboard"])

# Psychometric Test (yes/maybe/no assessment)
app.include_router(psychometric_test.router, prefix=API_V1, tags=["Psychometric Test"])

# Psychometric (onboarding personality assessment — frontend AdaptivePersonalityTest)
app.include_router(psychometric.router, prefix=API_V1, tags=["Psychometric"])

# Prometheus metrics — secured endpoint for internal scraping
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# ── Health Endpoints (no auth required) ────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": f"GUIDIFY API {settings.APP_VERSION}"}

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}

@app.get("/api/v1/health", tags=["Health"])
async def health_check_v1():
    """Versioned health endpoint"""
    return {"status": "ok", "version": settings.APP_VERSION}

# ── AI Gateway Test Endpoint (Phase 0 verification) ───────────────────

@app.get("/api/v1/ai-gateway/test", tags=["Internal"])
async def test_ai_gateway():
    """
    Phase 0 exit criteria: AI Gateway hello world round-trip.
    One Gemini call working end-to-end: prompt → JSON response.
    """
    from app.ai_gateway import AIGateway
    gateway = AIGateway()
    try:
        result = await gateway.generate("test.hello", context={})
        return {"status": "ok", "ai_response": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Run with Uvicorn
if __name__ == "__main__":
    import uvicorn
    reload_enabled = settings.ENVIRONMENT == "development"
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=reload_enabled)
