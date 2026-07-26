"""
Roadmap Routes — api.md §3

Scaffolded for Phase 0. Full implementation in Phase 2.

Endpoints:
    GET  /roadmap/current     — Get active roadmap with phases
    GET  /roadmap/history     — Get superseded versions with trigger_reason
    POST /roadmap/regenerate  — Internal: triggered by Rules Engine
"""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_learner_id

router = APIRouter(tags=["Roadmap"])


@router.get("/roadmap/current")
async def get_current_roadmap(
    learner_id: str = Depends(get_current_learner_id),
):
    """Get active roadmap — Phase 2 implementation."""
    return {"error": {"code": "NOT_IMPLEMENTED", "message": "Roadmap available in Phase 2"}}


@router.get("/roadmap/history")
async def get_roadmap_history(
    learner_id: str = Depends(get_current_learner_id),
):
    """Get roadmap version history — Phase 2 implementation."""
    return {"error": {"code": "NOT_IMPLEMENTED", "message": "Roadmap history available in Phase 2"}}


@router.post("/roadmap/regenerate")
async def regenerate_roadmap(
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Internal: Trigger roadmap regeneration — Phase 2/3 implementation.
    Per api.md §3: Not part of the public learner-facing surface.
    """
    return {"error": {"code": "NOT_IMPLEMENTED", "message": "Roadmap regeneration available in Phase 2"}}
