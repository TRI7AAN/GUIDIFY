"""
LMI (Labour Market Intelligence) Routes

HIGH-03 FIX: Removed user_id URL parameter — user_id now sourced exclusively from JWT.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from app.middleware.auth import get_current_user
from app.services.lmi_service import lmi_service
from app.services.gemini_client import _sanitize_user_input
import logging

logger = logging.getLogger("guidify")
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
    safe_skill = _sanitize_user_input(skill, 100)
    if not safe_skill:
        raise HTTPException(status_code=400, detail="Skill parameter is required")
    return lmi_service.get_skills_trend(safe_skill, period)


@router.get("/match")
async def match_jobs(
    user: Dict[str, Any] = Depends(get_current_user)
    # HIGH-03 FIX: user_id parameter REMOVED — always sourced from the verified JWT token.
    # Any authenticated user can only see matches for their own profile.
):
    """
    Get job roles aligned with the authenticated user's learner profile.
    HIGH-03 FIX: user_id is no longer accepted from URL — prevents IDOR.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify authenticated user")

    try:
        # TODO: Fetch real profile from DB using user_id
        # For now, use a placeholder — real implementation should query `profiles` table
        from app.services.supabase_client import supabase
        profile_resp = supabase.table("profiles").select(
            "category_scores, career_suggestion"
        ).eq("user_id", user_id).single().execute()

        profile = profile_resp.data or {}
        skills = list(profile.get("category_scores", {}).keys()) if profile.get("category_scores") else ["Python", "SQL"]

        return {"matches": lmi_service.match_jobs({"skills": skills})}
    except Exception as e:
        logger.error(f"LMI match error for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve job matches")
