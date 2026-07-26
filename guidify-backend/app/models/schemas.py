"""
Pydantic Schemas — Learner & Profile

Data models matching schema.md §1-2. Used for API request/response validation
and AI Gateway output validation.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum

from pydantic import BaseModel, Field


# --- Enums per schema.md ---

class LearnerSegment(str, Enum):
    school = "school"
    college = "college"
    graduate = "graduate"
    professional = "professional"


# --- Request Models ---

class OnboardingRequest(BaseModel):
    """POST /auth/onboarding request body — api.md §1"""
    segment: LearnerSegment
    questionnaire_data: Dict[str, Any]


class TargetRoleUpdate(BaseModel):
    """PATCH /profile/target-role request body — api.md §1"""
    target_role: str = Field(..., min_length=1, max_length=200)


# --- Response Models ---

class LearnerResponse(BaseModel):
    """Learner data for API responses"""
    id: str
    email: str
    full_name: str
    segment: Optional[LearnerSegment] = None
    target_role: Optional[str] = None
    onboarding_completed: bool = False
    created_at: Optional[datetime] = None


class ProfileResponse(BaseModel):
    """Learner profile data for API responses"""
    skills: List[str] = []
    interests: List[str] = []
    strengths: List[str] = []
    weaknesses: List[str] = []


class ProfileMeResponse(BaseModel):
    """GET /profile/me response — api.md §1"""
    learner: LearnerResponse
    profile: ProfileResponse


class OnboardingResponse(BaseModel):
    """POST /auth/onboarding response — api.md §1"""
    profile_id: str
    onboarding_completed: bool = True


class TargetRoleResponse(BaseModel):
    """PATCH /profile/target-role response — api.md §1"""
    roadmap_regeneration_queued: bool = True


# --- Dashboard Models ---

class SkillGraphEntry(BaseModel):
    """Individual skill entry for the dashboard skill graph"""
    skill: str
    level: int = Field(..., ge=0, le=4)
    target_level: int = Field(..., ge=0, le=4)


class DashboardResponse(BaseModel):
    """GET /dashboard response — api.md §6"""
    streak_days: int = 0
    current_phase: Optional[str] = None
    roadmap_progress_pct: int = 0
    interview_readiness: int = 0
    placement_readiness: int = 0
    skill_graph: List[SkillGraphEntry] = []
