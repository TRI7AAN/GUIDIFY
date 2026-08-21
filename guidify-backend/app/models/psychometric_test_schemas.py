"""
Psychometric Test Schemas

Pydantic models for the yes/maybe/no psychometric assessment and decision engine.
Categories: Technical Aptitude, Creative Thinking, Leadership, Analytical Reasoning, Interpersonal Skills.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ── Request Schemas ──────────────────────────────────────────────────

class StartTestRequest(BaseModel):
    user_id: Optional[str] = Field(None, description="Optional user ID for authenticated sessions")


class AnswerSubmission(BaseModel):
    question_id: str = Field(..., description="Unique question identifier")
    answer: str = Field(..., description="User response: 'yes', 'maybe', or 'no'")
    response_time_ms: Optional[int] = Field(None, description="Time taken to answer in milliseconds")


class SubmitTestRequest(BaseModel):
    user_id: Optional[str] = Field(None, description="Optional user ID for authenticated sessions")
    session_id: str = Field(..., description="Test session identifier")
    answers: List[AnswerSubmission] = Field(..., min_length=1, description="All question responses")


# ── Response Schemas ─────────────────────────────────────────────────

class QuestionOption(BaseModel):
    value: str = Field(..., description="Option value: yes, maybe, or no")
    label: str = Field(..., description="Display label for the option")
    weight: float = Field(..., description="Scoring weight for this option")


class Question(BaseModel):
    id: str = Field(..., description="Unique question identifier")
    text: str = Field(..., description="Question text displayed to user")
    category: str = Field(..., description="Assessment category this question targets")
    options: List[QuestionOption] = Field(default_factory=lambda: [
        QuestionOption(value="yes", label="Yes", weight=1.0),
        QuestionOption(value="maybe", label="Maybe", weight=0.5),
        QuestionOption(value="no", label="No", weight=0.0),
    ])


class StartTestResponse(BaseModel):
    session_id: str = Field(..., description="Unique session identifier for this test run")
    questions: List[Question] = Field(..., description="Ordered list of assessment questions")
    total_questions: int = Field(..., description="Total number of questions")


class CategoryScore(BaseModel):
    category: str = Field(..., description="Category name")
    score: float = Field(..., ge=0, le=100, description="Score from 0-100")
    confidence: float = Field(..., ge=0, le=1, description="Confidence level 0-1")
    label: str = Field(..., description="Human-readable score label: Strong, Moderate, Developing, Low")


class DecisionResult(BaseModel):
    primary_recommendation: str = Field(..., description="Top career path recommendation")
    secondary_recommendation: str = Field(..., description="Secondary career path suggestion")
    category_scores: List[CategoryScore] = Field(..., description="Scores across all categories")
    overall_score: float = Field(..., ge=0, le=100, description="Weighted overall score")
    confidence: float = Field(..., ge=0, le=1, description="Overall confidence in assessment")
    personality_profile: str = Field(..., description="Brief personality type description")
    strengths: List[str] = Field(default_factory=list, description="Identified strengths")
    growth_areas: List[str] = Field(default_factory=list, description="Areas for development")
    summary: str = Field(..., description="Natural language summary of results")


class SubmitTestResponse(BaseModel):
    success: bool = Field(True)
    session_id: str
    result: DecisionResult
    saved: bool = Field(False, description="Whether results were persisted to database")
