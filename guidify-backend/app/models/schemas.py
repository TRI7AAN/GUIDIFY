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


# --- Roadmap Models (schema.md §3, api.md §3) ---

class RoadmapPhase(BaseModel):
    """A single phase in the career roadmap"""
    phase_number: int
    title: str
    description: str
    skills: List[str] = []
    estimated_weeks: int = 4
    difficulty: str = "beginner"
    milestones: List[str] = []


class RoadmapGenerateResponse(BaseModel):
    """AI Gateway output schema for roadmap.generate — validates AI response"""
    title: str
    total_phases: int
    estimated_weeks: int
    phases: List[RoadmapPhase]


class RoadmapCurrentResponse(BaseModel):
    """GET /roadmap/current response — api.md §3"""
    id: str
    title: str
    version: int = 1
    status: str = "active"
    total_phases: int
    estimated_weeks: int
    current_phase_number: int = 1
    progress_pct: int = 0
    phases: List[RoadmapPhase] = []
    created_at: Optional[datetime] = None


# --- Mission Models (schema.md §4, api.md §4) ---

class MissionStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    skipped = "skipped"
    failed = "failed"


class MissionResource(BaseModel):
    """A learning resource attached to a mission"""
    title: str
    url: str
    type: str = "documentation"  # documentation, tutorial, exercise, video


class MissionGenerateResponse(BaseModel):
    """AI Gateway output schema for mission.generate — validates AI response"""
    title: str
    objective: str
    description: str = ""
    target_skill: str = ""
    difficulty: str = "beginner"
    estimated_minutes: int = 30
    steps: List[str] = []
    resources: List[MissionResource] = []


class MissionResponse(BaseModel):
    """GET /missions/today response — api.md §4"""
    id: str
    title: str
    objective: str
    description: str = ""
    target_skill: str = ""
    difficulty: str = "beginner"
    estimated_minutes: int = 30
    steps: List[str] = []
    resources: List[MissionResource] = []
    status: MissionStatus = MissionStatus.pending
    roadmap_phase_number: Optional[int] = None
    assigned_date: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class MissionStatusUpdate(BaseModel):
    """POST /missions/{id}/status request body — api.md §4"""
    status: MissionStatus
    notes: Optional[str] = None
    time_spent_minutes: Optional[int] = None


class MissionCompleteRequest(BaseModel):
    """POST /missions/{id}/complete request body — api.md §4"""
    notes: Optional[str] = None
    time_spent_minutes: Optional[int] = None


# --- Dashboard Models ---

class DashboardResponse(BaseModel):
    """GET /dashboard response — api.md §6"""
    streak_days: int = 0
    current_phase: Optional[str] = None
    roadmap_progress_pct: int = 0
    interview_readiness: int = 0
    placement_readiness: int = 0
    skill_graph: List[SkillGraphEntry] = []


# --- Resume Models (schema.md §3, api.md §2) ---

class ResumeContact(BaseModel):
    """Extracted contact information from resume"""
    name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None


class ResumeExperience(BaseModel):
    """Work experience entry from resume"""
    company: str
    title: str
    start_date: str = ""
    end_date: str = ""
    location: Optional[str] = None
    description: str = ""
    responsibilities: List[str] = []


class ResumeEducation(BaseModel):
    """Education entry from resume"""
    institution: str
    degree: str = ""
    field_of_study: str = ""
    start_date: str = ""
    end_date: str = ""
    gpa: Optional[str] = None
    percentage: Optional[float] = None
    honors: Optional[str] = None


class ResumeProject(BaseModel):
    """Project entry from resume"""
    name: str
    description: str = ""
    technologies: List[str] = []
    url: Optional[str] = None


class ResumeCertification(BaseModel):
    """Certification entry from resume"""
    name: str
    issuer: str = ""
    date: str = ""
    url: Optional[str] = None


class ResumeParseResponse(BaseModel):
    """AI Gateway output schema for resume.parse — validates AI response"""
    contact: ResumeContact = ResumeContact()
    summary: str = ""
    experience: List[ResumeExperience] = []
    education: List[ResumeEducation] = []
    technical_skills: List[str] = []
    soft_skills: List[str] = []
    projects: List[ResumeProject] = []
    certifications: List[ResumeCertification] = []
    languages: List[str] = []
    total_years_experience: int = 0


class ResumeGapItem(BaseModel):
    """A single gap identified in resume analysis"""
    area: str
    description: str
    impact: str = "medium"  # low, medium, high
    suggestion: str = ""


class ResumeImprovement(BaseModel):
    """A specific actionable improvement suggestion"""
    priority: int
    action: str
    example: str = ""


class ResumeAtsCompatibility(BaseModel):
    """ATS compatibility analysis"""
    score: int = 0
    issues: List[str] = []
    suggestions: List[str] = []


class ResumeScoreResponse(BaseModel):
    """AI Gateway output schema for resume.score — validates AI response"""
    overall_score: int = Field(..., ge=0, le=100)
    section_scores: Dict[str, int] = {}
    strengths: List[str] = []
    gaps: List[ResumeGapItem] = []
    top_improvements: List[ResumeImprovement] = []
    ats_compatibility: ResumeAtsCompatibility = ResumeAtsCompatibility()


class ResumeUploadResponse(BaseModel):
    """POST /resume/upload response — api.md §2"""
    id: str
    file_name: str
    storage_path: str
    status: str = "uploaded"
    parsed_data: Optional[ResumeParseResponse] = None
    score: Optional[int] = None


class ResumeResponse(BaseModel):
    """GET /resume/{id} or /resume/current response — api.md §2"""
    id: str
    file_name: str
    storage_path: str
    parsed_data: Optional[ResumeParseResponse] = None
    score: Optional[int] = None
    gap_analysis: Optional[ResumeScoreResponse] = None
    is_current: bool = True
    created_at: Optional[datetime] = None


# --- Adaptation Engine Models (rules.md, schema.md §7) ---

class EventType(str, Enum):
    """Event types for the event_log table — schema.md §7"""
    mission_completed = "mission_completed"
    mission_failed = "mission_failed"
    mission_skipped = "mission_skipped"
    mission_too_hard = "mission_too_hard"
    roadmap_generated = "roadmap_generated"
    roadmap_regenerated = "roadmap_regenerated"
    target_role_changed = "target_role_changed"
    resume_uploaded = "resume_uploaded"
    certificate_uploaded = "certificate_uploaded"
    profile_updated = "profile_updated"
    interview_completed = "interview_completed"
    skill_gap_analysis_run = "skill_gap_analysis_run"


class EventCreateRequest(BaseModel):
    """POST /adaptation/event request body"""
    event_type: EventType
    payload: Dict[str, Any] = {}
    related_mission_id: Optional[str] = None
    related_roadmap_id: Optional[str] = None


class EventResponse(BaseModel):
    """Event log entry response"""
    id: str
    event_type: str
    payload: Dict[str, Any] = {}
    created_at: Optional[datetime] = None


class AdaptationDecision(BaseModel):
    """Rules Engine adaptation decision"""
    adaptation_needed: bool
    trigger: Optional[str] = None
    regeneration_type: Optional[str] = None
    reason: str = ""
    bypass_debounce: bool = False
    consecutive_failures: Optional[int] = None
    fast_streak: Optional[int] = None


class SkillGapResponse(BaseModel):
    """Skill gap analysis response — rules.md §4"""
    current_skills: List[str] = []
    required_skills: List[str] = []
    matched_skills: List[str] = []
    gaps: List[str] = []
    gap_count: int = 0
    match_count: int = 0
    completion_pct: int = 0
    note: Optional[str] = None


class AdaptationStatusResponse(BaseModel):
    """GET /adaptation/status response"""
    in_debounce_window: bool = False
    last_regeneration: Optional[str] = None
    consecutive_failures: int = 0
    failure_threshold: int = 3
    recent_events: List[EventResponse] = []
    skill_gap: SkillGapResponse = SkillGapResponse()


class AdaptationTriggerRequest(BaseModel):
    """POST /adaptation/trigger request body — manually trigger adaptation check"""
    event_type: EventType
    payload: Dict[str, Any] = {}
