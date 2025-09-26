from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from app.models.schemas import LearnerProfile, MLProfileRequest, RecommendationResponse, RecommendationItem
from app.services.ml_service import ml_service
from app.services.recommender import NCVET_COURSES # Use existing data for now

router = APIRouter()

@router.post("/profile/generate", response_model=LearnerProfile)
async def generate_profile(request: MLProfileRequest):
    """
    Generate or update a learner profile with ML-derived features.
    """
    try:
        # In a real app, fetch profile from DB using request.user_id
        # For now, we construct a dummy profile or use update_data
        profile_data = request.update_data or {}
        profile = LearnerProfile(
            user_id=request.user_id,
            **profile_data
        )
        
        # Generate features
        features = ml_service.generate_profile_features(profile)
        
        # Update profile with features (e.g. predicted cluster)
        # profile.features = features # If we had a features field
        
        # Return updated profile
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(profile: LearnerProfile):
    """
    Get ranked recommendations for the given profile.
    """
    try:
        # Candidates: Mix of NCVET courses and maybe others
        # Convert NCVET_COURSES to candidate format
        candidates = []
        for c in NCVET_COURSES:
            candidates.append({
                "id": str(c.get("id", c.get("course_name"))), # Fallback ID
                "title": c.get("course_name"),
                "description": f"{c.get('sector', '')} - {c.get('description', '')}",
                "type": "course",
                "metadata": c
            })
            
        recommendations = ml_service.get_recommendations(profile, candidates)
        
        return RecommendationResponse(
            success=True,
            recommendations=recommendations[:10] # Top 10
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
