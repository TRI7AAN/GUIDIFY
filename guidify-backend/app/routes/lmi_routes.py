from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from app.middleware.auth import get_current_user
from app.services.lmi_service import lmi_service

router = APIRouter()

@router.get("/skills-trend")
async def get_skills_trend(
    skill: str, 
    period: str = "current",
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get market trend for a specific skill.
    """
    return lmi_service.get_skills_trend(skill, period)

@router.get("/match")
async def match_jobs(
    user_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get job roles aligned with learner profile.
    """
    # In real app, fetch profile from DB
    # Mock profile for now
    mock_profile = {
        "skills": ["Python", "SQL", "React"]
    }
    return {"matches": lmi_service.match_jobs(mock_profile)}
