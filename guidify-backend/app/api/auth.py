"""
Auth & Profile Routes — api.md §1

Endpoints:
    POST /auth/onboarding   — Submit onboarding questionnaire
    GET  /profile/me        — Get current learner's assembled profile
    PATCH /profile/target-role — Update career goal (triggers regen per rules.md §1.3)
"""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_learner_id
from app.core.exceptions import ResourceNotFoundError
from app.db import queries
from app.models.schemas import (
    OnboardingRequest,
    OnboardingResponse,
    ProfileMeResponse,
    LearnerResponse,
    ProfileResponse,
    TargetRoleUpdate,
    TargetRoleResponse,
)
from app.services.rules_engine import RulesEngine

router = APIRouter(tags=["Auth & Profile"])


@router.post("/auth/onboarding", response_model=OnboardingResponse)
async def submit_onboarding(
    body: OnboardingRequest,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Submit onboarding questionnaire — api.md §1.

    Creates/updates the learner record with segment info, then creates
    a learner_profile with the questionnaire data.
    """
    # Update learner with segment
    await queries.update_learner(learner_id, {
        "segment": body.segment.value,
        "onboarding_completed": True,
    })

    # Create learner profile with questionnaire data
    profile = await queries.create_learner_profile(learner_id, {
        "questionnaire_data": body.questionnaire_data,
        "skills": [],
        "interests": body.questionnaire_data.get("interests", []),
        "strengths": [],
        "weaknesses": [],
    })

    return OnboardingResponse(
        profile_id=profile["id"] if profile else "",
        onboarding_completed=True,
    )


@router.get("/profile/me", response_model=ProfileMeResponse)
async def get_my_profile(
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Returns the current learner's assembled profile — api.md §1.
    """
    learner = await queries.get_learner(learner_id)
    if not learner:
        raise ResourceNotFoundError("Learner")

    profile_data = await queries.get_learner_profile(learner_id)

    return ProfileMeResponse(
        learner=LearnerResponse(
            id=learner["id"],
            email=learner.get("email", ""),
            full_name=learner.get("full_name", ""),
            segment=learner.get("segment"),
            target_role=learner.get("target_role"),
            onboarding_completed=learner.get("onboarding_completed", False),
        ),
        profile=ProfileResponse(
            skills=profile_data.get("skills", []) if profile_data else [],
            interests=profile_data.get("interests", []) if profile_data else [],
            strengths=profile_data.get("strengths", []) if profile_data else [],
            weaknesses=profile_data.get("weaknesses", []) if profile_data else [],
        ),
    )


@router.patch("/profile/target-role", response_model=TargetRoleResponse)
async def update_target_role(
    body: TargetRoleUpdate,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Update stated career goal — api.md §1.

    Per rules.md §1.3: Changing target role triggers immediate full roadmap
    regeneration. Goal changes bypass the 24h debounce window.
    """
    old_learner = await queries.get_learner(learner_id)
    old_target_role = old_learner.get("target_role") if old_learner else None

    await queries.update_learner(learner_id, {
        "target_role": body.target_role,
    })

    # Trigger roadmap regeneration via Rules Engine (bypasses debounce per rules.md §1.3)
    rules_engine = RulesEngine()
    adaptation = await rules_engine.evaluate_and_trigger(
        learner_id=learner_id,
        event_type="target_role_changed",
        event_payload={"old_target_role": old_target_role, "new_target_role": body.target_role},
    )

    return TargetRoleResponse(
        roadmap_regeneration_queued=adaptation.get("adaptation_needed", False),
        adaptation_details=adaptation,
    )
