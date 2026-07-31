"""
Profile Psychometrics Routes — api.md §7

Endpoints:
    POST /profile/psychometrics      — Submit instrument answers, triggers scoring + narration
    GET  /profile/psychometrics/status — Whether assessment is complete, retake eligibility

Per api.md §7: No endpoint returns raw trait percentages to the frontend for direct display.
Per rules.md §9: 6-month retake cooldown enforced.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.auth import get_current_learner_id
from app.db import queries
from app.ai_gateway.gateway import gateway

logger = logging.getLogger("guidify.api.profile_psychometrics")

router = APIRouter(tags=["Profile Psychometrics"])

# Retake cooldown: 6 months
RETAKE_COOLDOWN_DAYS = 180


# ── Request/Response Schemas ────────────────────────────────────────────────

class PsychometricAnswer(BaseModel):
    item_id: str
    value: int = Field(ge=1, le=5)


class ProfilePsychometricsRequest(BaseModel):
    answers: List[PsychometricAnswer]
    consent_id: Optional[str] = None


class ProfilePsychometricsResponse(BaseModel):
    status: str
    narrative_summary: Optional[str] = None
    pacing_hint: Optional[str] = None
    completed: bool


class PsychometricsStatusResponse(BaseModel):
    completed: bool
    administered_at: Optional[str] = None
    retake_eligible_at: Optional[str] = None


# ── Routes ──────────────────────────────────────────────────────────────────

@router.post("/profile/psychometrics", response_model=ProfilePsychometricsResponse)
async def submit_psychometrics(
    request: ProfilePsychometricsRequest,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Submit instrument answers. Triggers deterministic scoring (IPIP + RIASEC)
    and one narration call. Returns narrative summary only — never raw scores.

    Per api.md §7: Raw trait percentages are never included in this response.
    Per rules.md §9.1: Enforces 6-month retake cooldown.
    """
    from app.services.psychometrics_scoring import score_all, get_ipip_version, get_riasec_version
    from app.services.supabase_client import supabase

    # Validate consent if provided
    if request.consent_id:
        try:
            consent_check = (
                supabase.table("consents")
                .select("id")
                .eq("id", request.consent_id)
                .eq("learner_id", learner_id)
                .single()
                .execute()
            )
            if not consent_check.data:
                raise HTTPException(status_code=400, detail="Invalid consent record")
        except HTTPException:
            raise
        except Exception:
            logger.warning(f"Consent validation failed for learner {learner_id}, proceeding without consent_id")

    # Check retake cooldown
    try:
        existing = (
            supabase.table("psychometric_profiles")
            .select("administered_at")
            .eq("learner_id", learner_id)
            .single()
            .execute()
        )
        if existing.data and existing.data.get("administered_at"):
            administered_at = datetime.fromisoformat(existing.data["administered_at"].replace("Z", "+00:00"))
            retake_eligible = administered_at + timedelta(days=RETAKE_COOLDOWN_DAYS)
            if datetime.now(timezone.utc) < retake_eligible:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "code": "retake_cooldown",
                        "message": "Assessment retake not yet eligible",
                        "retake_eligible_at": retake_eligible.isoformat(),
                    }
                )
    except HTTPException:
        raise
    except Exception:
        pass  # No existing profile — first time, proceed

    # Convert answers to dict for scoring
    answers_dict = {a.item_id: a.value for a in request.answers}

    # Deterministic scoring — no AI involved
    ipip_scores, riasec_scores, metadata = score_all(answers_dict)

    # Narration — single AI Gateway call
    narrative_summary = None
    pacing_hint = None
    tone_hint = None

    try:
        narrate_result = await gateway.generate(
            task_type="psychometrics.narrate",
            context={
                "ipip_scores": ipip_scores,
                "riasec_scores": riasec_scores,
            },
        )
        narrative_summary = narrate_result.get("narrative_summary")
        pacing_hint = narrate_result.get("pacing_hint")
        tone_hint = narrate_result.get("tone_hint")
    except Exception as e:
        logger.warning(f"Narration failed for learner {learner_id}: {e}. Proceeding without narrative.")

    # Persist to psychometric_profiles
    now = datetime.now(timezone.utc).isoformat()
    profile_data = {
        "learner_id": learner_id,
        "ipip_scores": ipip_scores,
        "riasec_scores": riasec_scores,
        "narrative_summary": narrative_summary,
        "pacing_hint": pacing_hint,
        "tone_hint": tone_hint,
        "consent_id": request.consent_id,
        "administered_at": now,
        "instrument_version": f"ipip-{metadata['ipip_version']}_riasec-{metadata['riasec_version']}",
    }

    try:
        # Upsert — one profile per learner, overwritten on retake
        existing_profile = (
            supabase.table("psychometric_profiles")
            .select("id")
            .eq("learner_id", learner_id)
            .single()
            .execute()
        )
        if existing_profile.data:
            supabase.table("psychometric_profiles").update(profile_data).eq(
                "learner_id", learner_id
            ).execute()
        else:
            supabase.table("psychometric_profiles").insert(profile_data).execute()
    except Exception as e:
        logger.error(f"Failed to persist psychometric profile for {learner_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save assessment results")

    return ProfilePsychometricsResponse(
        status="completed",
        narrative_summary=narrative_summary,
        pacing_hint=pacing_hint,
        completed=True,
    )


@router.get("/profile/psychometrics/status", response_model=PsychometricsStatusResponse)
async def get_psychometrics_status(
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Returns whether the assessment is complete and the eligible-for-retake date.
    Per api.md §7.
    """
    from app.services.supabase_client import supabase

    try:
        result = (
            supabase.table("psychometric_profiles")
            .select("administered_at")
            .eq("learner_id", learner_id)
            .single()
            .execute()
        )
        if result.data and result.data.get("administered_at"):
            administered_at = result.data["administered_at"]
            administered_dt = datetime.fromisoformat(administered_at.replace("Z", "+00:00"))
            retake_eligible_dt = administered_dt + timedelta(days=RETAKE_COOLDOWN_DAYS)
            retake_eligible_at = retake_eligible_dt.isoformat()

            return PsychometricsStatusResponse(
                completed=True,
                administered_at=administered_at,
                retake_eligible_at=retake_eligible_at,
            )
    except Exception:
        pass

    return PsychometricsStatusResponse(
        completed=False,
        administered_at=None,
        retake_eligible_at=None,
    )
