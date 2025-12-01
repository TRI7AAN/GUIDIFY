from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from app.routes import college_routes, aptitude_routes, employee_routes
from app.routes import fresher_routes, career_routes, scholarship_routes, psychometric_routes

# Create FastAPI app
app = FastAPI(
    title="GUIDIFY API",
    description="Career guidance and educational recommendation API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
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
