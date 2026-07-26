from typing import List, Optional, Dict, Any
from pydantic import BaseModel

# College and Course Recommendation Schemas
class CollegeRecommendationRequest(BaseModel):
    board: str
    stream: str
    entrance_marks: Optional[int] = None
    preference: Optional[str] = "General"

class CollegeData(BaseModel):
    college: str
    course: str
    rating: float
    placement_rate: str
    management_rating: float

class CollegeRecommendationResponse(BaseModel):
    success: bool = True
    data: List[CollegeData] = []
    error: Optional[str] = None
    detected_marks: Optional[int] = None

# Fresher Job Recommendation Schemas
class FresherJobRequest(BaseModel):
    stream: str
    institute: str
    location: str

class ProfileData(BaseModel):
    skills: List[str] = []
    cgpa: Optional[float] = None
    education: Optional[str] = None
    projects: List[str] = []

class CompanyData(BaseModel):
    name: str
    role: str
    salary_range: str
    tech_stack: List[str] = []
    interview_process: str
    culture_fit: Optional[float] = None

class FresherJobResponse(BaseModel):
    success: bool = True
    profile: ProfileData
    companies: List[CompanyData] = []
    error: Optional[str] = None

# Experienced Employee Schemas
class ExperiencedEmployeeRequest(BaseModel):
    current_role: str
    desired_path: str

class RoleRecommendation(BaseModel):
    title: str
    company_type: str
    skills_needed: List[str]
    salary_range: str
    growth_potential: str

class ExperiencedEmployeeResponse(BaseModel):
    success: bool = True
    current_skills: List[str] = []
    missing_skills: List[str] = []
    recommended_roles: List[RoleRecommendation] = []
    error: Optional[str] = None

# Roadmap Schemas
class RoadmapRequest(BaseModel):
    subjects: str
    career: str

class RoadmapResponse(BaseModel):
    success: bool = True
    description: str
    error: Optional[str] = None

# Scholarship Schemas
class ScholarshipRequest(BaseModel):
    country: str
    field: str

class ScholarshipData(BaseModel):
    name: str
    provider: str
    amount: str
    eligibility: str
    deadline: Optional[str] = None
    application_link: str

class ScholarshipResponse(BaseModel):
    success: bool = True
    scholarships: List[ScholarshipData] = []
    error: Optional[str] = None

# ML Profiling Schemas
class LearnerProfile(BaseModel):
    user_id: Optional[str] = None
    demographics: Dict[str, Any] = {}
    skills: List[str] = []
    assessments: Dict[str, float] = {}
    learning_styles: Dict[str, float] = {}
    engagement_signals: Dict[str, float] = {}
    career_goal: Optional[str] = None
    current_tier: Optional[str] = "Novice"
    nsqf_levels: List[int] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class MLProfileRequest(BaseModel):
    user_id: str
    update_data: Optional[Dict[str, Any]] = None

class RecommendationItem(BaseModel):
    id: str
    title: str
    type: str  # course, job, micro-credential
    score: float
    reasons: List[str] = []
    metadata: Dict[str, Any] = {}

class RecommendationResponse(BaseModel):
    success: bool = True
    recommendations: List[RecommendationItem] = []
    model_version: str = "v1.0"
    error: Optional[str] = None
