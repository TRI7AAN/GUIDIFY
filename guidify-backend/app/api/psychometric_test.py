"""
Psychometric Test Routes — yes/maybe/no assessment with decision engine

Endpoints:
    GET  /psychometric-test/questions          — Fetch all questions (public)
    POST /psychometric-test/start              — Start a new test session (auth required)
    POST /psychometric-test/submit             — Submit answers, get decision result (auth required)
    GET  /psychometric-test/result/{session_id} — Retrieve saved result (auth required)
"""

import asyncio
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
    CategoryScore,
)
from app.services.psychometric_decision_engine import PsychometricDecisionEngine

logger = logging.getLogger("guidify.api.psychometric_test")

router = APIRouter(tags=["Psychometric Test"])

# Maps psychometric test categories to the radar chart axes on the dashboard.
# The dashboard consumes category_scores from learner_profiles.questionnaire_data
# and renders axes keyed by these short labels (see Dashboard.jsx TRAIT_LABELS).
RADAR_CATEGORY_MAP = {
    "Technical Aptitude": "Technical",
    "Creative Thinking": "Creative",
    "Interpersonal Skills": "Communication",
    "Leadership": "Leadership",
    "Analytical Reasoning": "Analytical",
}


async def _sync_radar_scores(learner_id: str, category_scores: list[CategoryScore]) -> None:
    """
    Persist the latest assessment outcome to the learner profile so the dashboard
    radar chart reflects the result of the most recently completed test.
    """
    from app.services.supabase_client import db as supabase

    radar_scores = {
        RADAR_CATEGORY_MAP[cs.category]: round(cs.score)
        for cs in category_scores
        if cs.category in RADAR_CATEGORY_MAP
    }

    profile_resp = await asyncio.to_thread(
        supabase.table("learner_profiles")
        .select("id, questionnaire_data")
        .eq("learner_id", learner_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute
    )

    if profile_resp.data:
        row = profile_resp.data[0]
        questionnaire_data = row.get("questionnaire_data") or {}
        if not isinstance(questionnaire_data, dict):
            questionnaire_data = {}
        questionnaire_data["category_scores"] = radar_scores
        await asyncio.to_thread(
            supabase.table("learner_profiles").update({
                "questionnaire_data": questionnaire_data,
            }).eq("id", row["id"]).execute
        )
    else:
        await asyncio.to_thread(
            supabase.table("learner_profiles").insert({
                "learner_id": learner_id,
                "questionnaire_data": {"category_scores": radar_scores},
            }).execute
        )


@router.get("/psychometric-test/questions", response_model=StartTestResponse)
async def get_questions():
    """
    Fetch all assessment questions and create a session.
    Returns questions with yes/maybe/no options and a session_id.
    Public endpoint — no auth required for previewing questions.
    """
    questions = PsychometricDecisionEngine.get_questions()
    session_id = PsychometricDecisionEngine.generate_session_id()

    # Persist anonymous session so a submit against this session_id can claim it.
    # Fail loudly: a returned session_id that was never persisted would 404 on submit.
    from app.services.supabase_client import db as supabase
    try:
        await asyncio.to_thread(
            supabase.table("psychometric_sessions").insert({
                "session_id": session_id,
                "status": "in_progress",
            }).execute
        )
    except Exception as e:
        logger.error(f"Failed to persist session to DB: {e}")
        raise HTTPException(status_code=503, detail="Could not start a test session. Please try again.")

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

    # Persist session to DB with user association. Fail loudly: a returned
    # session_id that was never persisted would 404 on submit.
    from app.services.supabase_client import db as supabase
    try:
        await asyncio.to_thread(
            supabase.table("psychometric_sessions").insert({
                "session_id": session_id,
                "user_id": learner_id,
                "status": "in_progress",
            }).execute
        )
    except Exception as e:
        logger.error(f"Failed to persist session to DB: {e}")
        raise HTTPException(status_code=503, detail="Could not start a test session. Please try again.")

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
    1. Validates every question ID is answered exactly once
    2. Computes per-category scores (0-100)
    3. Derives overall weighted score and confidence
    4. Maps top-2 categories to career recommendations
    5. Generates personality profile, strengths, and growth areas
    """
    from app.services.supabase_client import db as supabase
    from app.services.psychometric_decision_engine import QUESTION_BANK

    # Validate session exists in DB
    try:
        session_resp = await asyncio.to_thread(
            supabase.table("psychometric_sessions")
            .select("*")
            .eq("session_id", request.session_id)
            .single()
            .execute
        )
        session = session_resp.data
    except Exception:
        session = None

    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    if session.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Session already completed")

    # Ownership: reject other users' sessions, claim anonymous (preview) ones
    session_user_id = session.get("user_id")
    if session_user_id and session_user_id != learner_id:
        raise HTTPException(status_code=403, detail="Session does not belong to this user")

    # Validate answers: every question answered exactly once with a valid value
    expected_ids = [q["id"] for q in QUESTION_BANK]
    submitted_ids = [a.question_id for a in request.answers]
    unknown = sorted({qid for qid in submitted_ids if qid not in expected_ids})
    missing = sorted(qid for qid in expected_ids if qid not in submitted_ids)
    duplicates = sorted({qid for qid in submitted_ids if submitted_ids.count(qid) > 1})
    if unknown or missing or duplicates:
        problems = []
        if unknown:
            problems.append(f"unknown question_ids: {unknown}")
        if missing:
            problems.append(f"missing question_ids: {missing}")
        if duplicates:
            problems.append(f"duplicate question_ids: {duplicates}")
        raise HTTPException(status_code=400, detail="Answer validation failed; " + "; ".join(problems))
    if any(a.answer not in ("yes", "maybe", "no") for a in request.answers):
        raise HTTPException(status_code=400, detail="Answers must be 'yes', 'maybe', or 'no'")
    if any(a.response_time_ms is not None and a.response_time_ms < 0 for a in request.answers):
        raise HTTPException(status_code=400, detail="response_time_ms must be a non-negative integer")

    # Run decision engine
    result = PsychometricDecisionEngine.evaluate(request.answers)

    # Save result BEFORE marking the session complete so a failed save stays retryable
    saved = False
    try:
        await asyncio.to_thread(
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
            }, on_conflict="session_id").execute
        )
        saved = True
    except Exception as e:
        logger.warning(f"Failed to save psychometric result to DB: {e}")

    # Mark session complete only when the result was persisted
    if saved:
        try:
            await asyncio.to_thread(
                supabase.table("psychometric_sessions").update({
                    "status": "completed",
                    "user_id": learner_id,
                }).eq("session_id", request.session_id).execute
            )
        except Exception as e:
            logger.warning(f"Failed to update session status: {e}")

        # Sync the outcome to the learner profile so the dashboard radar chart
        # reflects the result of this assessment.
        try:
            await _sync_radar_scores(learner_id, result.category_scores)
        except Exception as e:
            logger.warning(f"Failed to sync radar scores to learner profile: {e}")

    logger.info(
        f"Psychometric test completed: session={request.session_id} "
        f"overall={result.overall_score} recommendation={result.primary_recommendation}"
    )

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
        from app.services.supabase_client import db as supabase
        response = await asyncio.to_thread(
            supabase.table("psychometric_results")
            .select("*")
            .eq("session_id", session_id)
            .eq("user_id", learner_id)
            .single()
            .execute
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
        from app.services.supabase_client import db as supabase
        response = await asyncio.to_thread(
            supabase.table("psychometric_results")
            .select("*")
            .eq("user_id", learner_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute
        )
        if response.data and len(response.data) > 0:
            row = response.data[0]
            return {"session_id": row.get("session_id"), "result": row}
    except Exception as e:
        logger.warning(f"DB lookup failed for latest result: {e}")

    raise ResourceNotFoundError("Psychometric test result")
