"""
Roadmap Routes — api.md §3

Endpoints:
    GET  /roadmap/current     — Get active roadmap with phases
    GET  /roadmap/history     — Get superseded versions with trigger_reason
    POST /roadmap/regenerate  — Trigger roadmap (re)generation via AI Gateway
"""

import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_learner_id
from app.core.exceptions import ResourceNotFoundError
from app.db import queries
from app.ai_gateway.gateway import gateway
from app.models.schemas import RoadmapGenerateResponse

router = APIRouter(tags=["Roadmap"])
logger = logging.getLogger("guidify.api.roadmap")

DEBOUNCE_WINDOW_HOURS = 24


@router.get("/roadmap/current")
async def get_current_roadmap(
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Get the learner's active roadmap — api.md §3.

    Returns the full roadmap with all phases, progress, and current phase.
    """
    roadmap = await queries.get_active_roadmap(learner_id)
    if not roadmap:
        return {
            "status": "no_roadmap",
            "message": "No roadmap generated yet. Complete onboarding or trigger generation.",
        }

    return roadmap


@router.get("/roadmap/history")
async def get_roadmap_history(
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Get all roadmap versions — api.md §3.
    Returns list of roadmap summaries (id, title, version, status, trigger_reason, created_at).
    """
    history = await queries.get_roadmap_history(learner_id)
    return {"roadmaps": history}


@router.post("/roadmap/regenerate")
async def regenerate_roadmap(
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Trigger roadmap generation/regeneration — api.md §3.

    Assembles context from the learner + profile, calls AI Gateway
    with roadmap.generate, validates output, and persists to DB.

    Per rules.md §1.3: Goal changes bypass the 24h debounce window.
    """
    # 1. Fetch learner and profile for context
    learner = await queries.get_learner(learner_id)
    if not learner:
        raise ResourceNotFoundError("Learner")

    # Debounce check (rules.md §2): 24h minimum between regenerations
    last_regeneration = await queries.get_last_regeneration(learner_id)
    if last_regeneration:
        last_time = datetime.fromisoformat(last_regeneration.replace("Z", "+00:00"))
        if (datetime.now(timezone.utc) - last_time) < timedelta(hours=DEBOUNCE_WINDOW_HOURS):
            raise HTTPException(
                status_code=409,
                detail="Roadmap regeneration is rate-limited to once per 24 hours. Try again later.",
            )

    profile = await queries.get_learner_profile(learner_id)

    # Build AI Gateway context from assembled profile data
    context = {
        "target_role": learner.get("target_role", "Software Developer"),
        "segment": learner.get("segment", "college"),
        "skills": profile.get("skills", []) if profile else [],
        "interests": profile.get("interests", []) if profile else [],
        "strengths": profile.get("strengths", []) if profile else [],
        "weaknesses": profile.get("weaknesses", []) if profile else [],
        "learning_hours": str(profile.get("questionnaire_data", {}).get("learning_hours", "5")) if profile else "5",
    }

    # 2. Call AI Gateway with schema validation
    try:
        result = await gateway.generate(
            task_type="roadmap.generate",
            context=context,
            response_model=RoadmapGenerateResponse,
        )
    except Exception as e:
        logger.error(f"Roadmap generation failed for learner {learner_id}: {e}")
        return {
            "status": "error",
            "message": f"AI roadmap generation failed: {str(e)}",
        }

    # 3. Persist to DB
    roadmap_data = {
        "title": result["title"],
        "total_phases": result["total_phases"],
        "estimated_weeks": result["estimated_weeks"],
        "phases": result["phases"],
        "trigger_reason": "regenerate_request",
    }

    saved = await queries.create_roadmap(learner_id, roadmap_data)

    return {
        "status": "ok",
        "roadmap_id": saved["id"] if saved else None,
        "title": result["title"],
        "total_phases": result["total_phases"],
        "estimated_weeks": result["estimated_weeks"],
        "message": "Roadmap generated successfully",
    }
