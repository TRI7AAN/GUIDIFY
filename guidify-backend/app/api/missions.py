"""
Mission Routes — api.md §4

Scaffolded for Phase 0. Full implementation in Phase 2.

Endpoints:
    GET  /missions/today                  — Get today's mission
    POST /missions/{mission_id}/complete  — Mark mission completed
    POST /missions/{mission_id}/status    — Update status (failed/skipped/too_hard)
"""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_learner_id

router = APIRouter(tags=["Missions"])


@router.get("/missions/today")
async def get_todays_mission(
    learner_id: str = Depends(get_current_learner_id),
):
    """Get today's mission — Phase 2 implementation."""
    return {"error": {"code": "NOT_IMPLEMENTED", "message": "Daily missions available in Phase 2"}}


@router.post("/missions/{mission_id}/complete")
async def complete_mission(
    mission_id: str,
    learner_id: str = Depends(get_current_learner_id),
):
    """Mark mission completed — Phase 2 implementation."""
    return {"error": {"code": "NOT_IMPLEMENTED", "message": "Mission completion available in Phase 2"}}


@router.post("/missions/{mission_id}/status")
async def update_mission_status(
    mission_id: str,
    learner_id: str = Depends(get_current_learner_id),
):
    """Update mission status — Phase 2 implementation."""
    return {"error": {"code": "NOT_IMPLEMENTED", "message": "Mission status update available in Phase 2"}}
