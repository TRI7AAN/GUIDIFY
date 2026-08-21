"""
Interview Routes — api.md §5

Full implementation: Start session, submit answers with AI feedback,
retrieve transcript and feedback report.

Endpoints:
    POST /interview/session                        — Start a new session
    POST /interview/session/{session_id}/answer     — Submit an answer, get next question or feedback
    GET  /interview/session/{session_id}            — Get transcript + feedback
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_learner_id
from app.core.exceptions import ResourceNotFoundError, AIServiceError
from app.db import queries
from app.ai_gateway.gateway import gateway
from app.models.schemas import (
    InterviewSessionRequest,
    InterviewAnswerRequest,
    InterviewStartResponse,
    InterviewAnswerResponse,
    InterviewSessionResponse,
    InterviewTranscriptEntry,
    InterviewFeedbackResponse,
    DeliveryMetricsRequest,
    DeliveryMetricsResponse,
)

logger = logging.getLogger("guidify.api.interview")

router = APIRouter(tags=["Interview"])

MAX_QUESTIONS_PER_SESSION = 10


@router.post("/interview/session", response_model=InterviewStartResponse)
async def start_interview_session(
    request: InterviewSessionRequest,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Start a new interview session.

    1. Create DB record
    2. Generate first question via AI Gateway (interview.question)
    3. Return session_id + first question
    """
    # Create session in DB
    session = await queries.create_interview_session(learner_id, request.track)
    if not session:
        raise HTTPException(status_code=500, detail="Failed to create interview session")

    # Record delivery consent only when the learner explicitly opted in.
    # The text-only interview must not create a granted consent record.
    delivery_enabled = False
    if request.camera_enabled:
        consent = await queries.create_consent(
            learner_id,
            consent_type="delivery_analytics",
            granted=True,
            source="interview_camera_opt_in",
        )
        if consent:
            await queries.update_interview_session(session["id"], {
                "delivery_consent_id": consent["id"],
                "camera_enabled": True,
            })
            delivery_enabled = True

    # Get learner profile for context
    profile = await queries.get_learner_profile(learner_id)
    learner = await queries.get_learner(learner_id)
    profile_summary = _build_profile_summary(profile, learner)
    target_role = learner.get("target_role", "Software Developer") if learner else "Software Developer"

    # Generate first question via AI Gateway
    try:
        result = await gateway.generate(
            task_type="interview.question",
            context={
                "track": request.track,
                "profile_summary": profile_summary,
                "target_role": target_role,
                "transcript": [],
            },
        )
        first_question = result.get("question", "Tell me about yourself and your background.")
    except AIServiceError as e:
        logger.warning(f"AI question generation failed, using fallback: {e}")
        first_question = "Tell me about yourself and your background."

    # Store first question in transcript
    transcript = [{"role": "interviewer", "content": first_question, "question_type": "opening"}]
    await queries.update_interview_session(session["id"], {
        "transcript": transcript,
        "question_count": 1,
    })

    return InterviewStartResponse(
        session_id=session["id"],
        first_question=first_question,
        track=request.track,
        camera_enabled=delivery_enabled,
    )


@router.post("/interview/session/{session_id}/answer", response_model=InterviewAnswerResponse)
async def submit_answer(
    session_id: str,
    request: InterviewAnswerRequest,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Submit an answer and get the next question or session feedback.

    Flow:
    1. Load session, validate ownership and status
    2. Append candidate answer to transcript
    3. If under max questions: generate next question via AI Gateway
    4. If at max questions: generate feedback report, mark complete
    """
    session = await queries.get_interview_session(session_id, learner_id)
    if not session:
        raise ResourceNotFoundError("Interview session")
    if session.get("status") != "in_progress":
        raise HTTPException(status_code=400, detail="Session is not in progress")

    transcript = session.get("transcript", [])
    question_count = session.get("question_count", 0)

    # Append candidate answer
    transcript.append({"role": "candidate", "content": request.answer})

    # Check if we should end the session
    if question_count >= MAX_QUESTIONS_PER_SESSION:
        delivery_metrics = None
        if request.delivery_metrics:
            if not session.get("delivery_consent_id"):
                raise HTTPException(status_code=403, detail="Delivery consent not given")
            delivery_metrics = _delivery_metrics_dict(request.delivery_metrics)
        return await _end_session(
            session, transcript, learner_id, delivery_metrics=delivery_metrics
        )

    # Generate next question - use cached profile context from session
    session_data = session.get("context_data") or {}
    profile_summary = session_data.get("profile_summary")
    target_role = session_data.get("target_role")
    track = session.get("track", "technical")
    
    if not profile_summary or not target_role:
        # Fallback: fetch fresh (first request or session missing context)
        learner = await queries.get_learner(learner_id)
        profile = await queries.get_learner_profile(learner_id)
        profile_summary = _build_profile_summary(profile, learner)
        target_role = learner.get("target_role", "Software Developer") if learner else "Software Developer"
        track = session.get("track", "technical")
        
        # Cache for subsequent requests
        await queries.update_interview_session(session_id, {
            "context_data": {
                "profile_summary": profile_summary,
                "target_role": target_role,
                "track": track,
            }
        })

    try:
        result = await gateway.generate(
            task_type="interview.question",
            context={
                "track": session.get("track", "technical"),
                "profile_summary": profile_summary,
                "target_role": target_role,
                "transcript": transcript,
            },
        )
        next_question = result.get("question", "")
    except AIServiceError as e:
        logger.warning(f"AI question generation failed: {e}")
        next_question = ""

    # If no next question or at natural end, finish the session
    if not next_question:
        return await _end_session(session, transcript, learner_id)

    # Append next question and update
    transcript.append({"role": "interviewer", "content": next_question})
    question_count += 1

    await queries.update_interview_session(session_id, {
        "transcript": transcript,
        "question_count": question_count,
    })

    return InterviewAnswerResponse(
        next_question=next_question,
        status="in_progress",
    )


@router.get("/interview/session/{session_id}", response_model=InterviewSessionResponse)
async def get_interview_session(
    session_id: str,
    learner_id: str = Depends(get_current_learner_id),
):
    """Get full interview transcript and feedback report."""
    session = await queries.get_interview_session(session_id, learner_id)
    if not session:
        raise ResourceNotFoundError("Interview session")

    transcript_raw = session.get("transcript", [])
    transcript = [InterviewTranscriptEntry(**entry) for entry in transcript_raw]

    feedback = None
    if session.get("feedback_report"):
        try:
            feedback = InterviewFeedbackResponse(**session["feedback_report"])
        except Exception:
            pass

    return InterviewSessionResponse(
        id=session["id"],
        track=session.get("track", "technical"),
        status=session.get("status", "in_progress"),
        transcript=transcript,
        feedback_report=feedback,
        readiness_subscore=session.get("readiness_subscore"),
        question_count=session.get("question_count", 0),
        created_at=session.get("created_at"),
    )


@router.post("/interview/session/{session_id}/delivery-metrics", response_model=DeliveryMetricsResponse)
async def submit_delivery_metrics(
    session_id: str,
    request: DeliveryMetricsRequest,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Submit client-side delivery analytics metrics for a completed session.
    Called once by the client after session ends - no media, only derived numbers.
    """
    session = await queries.get_interview_session(session_id, learner_id)
    if not session:
        raise ResourceNotFoundError("Interview session")
    # Check delivery consent
    if not session.get("delivery_consent_id"):
        raise HTTPException(status_code=403, detail="Delivery consent not given")

    # Store delivery metrics
    delivery_data = {
        "camera_enabled": request.camera_enabled,
        "delivery_metrics": {
            "eye_contact_pct": request.eye_contact_pct,
            "posture_score": request.posture_score,
            "expression_stability_score": request.expression_stability_score,
            "fidget_frequency": request.fidget_frequency,
            "words_per_minute": request.words_per_minute,
            "filler_word_rate": request.filler_word_rate,
            "pause_frequency": request.pause_frequency,
        },
    }

    await queries.update_interview_session(session_id, delivery_data)
    logger.info(f"Delivery metrics recorded for session {session_id}")

    return DeliveryMetricsResponse()


async def _end_session(
    session: dict,
    transcript: list,
    learner_id: str,
    delivery_metrics: Optional[dict] = None,
) -> InterviewAnswerResponse:
    """Generate feedback report and mark session as completed."""
    learner = await queries.get_learner(learner_id)
    profile = await queries.get_learner_profile(learner_id)
    profile_summary = _build_profile_summary(profile, learner)
    target_role = learner.get("target_role", "Software Developer") if learner else "Software Developer"

    feedback_data = None
    try:
        context = {
            "track": session.get("track", "technical"),
            "profile_summary": profile_summary,
            "target_role": target_role,
            "transcript": transcript,
        }
        # Metrics submitted with the final answer can influence this feedback.
        effective_delivery_metrics = delivery_metrics or session.get("delivery_metrics")
        if effective_delivery_metrics:
            context["delivery_metrics"] = effective_delivery_metrics
            context["camera_enabled"] = True

        result = await gateway.generate(
            task_type="interview.feedback",
            context=context,
        )
        feedback_data = result
    except AIServiceError as e:
        logger.warning(f"AI feedback generation failed: {e}")
        feedback_data = {
            "strengths": [],
            "gaps": [],
            "communication_notes": "Feedback generation is temporarily unavailable.",
            "readiness_subscore": 50,
            "suggested_missions": [],
        }

    # F-15 FIX: guard against the AI omitting readiness_subscore (now also
    # defaulted in the schema) so the session never 500s at completion.
    if isinstance(feedback_data, dict):
        feedback_data.setdefault("readiness_subscore", 50)

    # Update session as completed
    update_data = {
        "status": "completed",
        "transcript": transcript,
        "feedback_report": feedback_data,
        "readiness_subscore": feedback_data.get("readiness_subscore", 50),
    }
    if delivery_metrics:
        update_data.update({
            "camera_enabled": True,
            "delivery_metrics": delivery_metrics,
        })
    await queries.update_interview_session(session["id"], update_data)

    return InterviewAnswerResponse(
        next_question=None,
        status="completed",
        feedback_report=InterviewFeedbackResponse(**feedback_data),
    )


def _delivery_metrics_dict(request: DeliveryMetricsRequest) -> dict:
    """Convert a validated metrics request to the JSON stored in Supabase."""
    return {
        "eye_contact_pct": request.eye_contact_pct,
        "posture_score": request.posture_score,
        "expression_stability_score": request.expression_stability_score,
        "fidget_frequency": request.fidget_frequency,
        "words_per_minute": request.words_per_minute,
        "filler_word_rate": request.filler_word_rate,
        "pause_frequency": request.pause_frequency,
    }


def _build_profile_summary(profile: Optional[dict], learner: Optional[dict]) -> str:
    """Build a compact profile summary string for AI context."""
    parts = []
    if learner:
        if learner.get("target_role"):
            parts.append(f"Target role: {learner['target_role']}")
        if learner.get("segment"):
            parts.append(f"Segment: {learner['segment']}")
    if profile:
        skills = profile.get("skills", [])
        if skills:
            parts.append(f"Skills: {', '.join(skills[:10])}")
        strengths = profile.get("strengths", [])
        if strengths:
            parts.append(f"Strengths: {', '.join(strengths[:5])}")
    return "; ".join(parts) if parts else "Not specified"
