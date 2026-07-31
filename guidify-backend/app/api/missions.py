"""
Mission Routes — api.md §4

Full implementation for Phase 2 Daily Mission Engine.

Endpoints:
    GET  /missions/today                  — Get today's mission (auto-generate if none)
    POST /missions/{mission_id}/complete  — Mark mission completed
    POST /missions/{mission_id}/status    — Update status (failed/skipped/in_progress)
"""

import asyncio
import logging
import random
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.auth import get_current_learner_id
from app.core.exceptions import ResourceNotFoundError
from app.db import queries
from app.ai_gateway.gateway import gateway
from app.models.schemas import (
    MissionGenerateResponse,
    MissionCompleteRequest,
    MissionStatusUpdate,
)

router = APIRouter(tags=["Missions"])
logger = logging.getLogger("guidify.api.missions")


@router.get("/missions/today")
async def get_todays_mission(
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Get today's mission — api.md §4.

    Logic:
        1. Check for an existing pending/in_progress mission for today → return it.
        2. Check for completed/skipped/failed mission for today → return it (no re-gen).
        3. No mission exists → generate one via AI Gateway and persist.
    """
    # 1. Check for active mission today
    existing = await queries.get_todays_mission(learner_id)
    if existing:
        return existing

    # 2. Check for already-resolved mission today (completed/skipped/failed)
    resolved = await queries.get_todays_completed_mission(learner_id)
    if resolved:
        return resolved

    # 3. Auto-generate a new mission
    return await _generate_daily_mission(learner_id)


@router.post("/missions/{mission_id}/complete")
async def complete_mission(
    mission_id: str,
    body: Optional[MissionCompleteRequest] = None,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Mark mission completed — api.md §4.

    Persists completion timestamp and optional notes/time.
    """
    # Verify mission exists and belongs to learner
    mission = await queries.get_mission_by_id(mission_id, learner_id)
    if not mission:
        raise ResourceNotFoundError("Mission")

    notes = body.notes if body else None
    time_spent = body.time_spent_minutes if body else None

    updated = await queries.complete_mission(
        mission_id=mission_id,
        learner_id=learner_id,
        notes=notes,
        time_spent=time_spent,
    )

    # Recalculate streak
    streak = await queries.calculate_streak(learner_id)

    return {
        "status": "ok",
        "mission": updated,
        "streak_days": streak,
        "message": "Mission completed! Great work 🎉",
    }


@router.post("/missions/{mission_id}/status")
async def update_mission_status(
    mission_id: str,
    body: MissionStatusUpdate,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Update mission status — api.md §4.

    Supports: in_progress, failed, skipped.
    """
    mission = await queries.get_mission_by_id(mission_id, learner_id)
    if not mission:
        raise ResourceNotFoundError("Mission")

    updated = await queries.update_mission_status(
        mission_id=mission_id,
        learner_id=learner_id,
        status=body.status,
        notes=body.notes,
        time_spent=body.time_spent_minutes,
    )

    return {
        "status": "ok",
        "mission": updated,
        "message": f"Mission status updated to '{body.status}'",
    }


# ── Private Helpers ──────────────────────────────────────────────────

async def _generate_daily_mission(learner_id: str) -> dict:
    """
    Generate a daily mission using AI Gateway (mission.generate task).

    Assembles context from:
        - learner profile (target_role, segment)
        - active roadmap (current phase, skills)
        - recent mission history (avoid repetition, gauge difficulty)
    """
    # Fetch learner, profile, roadmap, and recent missions in parallel
    learner, profile, roadmap, recent_missions = await asyncio.gather(
        queries.get_learner(learner_id),
        queries.get_learner_profile(learner_id),
        queries.get_active_roadmap(learner_id),
        queries.get_recent_missions(learner_id, limit=5),
    )

    # Determine current phase from roadmap
    current_phase_title = "Foundations"
    current_phase_number = 1
    total_phases = 4
    phase_skills = []
    difficulty = "beginner"
    roadmap_id = None

    if roadmap:
        roadmap_id = roadmap.get("id")
        phases = roadmap.get("phases", [])
        current_phase_number = roadmap.get("current_phase_number", 1)
        total_phases = roadmap.get("total_phases", len(phases))

        # Find current phase data
        for phase in phases:
            if phase.get("phase_number") == current_phase_number:
                current_phase_title = phase.get("title", f"Phase {current_phase_number}")
                phase_skills = phase.get("skills", [])
                difficulty = phase.get("difficulty", "beginner")
                break

    # Pick a target skill from the current phase (rotating through skills)
    target_skill = "Problem Solving"
    if phase_skills:
        # Use date-based rotation to avoid repeating the same skill every day
        day_index = date.today().toordinal() % len(phase_skills)
        target_skill = phase_skills[day_index]

    # Determine estimated minutes based on learning hours
    learning_hours = 5
    if profile:
        learning_hours = profile.get("questionnaire_data", {}).get("learning_hours", 5)
        if isinstance(learning_hours, str):
            try:
                learning_hours = int(learning_hours)
            except ValueError:
                learning_hours = 5
    estimated_minutes = min(max(int(learning_hours * 60 / 7 * 0.7), 20), 60)

    # Build context for AI Gateway
    context = {
        "target_role": learner.get("target_role", "Software Developer") if learner else "Software Developer",
        "segment": learner.get("segment", "college") if learner else "college",
        "current_phase_title": current_phase_title,
        "current_phase_number": current_phase_number,
        "total_phases": total_phases,
        "phase_skills": phase_skills,
        "target_skill": target_skill,
        "difficulty": difficulty,
        "estimated_minutes": estimated_minutes,
        "mission_history": recent_missions,
    }

    # Call AI Gateway
    try:
        result = await gateway.generate(
            task_type="mission.generate",
            context=context,
            response_model=MissionGenerateResponse,
        )
    except Exception as e:
        logger.error(f"Mission generation failed for learner {learner_id}: {e}")
        # Fallback: return a generic mission so the learner isn't blocked
        result = {
            "title": f"Practice {target_skill}",
            "objective": f"Spend {estimated_minutes} minutes studying and practicing {target_skill}",
            "description": f"Review learning materials related to {target_skill} from your current roadmap phase.",
            "target_skill": target_skill,
            "difficulty": difficulty,
            "estimated_minutes": estimated_minutes,
            "steps": [
                f"Find a tutorial or documentation about {target_skill}",
                "Read through the key concepts",
                "Try one hands-on exercise",
                "Write a short summary of what you learned",
            ],
            "resources": [],
        }

    # Persist to DB
    mission_data = {
        "title": result["title"],
        "objective": result["objective"],
        "description": result.get("description", ""),
        "steps": result.get("steps", []),
        "resources": result.get("resources", []),
        "target_skill": result.get("target_skill", target_skill),
        "difficulty": result.get("difficulty", difficulty),
        "estimated_minutes": result.get("estimated_minutes", estimated_minutes),
        "roadmap_id": roadmap_id,
        "roadmap_phase_number": current_phase_number,
        "assigned_date": date.today().isoformat(),
        "status": "pending",
    }

    saved = await queries.create_mission(learner_id, mission_data)
    return saved if saved else mission_data
