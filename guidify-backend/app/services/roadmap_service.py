"""
Roadmap Service — shared roadmap (re)generation logic.

Extracted from app/api/roadmap.py so both the /roadmap/regenerate route and the
Rules Engine (goal-change trigger, rules.md §1.3) perform regeneration through
one code path — no duplicated context assembly and no import cycle.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from app.db import queries
from app.ai_gateway.gateway import gateway
from app.models.schemas import RoadmapGenerateResponse

logger = logging.getLogger("guidify.api.roadmap")

DEBOUNCE_WINDOW_HOURS = 24


async def regenerate_roadmap(
    learner_id: str,
    trigger_reason: str = "regenerate_request",
    bypass_debounce: bool = False,
) -> Dict[str, Any]:
    """
    Generate or regenerate a learner's career roadmap.

    Assembles context from the learner + profile (including psychometric
    narrative, rules.md §3), calls the AI Gateway, validates the result, and
    persists it. Logs a roadmap_generated / roadmap_regenerated event.

    Returns a status dict: {"status": "ok"|"debounced"|"error", ...}.
    """
    learner = await queries.get_learner(learner_id)
    if not learner:
        logger.warning(f"Roadmap regeneration skipped: learner {learner_id} not found")
        return {"status": "learner_not_found", "message": "Learner not found"}

    # Debounce check (rules.md §2): 24h minimum between regenerations.
    # Goal changes (rules.md §1.3) bypass the window entirely.
    if not bypass_debounce:
        last_regeneration = await queries.get_last_regeneration(learner_id)
        if last_regeneration:
            try:
                last_time = datetime.fromisoformat(last_regeneration.replace("Z", "+00:00"))
            except ValueError:
                last_time = None
            if last_time and (datetime.now(timezone.utc) - last_time) < timedelta(hours=DEBOUNCE_WINDOW_HOURS):
                return {
                    "status": "debounced",
                    "message": "Roadmap regeneration is rate-limited to once per 24 hours. Try again later.",
                }

    profile = await queries.get_learner_profile(learner_id)

    # Build AI Gateway context from assembled profile data
    context: Dict[str, Any] = {
        "target_role": learner.get("target_role", "Software Developer"),
        "segment": learner.get("segment", "college"),
        "skills": profile.get("skills", []) if profile else [],
        "interests": profile.get("interests", []) if profile else [],
        "strengths": profile.get("strengths", []) if profile else [],
        "weaknesses": profile.get("weaknesses", []) if profile else [],
        "learning_hours": str(profile.get("questionnaire_data", {}).get("learning_hours", "5")) if profile else "5",
    }

    # F-10 FIX: inject psychometric narrative into the roadmap prompt so the AI
    # generates pacing/tone that match the learner's profile (rules.md §3).
    psychometric = await queries.get_psychometric_profile(learner_id)
    if psychometric:
        context["psychometric_narrative"] = psychometric.get("narrative_summary")
        context["psychometric_pacing"] = psychometric.get("pacing_hint", "mixed")
        context["psychometric_tone"] = psychometric.get("tone_hint", "encouraging")

    # Call AI Gateway with schema validation
    try:
        result = await gateway.generate(
            task_type="roadmap.generate",
            context=context,
            response_model=RoadmapGenerateResponse,
        )
    except Exception as e:
        logger.error(f"Roadmap generation failed for learner {learner_id}: {e}")
        return {
            "status": "ai_failed",
            "message": "AI roadmap generation failed. Please try again in a few minutes.",
        }

    # Persist to DB
    roadmap_data = {
        "title": result["title"],
        "total_phases": result["total_phases"],
        "estimated_weeks": result["estimated_weeks"],
        "phases": result["phases"],
        "trigger_reason": trigger_reason,
    }

    saved = await queries.create_roadmap(learner_id, roadmap_data)
    if not saved:
        logger.error(f"Roadmap generated but save failed for learner {learner_id}")
        return {
            "status": "save_failed",
            "message": "Roadmap was generated but could not be saved. Please try again.",
        }

    # Log event so the 24h regeneration debounce (rules.md §2) actually works.
    event_type = "roadmap_regenerated" if saved.get("version", 1) > 1 else "roadmap_generated"
    try:
        await queries.create_event(
            learner_id=learner_id,
            event_type=event_type,
            payload={
                "roadmap_id": saved.get("id"),
                "title": result["title"],
                "total_phases": result["total_phases"],
                "trigger_reason": trigger_reason,
            },
            related_roadmap_id=saved.get("id"),
        )
    except Exception as e:
        logger.warning(f"Failed to log {event_type} event for {learner_id}: {e}")

    return {
        "status": "ok",
        "roadmap_id": saved.get("id"),
        "title": result["title"],
        "total_phases": result["total_phases"],
        "estimated_weeks": result["estimated_weeks"],
        "message": "Roadmap generated successfully",
    }
