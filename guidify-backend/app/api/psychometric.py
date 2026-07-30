"""
Psychometric Routes — Onboarding personality assessment

Endpoints:
    POST /psychometric/start          — Return 5 static baseline questions
    POST /psychometric/generate-quiz  — Generate AI adaptive questions
    POST /psychometric/analyze        — Final personality analysis
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_learner_id
from app.services.psychometric_service import PsychometricService
from app.db import queries

logger = logging.getLogger("guidify.api.psychometric")

router = APIRouter(tags=["Psychometric"])


# ── Request/Response Schemas ────────────────────────────────────────────────

class PsychometricStartRequest(BaseModel):
    user_id: Optional[str] = None


class PsychometricGenerateRequest(BaseModel):
    user_id: Optional[str] = None


class PsychometricAnalyzeRequest(BaseModel):
    user_id: str
    all_responses: List[Dict[str, Any]]


# ── Routes ──────────────────────────────────────────────────────────────────

@router.post("/psychometric/start")
async def start_test(
    request: PsychometricStartRequest,
):
    """
    Return 5 static baseline questions for instant loading.
    No AI call — hardcoded for speed.
    Auth not required — only returns static data.
    """
    questions = await PsychometricService.generate_baseline_questions()
    return {"questions": questions}


@router.post("/psychometric/generate-quiz")
async def generate_quiz(
    request: PsychometricGenerateRequest,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Generate 10 AI-adaptive questions based on the learner's profile.
    Called in background while user answers static questions.
    """
    try:
        profile = await queries.get_learner_profile(learner_id)
        learner = await queries.get_learner(learner_id)

        user_profile = {}
        if learner:
            user_profile["target_role"] = learner.get("target_role", "Software Developer")
            user_profile["segment"] = learner.get("segment", "college")
        if profile:
            user_profile["skills"] = profile.get("skills", [])
            user_profile["interests"] = profile.get("interests", [])
            user_profile["strengths"] = profile.get("strengths", [])

        result = await PsychometricService.generate_quiz_questions_async(user_profile)
        return result
    except Exception as e:
        logger.error(f"Quiz generation failed: {e}")
        return {"questions": []}


@router.post("/psychometric/analyze")
async def analyze_personality(
    request: PsychometricAnalyzeRequest,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Run deep-dive personality analysis on full Q&A session.
    Saves results to learners table automatically.
    """
    if not request.all_responses:
        raise HTTPException(status_code=400, detail="No responses provided for analysis")

    result = await PsychometricService.analyze_personality(
        user_id=learner_id,
        all_responses=request.all_responses,
    )
    return result
