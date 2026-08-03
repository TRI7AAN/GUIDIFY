"""
Psychometric Test Routes — yes/maybe/no assessment with decision engine

Endpoints:
    GET  /psychometric-test/questions          — Fetch all questions (public)
    POST /psychometric-test/start              — Start a new test session (auth required)
    POST /psychometric-test/submit             — Submit answers, get decision result (auth required)
    GET  /psychometric-test/result/{session_id} — Retrieve saved result (auth required)
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


@router.get("/psychometric-test/questions", response_model=StartTestResponse)
async def get_questions():
    """
    Fetch all assessment questions and create a session.
    Returns questions with yes/maybe/no options and a session_id.
    Public endpoint — no auth required for previewing questions.
    """
    questions = PsychometricDecisionEngine.get_questions()
    session_id = PsychometricDecisionEngine.generate_session_id()

    # Persist session to DB
    try:
        from app.services.supabase_client import supabase_admin as supabase
        supabase.table("psychometric_sessions").insert({
            "session_id": session_id,
            "status": "in_progress",
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to persist session to DB: {e}")

    return StartTestResponse(
        session_id=session_id,
        questions=questions,
        total_questions=len(questions),
    )


@router.post("/psychometric-test/start", response_model=StartTestResponse)
async def start_test(
    request: StartTestRequest,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Start a new test session for an authenticated user.
    """
    questions = PsychometricDecisionEngine.get_questions()
    session_id = PsychometricDecisionEngine.generate_session_id()

    # Persist session to DB with user association
    try:
        from app.services.supabase_client import supabase_admin as supabase
        supabase.table("psychometric_sessions").insert({
            "session_id": session_id,
            "user_id": learner_id,
            "status": "in_progress",
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to persist session to DB: {e}")

    return StartTestResponse(
        session_id=session_id,
        questions=questions,
        total_questions=len(questions),
    )


@router.post("/psychometric-test/submit", response_model=SubmitTestResponse)
async def submit_test(
    request: SubmitTestRequest,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Submit all answers and receive the decision engine result.

    The engine:
    1. Validates all question IDs exist
    2. Computes per-category scores (0-100) with response-time adjustments
    3. Derives overall weighted score and confidence
    4. Maps top-2 categories to career recommendations
    5. Generates personality profile, strengths, and growth areas
    """
    from app.services.supabase_client import supabase_admin as supabase

    # Validate session exists in DB
    try:
        session_resp = (
            supabase.table("psychometric_sessions")
            .select("*")
            .eq("session_id", request.session_id)
            .single()
            .execute()
        )
        session = session_resp.data
    except Exception:
        session = None

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

    # Mark session complete in DB
    try:
        supabase.table("psychometric_sessions").update({
            "status": "completed",
            "user_id": learner_id,
        }).eq("session_id", request.session_id).execute()
    except Exception as e:
        logger.warning(f"Failed to update session status: {e}")

    logger.info(
        f"Psychometric test completed: session={request.session_id} "
        f"overall={result.overall_score} recommendation={result.primary_recommendation}"
    )

    # Save result to psychometric_results table
    saved = False
    try:
        supabase.table("psychometric_results").upsert({
            "user_id": learner_id,
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
    try:
        from app.services.supabase_client import supabase_admin as supabase
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


@router.get("/psychometric-test/latest")
async def get_latest_result(
    learner_id: str = Depends(get_current_learner_id),
):
    """Retrieve the most recent psychometric test result for the authenticated user."""
    try:
        from app.services.supabase_client import supabase_admin as supabase
        response = (
            supabase.table("psychometric_results")
            .select("*")
            .eq("user_id", learner_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if response.data and len(response.data) > 0:
            row = response.data[0]
            return {"session_id": row.get("session_id"), "result": row}
    except Exception as e:
        logger.warning(f"DB lookup failed for latest result: {e}")

    raise ResourceNotFoundError("Psychometric test result")
