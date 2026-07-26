"""
Gamification Routes

SEC-03 FIX: user_id is now extracted from the verified JWT token
(via get_current_user dependency), never from the request body.
An authenticated user can only modify their own gamification data.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
from app.services.gamification_service import GamificationService
from app.middleware.auth import get_current_user

router = APIRouter()


class UpdateTaskRequest(BaseModel):
    roadmap: Dict[str, Any]


@router.post("/gamification/sync-login")
async def sync_login(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Sync login streak for the currently authenticated user.
    SEC-03: user_id sourced from JWT, not request body.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify authenticated user")
    try:
        result = GamificationService.sync_login(user_id)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gamification/update-tasks")
async def update_tasks(
    request: UpdateTaskRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update task completion for the currently authenticated user.
    SEC-03: user_id sourced from JWT, not request body.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify authenticated user")
    try:
        result = GamificationService.update_task_completion(user_id, request.roadmap)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gamification/daily-login")
async def daily_login(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Updates the user's login streak.
    - If last_login was yesterday, increment streak.
    - If last_login was today, do nothing.
    - If last_login was older, reset streak to 1.

    SEC-03: user_id sourced from JWT, not request body.
    BUG-03 FIX: Date diff computed once and reused, no double parse.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify authenticated user")

    try:
        from app.services.supabase_client import supabase
        from datetime import datetime, timedelta

        # 1. Fetch current profile
        response = supabase.table("profiles").select("login_streak, last_login").eq("user_id", user_id).single().execute()

        if not response.data:
            return {"status": "error", "message": "Profile not found"}

        profile = response.data
        current_streak = profile.get("login_streak", 0) or 0
        last_login_str = profile.get("last_login")

        today = datetime.utcnow().date()
        new_streak = current_streak

        # BUG-03 FIX: Compute diff once, reuse the value
        diff = None
        if last_login_str:
            last_login_date = datetime.fromisoformat(last_login_str.replace('Z', '+00:00')).date()
            diff = (today - last_login_date).days

            if diff == 0:
                # Already logged in today — no update needed
                return {"status": "success", "streak": current_streak}
            elif diff == 1:
                new_streak += 1
            else:
                new_streak = 1
        else:
            new_streak = 1

        # 2. Update Supabase (only if day has changed — guaranteed by diff != 0 above)
        supabase.table("profiles").update({
            "login_streak": new_streak,
            "last_login": today.isoformat()
        }).eq("user_id", user_id).execute()

        return {"status": "success", "streak": new_streak}

    except Exception as e:
        import logging
        logging.getLogger("guidify").error(f"Error in daily_login: {e}")
        # Don't block login on non-critical gamification errors
        return {"status": "error", "message": "Streak update failed (non-critical)"}
