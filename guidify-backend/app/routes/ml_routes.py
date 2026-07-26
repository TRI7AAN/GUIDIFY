"""
ML Routes

CRIT-03 FIX: Both endpoints now require authentication.
MED-02 FIX: Generic error messages to clients; real errors logged internally.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from app.models.career_schemas import LearnerProfile, MLProfileRequest, RecommendationResponse, RecommendationItem
from app.services.ml_service import ml_service
from app.services.recommender import NCVET_COURSES
from app.middleware.auth import get_current_user
import logging

logger = logging.getLogger("guidify")
router = APIRouter()


@router.post("/profile/generate", response_model=LearnerProfile)
async def generate_profile(
    request: MLProfileRequest,
    user: Dict[str, Any] = Depends(get_current_user)  # CRIT-03 FIX: Auth required
):
    """
    Generate or update a learner profile with ML-derived features.
    CRIT-03 FIX: Requires authentication.
    """
    try:
        profile_data = request.update_data or {}
        profile = LearnerProfile(
            user_id=request.user_id,
            **profile_data
        )
        features = ml_service.generate_profile_features(profile)
        return profile
    except Exception as e:
        logger.error(f"ML profile generation error for user {user.get('id')}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate profile")


@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(
    profile: LearnerProfile,
    user: Dict[str, Any] = Depends(get_current_user)  # CRIT-03 FIX: Auth required
):
    """
    Get ranked recommendations for the given profile.
    CRIT-03 FIX: Requires authentication.
    """
    try:
        candidates = []
        for c in NCVET_COURSES:
            candidates.append({
                "id": str(c.get("id", c.get("course_name"))),
                "title": c.get("course_name"),
                "description": f"{c.get('sector', '')} - {c.get('description', '')}",
                "type": "course",
                "metadata": c
            })

        recommendations = ml_service.get_recommendations(profile, candidates)
        return RecommendationResponse(
            success=True,
            recommendations=recommendations[:10]
        )
    except Exception as e:
        logger.error(f"ML recommendations error for user {user.get('id')}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")
