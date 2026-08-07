"""
ML Profiling Routes

Restored from the original `app/routes/ml_routes.py` (dropped during the
routes -> api refactor). Exposes ML profile generation and career
recommendations backed by `ml_service`.

Only the endpoints covered by tests/api.md are ported here; the rest were
dead (no consumers).
"""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from app.models.career_schemas import (
    LearnerProfile,
    MLProfileRequest,
    RecommendationItem,
    RecommendationResponse,
)
from app.services.ml_service import ml_service
from app.services.recommender import NCVET_COURSES

logger = logging.getLogger("guidify.api.ml")

router = APIRouter(tags=["ML Profiling"])


@router.post("/ml/profile/generate", response_model=LearnerProfile)
async def generate_profile(request: MLProfileRequest):
    """
    Build a learner profile from the request's update data.

    Note: ML-derived features are not persisted (LearnerProfile has no
    features field), so the encoder is not invoked here.
    """
    fields = LearnerProfile.model_fields
    data = {k: v for k, v in (request.update_data or {}).items() if k in fields}
    return LearnerProfile(user_id=request.user_id, **data)
