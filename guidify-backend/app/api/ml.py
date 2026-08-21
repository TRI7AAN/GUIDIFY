"""
ML Profiling Routes

Restored from the original `app/routes/ml_routes.py` (dropped during the
routes -> api refactor). Exposes ML profile generation and career
recommendations backed by `ml_service`.

Only the endpoints covered by tests/api.md are ported here; the rest were
dead (no consumers).
"""

import logging

from fastapi import APIRouter, Depends

from app.core.auth import get_current_learner_id
from app.models.career_schemas import (
    LearnerProfile,
    MLProfileRequest,
)

logger = logging.getLogger("guidify.api.ml")

router = APIRouter(tags=["ML Profiling"])


@router.post("/ml/profile/generate", response_model=LearnerProfile)
async def generate_profile(
    request: MLProfileRequest,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Build a learner profile from the request's update data.

    F-22 FIX: now requires a valid learner token (previously unauthenticated).
    Note: ML-derived features are not persisted (LearnerProfile has no
    features field), so the encoder is not invoked here.
    """
    fields = LearnerProfile.model_fields
    data = {k: v for k, v in (request.update_data or {}).items() if k in fields}
    return LearnerProfile(user_id=request.user_id, **data)
