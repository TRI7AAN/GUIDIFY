from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

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

# Aptitude Quiz Schemas
class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: int

class GenerateQuizResponse(BaseModel):
    success: bool = True
    questions: List[QuizQuestion] = []
    error: Optional[str] = None

class GradeQuizRequest(BaseModel):
    user_answers: List[int]
    questions: List[Dict[str, Any]]

class GradeQuizResponse(BaseModel):
    success: bool = True
    score: int
    total: int
    feedback: str
    error: Optional[str] = None

# Generic Response Schema
class GenericResponse(BaseModel):
    success: bool = True
    data: Optional[Any] = None
    error: Optional[str] = None