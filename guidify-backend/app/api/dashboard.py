"""
Dashboard Routes — api.md §6

Endpoints:
    GET /dashboard — Aggregated view for the home screen
    GET /dashboard/delivery-trends — Delivery Analytics longitudinal trends (Phase 4.5)

Phase 2 implementation: aggregates real streak, roadmap progress, and skill data.
"""

import asyncio
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends

from app.core.auth import get_current_learner_id
from app.db import queries
from app.models.schemas import DashboardResponse, SkillGraphEntry, DeliveryTrendsResponse, DeliveryTrendSeries, DeliveryTrendPoint, ActivityHeatmapResponse

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
    async def _fetch_profile_psychometrics(lid: str):
        try:
            # F-11 FIX: onboarding stores category_scores on `learners`; fall back
            # to learner_profiles.questionnaire_data for legacy accounts.
            learner = await queries.get_learner(lid)
            if learner and learner.get("category_scores"):
                return learner["category_scores"], None
            result = await queries.get_learner_profile(lid)
            if result:
                qd = result.get("questionnaire_data", {})
                if isinstance(qd, dict):
                    return qd.get("category_scores"), qd.get("recommended_courses")
        except Exception as e:
            logger.warning(f"Failed to fetch questionnaire_data: {e}")
        return None, None

    # Fetch roadmap, streak, and profile psychometrics in parallel
    roadmap, streak_days, (category_scores, recommended_courses) = await asyncio.gather(
        queries.get_active_roadmap(learner_id),
        queries.calculate_streak(learner_id),
        _fetch_profile_psychometrics(learner_id),
    )

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

    return DashboardResponse(
        streak_days=streak_days,
        current_phase=current_phase,
        roadmap_progress_pct=progress_pct,
        interview_readiness=0,  # Phase 4
        placement_readiness=min(progress_pct, 100),  # Estimate from roadmap progress
        skill_graph=skill_graph[:8],  # Cap at 8 skills for clean radar display
        category_scores=category_scores,
        recommended_courses=recommended_courses or [],
    )


@router.get("/dashboard/delivery-trends", response_model=DeliveryTrendsResponse)
async def get_delivery_trends(
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Longitudinal delivery metrics trends — api.md §6.
    Compute-on-read from interview_sessions.delivery_metrics (schema.md §8.1).
    """
    sessions = await queries.get_interview_history(learner_id, limit=50)

    # Collect metrics across sessions
    metric_names = ["eye_contact_pct", "posture_score", "filler_word_rate", "words_per_minute"]
    trend_data: Dict[str, List[DeliveryTrendPoint]] = {m: [] for m in metric_names}

    for session in sessions:
        if session.get("status") != "completed":
            continue
        dm = session.get("delivery_metrics")
        if not dm or not isinstance(dm, dict):
            continue

        session_id = session.get("id", "")
        created_at = session.get("created_at", "")

        for metric in metric_names:
            value = dm.get(metric)
            if value is not None:
                trend_data[metric].append(DeliveryTrendPoint(
                    session_id=session_id,
                    value=float(value),
                    date=str(created_at) if created_at else None,
                ))

    trends = [
        DeliveryTrendSeries(metric=m, history=points)
        for m, points in trend_data.items()
        if points
    ]

    return DeliveryTrendsResponse(trends=trends)


@router.get("/dashboard/activity-heatmap", response_model=ActivityHeatmapResponse)
async def get_activity_heatmap(
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Daily activity counts for the GitHub-style contribution heatmap — api.md §6.

    Aggregates missions, interview sessions, and event log entries per day
    over the last ~365 days.
    """
    activity = await queries.get_daily_activity(learner_id)
    return ActivityHeatmapResponse(
        activity=activity,
        total_activities=sum(activity.values()),
        active_days=len(activity),
    )
