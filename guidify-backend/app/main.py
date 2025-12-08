from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.routes import (
    college_routes, aptitude_routes, employee_routes,
    fresher_routes, career_routes, scholarship_routes, 
    psychometric_routes, ml_routes, dashboard_routes, 
    lmi_routes, privacy_routes, gamification_routes, courses
)

from prometheus_fastapi_instrumentator import Instrumentator

# Environment Configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
SECRET_KEY = os.getenv("SUPABASE_KEY")

if not SECRET_KEY:
    print("WARNING: SUPABASE_KEY not found in environment variables.")

# Create FastAPI app
app = FastAPI(
    title="GUIDIFY API",
    description="Career guidance and educational recommendation API (Production Grade)",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global Exception: {exc}") # Replace with proper logging in production
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": str(exc)},
    )

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
