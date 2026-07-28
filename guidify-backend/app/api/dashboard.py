"""
Dashboard Routes — api.md §6

Endpoints:
    GET /dashboard — Aggregated view for the home screen

Phase 2 implementation: aggregates real streak, roadmap progress, and skill data.
"""

import logging
from fastapi import APIRouter, Depends

from app.core.auth import get_current_learner_id
from app.db import queries
from app.models.schemas import DashboardResponse, SkillGraphEntry

router = APIRouter(tags=["Dashboard"])
logger = logging.getLogger("guidify.api.dashboard")


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Aggregated dashboard view — api.md §6.

    Phase 2: Aggregates real data from roadmap, missions, and profile.
    """
    # Fetch roadmap for phase progress
    roadmap = await queries.get_active_roadmap(learner_id)
    current_phase = None
    progress_pct = 0
    skill_graph = []

    if roadmap:
        current_phase_number = roadmap.get("current_phase_number", 1)
        phases = roadmap.get("phases", [])
        total_phases = roadmap.get("total_phases", len(phases))
        progress_pct = roadmap.get("progress_pct", 0)

        # Find current phase title
        for phase in phases:
            if phase.get("phase_number") == current_phase_number:
                current_phase = phase.get("title", f"Phase {current_phase_number}")
                break

        # If no progress_pct in DB, estimate from phase position
        if progress_pct == 0 and total_phases > 0:
            progress_pct = int(((current_phase_number - 1) / total_phases) * 100)

        # Build skill graph from roadmap phases
        for phase in phases:
            phase_num = phase.get("phase_number", 0)
            for skill_name in phase.get("skills", [])[:3]:  # Top 3 skills per phase
                # Current level: 0 if future phase, estimated if current/past
                current_level = 0
                if phase_num < current_phase_number:
                    current_level = 3  # Assumed learned
                elif phase_num == current_phase_number:
                    current_level = 1  # In progress
                target_level = 3 if phase.get("difficulty") != "advanced" else 4

                skill_graph.append(SkillGraphEntry(
                    skill=skill_name,
                    level=current_level,
                    target_level=target_level,
                ))

    # Calculate streak from missions
    streak_days = await queries.calculate_streak(learner_id)

    return DashboardResponse(
        streak_days=streak_days,
        current_phase=current_phase,
        roadmap_progress_pct=progress_pct,
        interview_readiness=0,  # Phase 4
        placement_readiness=min(progress_pct, 100),  # Estimate from roadmap progress
        skill_graph=skill_graph[:8],  # Cap at 8 skills for clean radar display
    )
