from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.routes import college_routes, aptitude_routes, employee_routes
from app.routes import fresher_routes, career_routes, scholarship_routes, psychometric_routes, ml_routes, dashboard_routes, lmi_routes, privacy_routes
from prometheus_fastapi_instrumentator import Instrumentator

# Create FastAPI app
app = FastAPI(
    title="GUIDIFY API",
    description="Career guidance and educational recommendation API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

# Include routers with prefixes
app.include_router(college_routes.router, prefix="/api/colleges", tags=["Colleges"])
app.include_router(aptitude_routes.router, prefix="/api/aptitude", tags=["Aptitude"])
app.include_router(employee_routes.router, prefix="/api/employee", tags=["Experienced Employees"])
app.include_router(fresher_routes.router, prefix="/api/freshers", tags=["Freshers"])
app.include_router(career_routes.router, prefix="/api", tags=["Career Tools"])
app.include_router(scholarship_routes.router, prefix="/api/scholarships", tags=["Scholarships"])
app.include_router(psychometric_routes.router, prefix="/api/psychometric", tags=["Psychometric Test"])
from app.routes import gamification_routes
app.include_router(gamification_routes.router, prefix="/api", tags=["Gamification"])
from app.routes import courses
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(ml_routes.router, prefix="/api/ml", tags=["ML Profiling"])
app.include_router(dashboard_routes.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(lmi_routes.router, prefix="/api/lmi", tags=["LMI"])
app.include_router(privacy_routes.router, prefix="/api/user", tags=["Privacy"])

# Prometheus Instrumentation
Instrumentator().instrument(app).expose(app)

# Root endpoint
@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "GUIDIFY API is running"}

@app.get("/health", tags=["Health"])
async def health_check():
    """Explicit health check endpoint"""
    return {"status": "ok", "timestamp": "2025-11-30T21:46:23+05:30"}

# Run the application with Uvicorn when executed directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
