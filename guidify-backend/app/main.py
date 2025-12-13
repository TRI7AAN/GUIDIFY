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
from app.core.exceptions import GuidifyException
from app.core.logger import logger, log_request
from app.middleware.error_handler import (
    guidify_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    global_exception_handler
)

# Import routers
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.routes import (
    college_routes, aptitude_routes, employee_routes,
    fresher_routes, career_routes, scholarship_routes, 
    psychometric_routes, ml_routes, dashboard_routes, 
    lmi_routes, privacy_routes, gamification_routes, courses,
    interview_routes, roadmap_routes, exam_routes
)

from prometheus_fastapi_instrumentator import Instrumentator

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Career guidance and educational recommendation API (Production Grade)",
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Log startup
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

# Exception Handlers
app.add_exception_handler(GuidifyException, guidify_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests with timing"""
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration_ms = (time.time() - start_time) * 1000
    
    # Log request
    log_request(
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms
    )
    
    return response

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Include routers
api_prefix = "/api"
app.include_router(college_routes.router, prefix=f"{api_prefix}/colleges", tags=["Colleges"])
app.include_router(aptitude_routes.router, prefix=f"{api_prefix}/aptitude", tags=["Aptitude"])
app.include_router(employee_routes.router, prefix=f"{api_prefix}/employee", tags=["Experienced Employees"])
app.include_router(fresher_routes.router, prefix=f"{api_prefix}/freshers", tags=["Freshers"])
app.include_router(career_routes.router, prefix=f"{api_prefix}", tags=["Career Tools"])
app.include_router(scholarship_routes.router, prefix=f"{api_prefix}/scholarships", tags=["Scholarships"])
app.include_router(psychometric_routes.router, prefix=f"{api_prefix}/psychometric", tags=["Psychometric Test"])
app.include_router(gamification_routes.router, prefix=f"{api_prefix}", tags=["Gamification"])
app.include_router(courses.router, prefix=f"{api_prefix}/courses", tags=["Courses"])
app.include_router(ml_routes.router, prefix=f"{api_prefix}/ml", tags=["ML Profiling"])
app.include_router(dashboard_routes.router, prefix=f"{api_prefix}/dashboard", tags=["Dashboard"])
app.include_router(lmi_routes.router, prefix=f"{api_prefix}/lmi", tags=["LMI"])
app.include_router(privacy_routes.router, prefix=f"{api_prefix}/user", tags=["Privacy"])

# Prometheus Instrumentation
Instrumentator().instrument(app).expose(app)

# Root endpoint
@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "GUIDIFY API is running (v2.0)"}

@app.get("/health", tags=["Health"])
async def health_check():
    """Explicit health check endpoint"""
    return {"status": "ok"}

# Run with Uvicorn
if __name__ == "__main__":
    import uvicorn
    # Use environment variables for host/port in real production, simple default here
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
