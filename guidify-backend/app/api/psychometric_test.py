"""
Psychometric Test Routes — yes/maybe/no assessment with decision engine

Endpoints:
    GET  /psychometric-test/questions          — Fetch all questions
    POST /psychometric-test/start              — Start a new test session
    POST /psychometric-test/submit             — Submit answers, get decision result
    GET  /psychometric-test/result/{session_id} — Retrieve saved result
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import get_current_learner_id
from app.core.exceptions import ResourceNotFoundError
from app.models.psychometric_test_schemas import (
    StartTestRequest,
    StartTestResponse,
    SubmitTestRequest,
    SubmitTestResponse,
)
from app.services.psychometric_decision_engine import PsychometricDecisionEngine

logger = logging.getLogger("guidify.api.psychometric_test")

router = APIRouter(tags=["Psychometric Test"])

# In-memory session store (production: use Redis or DB)
_session_store: dict = {}


@router.get("/psychometric-test/questions", response_model=StartTestResponse)
async def get_questions():
    """
    Fetch all assessment questions and create a session.
    Returns questions with yes/maybe/no options and a session_id.
    """
    questions = PsychometricDecisionEngine.get_questions()
    session_id = PsychometricDecisionEngine.generate_session_id()

    _session_store[session_id] = {
        "status": "in_progress",
        "questions": [q.model_dump() for q in questions],
        "answers": [],
    }

    return StartTestResponse(
        session_id=session_id,
        questions=questions,
        total_questions=len(questions),
    )


@router.post("/psychometric-test/start", response_model=StartTestResponse)
async def start_test(request: StartTestRequest):
    """
    Explicitly start a new test session (alternative to GET /questions).
    """
    questions = PsychometricDecisionEngine.get_questions()
    session_id = PsychometricDecisionEngine.generate_session_id()

    _session_store[session_id] = {
        "user_id": request.user_id,
        "status": "in_progress",
        "questions": [q.model_dump() for q in questions],
        "answers": [],
    }

    return StartTestResponse(
        session_id=session_id,
        questions=questions,
        total_questions=len(questions),
    )


@router.post("/psychometric-test/submit", response_model=SubmitTestResponse)
async def submit_test(request: SubmitTestRequest):
    """
    Submit all answers and receive the decision engine result.

    The engine:
    1. Validates all question IDs exist
    2. Computes per-category scores (0-100) with response-time adjustments
    3. Derives overall weighted score and confidence
    4. Maps top-2 categories to career recommendations
    5. Generates personality profile, strengths, and growth areas
    """
    # Validate session
    session = _session_store.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    if session.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Session already completed")

    # Validate answer count matches question count
    from app.services.psychometric_decision_engine import QUESTION_BANK
    expected = len(QUESTION_BANK)
    if len(request.answers) != expected:
        raise HTTPException(
            status_code=400,
            detail=f"Expected {expected} answers, got {len(request.answers)}",
        )

    # Run decision engine
    result = PsychometricDecisionEngine.evaluate(request.answers)

    # Mark session complete
    session["status"] = "completed"
    session["result"] = result.model_dump()
    session["user_id"] = request.user_id

    logger.info(
        f"Psychometric test completed: session={request.session_id} "
        f"overall={result.overall_score} recommendation={result.primary_recommendation}"
    )

    # Attempt to save to DB if user is authenticated
    saved = False
    if request.user_id:
        try:
            from app.services.supabase_client import supabase
            supabase.table("psychometric_results").upsert({
                "user_id": request.user_id,
                "session_id": request.session_id,
                "overall_score": result.overall_score,
                "confidence": result.confidence,
                "primary_recommendation": result.primary_recommendation,
                "secondary_recommendation": result.secondary_recommendation,
                "category_scores": {cs.category: cs.score for cs in result.category_scores},
                "personality_profile": result.personality_profile,
                "strengths": result.strengths,
                "growth_areas": result.growth_areas,
                "summary": result.summary,
            }, on_conflict="session_id").execute()
            saved = True
        except Exception as e:
            logger.warning(f"Failed to save psychometric result to DB: {e}")

    return SubmitTestResponse(
        success=True,
        session_id=request.session_id,
        result=result,
        saved=saved,
    )


@router.get("/psychometric-test/result/{session_id}")
async def get_result(
    session_id: str,
    learner_id: str = Depends(get_current_learner_id),
):
    """Retrieve a previously completed psychometric test result."""
    # Check in-memory store first
    session = _session_store.get(session_id)
    if session and session.get("status") == "completed":
        return {"session_id": session_id, "result": session["result"]}

    # Fall back to database
    try:
        from app.services.supabase_client import supabase
        response = (
            supabase.table("psychometric_results")
            .select("*")
            .eq("session_id", session_id)
            .eq("user_id", learner_id)
            .single()
            .execute()
        )
        if response.data:
            return {"session_id": session_id, "result": response.data}
    except Exception as e:
        logger.warning(f"DB lookup failed for session {session_id}: {e}")

    raise ResourceNotFoundError("Psychometric test result")
