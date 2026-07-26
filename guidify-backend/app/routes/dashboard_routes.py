"""
Dashboard Routes

HIGH-02 FIX: Trainer dashboard IDOR fixed — trainer_id validated against JWT user.
MED-02 FIX: Internal errors logged; generic messages to client.
MED-06 FIX: Dashboard now fetches 3 queries in parallel using asyncio.gather().
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from app.middleware.auth import get_current_user
from app.services.supabase_client import supabase
import logging
import asyncio

logger = logging.getLogger("guidify")
router = APIRouter()


@router.get("/learner")
async def get_learner_dashboard(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get learner dashboard data for the authenticated user.
    MED-06 FIX: Three DB queries now run in parallel via asyncio.gather().
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify authenticated user")

    try:
        # MED-06 FIX: Run all three queries in parallel — ~3x faster than sequential
        def _fetch_profile():
            return supabase.table("profiles").select(
                "name, career_roadmap, career_readiness_score, current_tier, login_streak, "
                "activity_log, onboarding_complete, category_scores, career_suggestion"
            ).eq("user_id", user_id).single().execute()

        def _fetch_exam_history():
            return supabase.table("user_exam_history").select(
                "subject, total_exams, average_score, best_score, skill_level"
            ).eq("user_id", user_id).execute()

        def _fetch_recent_exams():
            return supabase.table("exam_results").select(
                "score, total_questions, percentage, created_at"
            ).eq("user_id", user_id).order("created_at", desc=True).limit(5).execute()

        profile_resp, exam_history_resp, recent_exams_resp = await asyncio.gather(
            asyncio.to_thread(_fetch_profile),
            asyncio.to_thread(_fetch_exam_history),
            asyncio.to_thread(_fetch_recent_exams),
        )

        profile = profile_resp.data or {}
        exam_history = exam_history_resp.data or []
        recent_exams = recent_exams_resp.data or []

        return {
            "user_id": user_id,
            "profile": {
                "name": profile.get("name"),
                "career_suggestion": profile.get("career_suggestion"),
                "category_scores": profile.get("category_scores"),
                "onboarding_complete": profile.get("onboarding_complete", False),
            },
            "gamification": {
                "login_streak": profile.get("login_streak", 0),
                "activity_log": profile.get("activity_log", {}),
            },
            "career": {
                "roadmap": profile.get("career_roadmap"),
                "readiness_score": profile.get("career_readiness_score", 0),
                "current_tier": profile.get("current_tier", "Novice"),
            },
            "exams": {
                "history_by_subject": exam_history,
                "recent_results": recent_exams,
            }
        }

    except Exception as e:
        logger.error(f"Dashboard fetch error for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to load dashboard data")


@router.get("/trainer/{trainer_id}")
async def get_trainer_dashboard(
    trainer_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Trainer dashboard.
    HIGH-02 FIX: Verifies that the requesting user owns this trainer_id or is admin.
    Prevents any authenticated user from querying another user's trainer data (IDOR).
    """
    authenticated_user_id = user.get("id")
    user_role = user.get("role", "student")

    # HIGH-02 FIX: Enforce ownership — trainer_id must match the authenticated user
    # OR the requester must be an admin.
    if trainer_id != authenticated_user_id and user_role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied: you can only access your own trainer dashboard"
        )

    return {
        "trainer_id": trainer_id,
        "message": "Trainer dashboard data is being built. Check back soon.",
        "cohorts": [],
        "pending_reviews": 0,
    }


@router.get("/policy")
async def get_policy_dashboard(
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Policy/admin dashboard — placeholder for future analytics.
    """
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return {
        "message": "Policy dashboard analytics are being developed.",
        "total_learners": 0,
        "adoption_metrics": {}
    }
