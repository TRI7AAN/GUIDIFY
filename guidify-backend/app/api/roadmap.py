"""
Roadmap Routes — api.md §3

Endpoints:
    GET  /roadmap/current     — Get active roadmap with phases
    GET  /roadmap/history     — Get superseded versions with trigger_reason
    POST /roadmap/regenerate  — Trigger roadmap (re)generation via AI Gateway
"""

import logging
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_learner_id
from app.db import queries
from app.services.roadmap_service import regenerate_roadmap

router = APIRouter(tags=["Roadmap"])
logger = logging.getLogger("guidify.api.roadmap")


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
async def regenerate_roadmap_route(
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Trigger roadmap generation/regeneration — api.md §3.

    Delegates to the shared roadmap service (context assembly, AI call,
    persistence, event log). Manual regeneration keeps the 24h debounce
    (rules.md §2); goal changes bypass it via the Rules Engine (rules.md §1.3).
    """
    result = await regenerate_roadmap(
        learner_id=learner_id,
        trigger_reason="regenerate_request",
        bypass_debounce=False,
    )

    if result["status"] == "learner_not_found":
        raise HTTPException(status_code=404, detail=result["message"])

    if result["status"] == "debounced":
        raise HTTPException(status_code=409, detail=result["message"])

    if result["status"] == "save_failed":
        raise HTTPException(status_code=500, detail=result["message"])

    if result["status"] != "ok":
        raise HTTPException(status_code=502, detail=result["message"])

    return {
        "status": "ok",
        "roadmap_id": result.get("roadmap_id"),
        "title": result.get("title"),
        "total_phases": result.get("total_phases"),
        "estimated_weeks": result.get("estimated_weeks"),
        "message": result.get("message"),
    }
