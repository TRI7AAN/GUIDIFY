"""
Adaptation Routes — rules.md §1-4

Endpoints for the Adaptation Engine (Rules Engine):
    POST /adaptation/event       — Log an event and evaluate adaptation triggers
    POST /adaptation/trigger     — Manually trigger adaptation check
    GET  /adaptation/status      — Get current adaptation status for learner
    GET  /adaptation/skill-gap   — Get skill gap analysis
    GET  /adaptation/events      — Get recent events for learner
"""

import logging
from fastapi import APIRouter, Depends

from app.core.auth import get_current_learner_id
from app.db import queries
from app.models.schemas import (
    EventCreateRequest,
    EventResponse,
    AdaptationDecision,
    AdaptationStatusResponse,
    AdaptationTriggerRequest,
    SkillGapResponse,
)
from app.services.rules_engine import RulesEngine

router = APIRouter(tags=["Adaptation"])
logger = logging.getLogger("guidify.api.adaptation")


@router.post("/adaptation/event", response_model=AdaptationDecision)
async def log_event_and_check_adaptation(
    request: EventCreateRequest,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Log an event and evaluate adaptation triggers.
    
    Per rules.md §1: Four trigger categories:
    1.1 Completes faster → advance difficulty
    1.2 Fails assessments → insert remedial missions
    1.3 Changes career goal → full regeneration
    1.4 Uploads certificate → update skill gaps
    """
    engine = RulesEngine()
    
    adaptation = await engine.evaluate_and_trigger(
        learner_id=learner_id,
        event_type=request.event_type.value,
        event_payload=request.payload,
    )
    
    return AdaptationDecision(**adaptation)


@router.post("/adaptation/trigger", response_model=AdaptationDecision)
async def manually_trigger_adaptation(
    request: AdaptationTriggerRequest,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Manually trigger adaptation check (e.g., from dashboard action).
    Logs the event and evaluates triggers.
    """
    engine = RulesEngine()
    
    adaptation = await engine.evaluate_and_trigger(
        learner_id=learner_id,
        event_type=request.event_type.value,
        event_payload=request.payload,
    )
    
    return AdaptationDecision(**adaptation)


@router.get("/adaptation/status", response_model=AdaptationStatusResponse)
async def get_adaptation_status(
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Get current adaptation status for the learner.
    Returns debounce status, recent events, failure count, and skill gap.
    """
    engine = RulesEngine()
    
    status = await engine.get_adaptation_status(learner_id)
    
    # Convert recent events to response models
    recent_events = [
        EventResponse(
            id=e.get("id", ""),
            event_type=e.get("event_type", ""),
            payload=e.get("payload", {}),
            created_at=e.get("created_at"),
        )
        for e in status.get("recent_events", [])
    ]
    
    return AdaptationStatusResponse(
        in_debounce_window=status.get("in_debounce_window", False),
        last_regeneration=status.get("last_regeneration"),
        consecutive_failures=status.get("consecutive_failures", 0),
        failure_threshold=status.get("failure_threshold", 3),
        recent_events=recent_events,
        skill_gap=SkillGapResponse(**status.get("skill_gap", {})),
    )


@router.get("/adaptation/skill-gap", response_model=SkillGapResponse)
async def get_skill_gap(
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Get skill gap analysis for the learner.
    Compares current skills against target role requirements.
    """
    engine = RulesEngine()
    
    gap = await engine.calculate_skill_gap(learner_id)
    
    return SkillGapResponse(**gap)


@router.get("/adaptation/events", response_model=list[EventResponse])
async def get_recent_events(
    limit: int = 20,
    learner_id: str = Depends(get_current_learner_id),
):
    """Get recent events for the learner."""
    events = await queries.get_recent_events(learner_id, limit=limit)
    
    return [
        EventResponse(
            id=e.get("id", ""),
            event_type=e.get("event_type", ""),
            payload=e.get("payload", {}),
            created_at=e.get("created_at"),
        )
        for e in events
    ]
