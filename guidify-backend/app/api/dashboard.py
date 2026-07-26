"""
Dashboard Routes — api.md §6

Endpoints:
    GET /dashboard — Aggregated view for the home screen
"""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_learner_id
from app.models.schemas import DashboardResponse

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Aggregated dashboard view — api.md §6.

    Phase 0: Returns default/empty data.
    Phase 2+: Will aggregate real streak, phase progress, skill graph data.
    """
    # TODO Phase 2: Aggregate real data from missions, roadmap, interviews
    return DashboardResponse(
        streak_days=0,
        current_phase=None,
        roadmap_progress_pct=0,
        interview_readiness=0,
        placement_readiness=0,
        skill_graph=[],
    )
