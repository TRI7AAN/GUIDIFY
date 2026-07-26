"""
Courses Routes

CRIT-03 FIX: /nsqf endpoint now requires authentication.
HIGH-01 FIX: /nsqf/sync now checks for admin role before allowing the operation.
HIGH-04 FIX: Removed random fake course padding — AI results returned as-is with a count.
LOW-02 FIX: Replaced print() with structured logger throughout.
"""

from fastapi import APIRouter, HTTPException, Depends, Form
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.services.recommender import get_course_recommendations
from app.middleware.auth import get_current_user
from app.services.gemini_client import _sanitize_user_input
import logging

logger = logging.getLogger("guidify")
router = APIRouter()


@router.post("/")
async def recommend_courses(
    college: str = Form(..., max_length=200),
    preference: str = Form(..., max_length=200),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Recommend courses based on college and preference.
    HIGH-04 FIX: AI returns what it returns — no more random padding.
    """
    try:
        courses = get_course_recommendations(college, preference)

        # HIGH-04 FIX: Never silently pad with random data.
        # If AI returns fewer than expected, return what was generated with a note.
        return {
            "user_name": user.get("user_metadata", {}).get("name", "User"),
            "college": college,
            "preference": preference,
            "courses": courses,
            "note": "AI-generated suggestions. Verify with official college sources."
        }
    except Exception as e:
        logger.error(f"Course recommendation error for user {user.get('id')}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate course recommendations")


class NSQFRequest(BaseModel):
    current_tier: str
    career_goal: str


@router.post("/nsqf")
async def recommend_nsqf(
    request: NSQFRequest,
    user: Dict[str, Any] = Depends(get_current_user)  # CRIT-03 FIX: Auth required
):
    """
    Recommend NCVET verified courses based on tier and career goal.
    CRIT-03 FIX: Requires authentication.
    """
    try:
        from app.services.recommender import recommend_nsqf_courses
        recommendations = recommend_nsqf_courses(request.current_tier, request.career_goal)
        return {"courses": recommendations}
    except Exception as e:
        logger.error(f"NSQF recommendation error for user {user.get('id')}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve NCVET course recommendations")


@router.post("/nsqf/sync")
async def sync_ncvet_courses(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Sync courses from NCVET API.
    HIGH-01 FIX: Admin role required — prevents any authenticated user from triggering sync.
    """
    # HIGH-01 FIX: Enforce admin-only access
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required to trigger course sync"
        )

    try:
        from app.services.ncvet_connector import ncvet_connector
        count = await ncvet_connector.sync_courses()
        return {"status": "success", "synced_count": count}
    except Exception as e:
        logger.error(f"NCVET sync error triggered by admin {user.get('id')}: {e}")
        raise HTTPException(status_code=500, detail="Course sync failed")


@router.get("/nsqf/search")
async def search_nsqf_courses(
    level: Optional[int] = None,
    skill: Optional[str] = None,
    limit: int = 20,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Search NCVET courses by level or skill.
    """
    try:
        from app.services.supabase_client import supabase
        query = supabase.table("ncvet_courses").select("*")

        if level:
            query = query.eq("nsqf_level", level)
        if skill:
            safe_skill = _sanitize_user_input(skill, 100)
            query = query.contains("skills", [safe_skill])

        result = query.limit(min(limit, 100)).execute()
        return {"courses": result.data or []}
    except Exception as e:
        logger.error(f"NCVET search error: {e}")
        return {"courses": []}