from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from app.services.gamification_service import GamificationService

router = APIRouter()

class SyncLoginRequest(BaseModel):
    user_id: str

class UpdateTaskRequest(BaseModel):
    user_id: str
    roadmap: Dict[str, Any]

@router.post("/gamification/sync-login")
async def sync_login(request: SyncLoginRequest):
    try:
        result = GamificationService.sync_login(request.user_id)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gamification/update-tasks")
async def update_tasks(request: UpdateTaskRequest):
    try:
        result = GamificationService.update_task_completion(request.user_id, request.roadmap)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gamification/daily-login")
async def daily_login(request: SyncLoginRequest):
    """
    Updates the user's login streak.
    - If last_login was yesterday, increment streak.
    - If last_login was today, do nothing.
    - If last_login was older, reset streak to 1.
    """
    try:
        from app.services.supabase_client import supabase
        from datetime import datetime, timedelta
        
        # 1. Fetch current profile
        response = supabase.table("profiles").select("login_streak, last_login").eq("user_id", request.user_id).single().execute()
        
        if not response.data:
            # Create profile if missing (shouldn't happen usually)
            return {"status": "error", "message": "Profile not found"}
            
        profile = response.data
        current_streak = profile.get("login_streak", 0)
        last_login_str = profile.get("last_login")
        
        today = datetime.utcnow().date()
        
        new_streak = current_streak
        
        if last_login_str:
            last_login_date = datetime.fromisoformat(last_login_str.replace('Z', '+00:00')).date()
            diff = (today - last_login_date).days
            
            if diff == 0:
                # Already logged in today
                pass 
            elif diff == 1:
                # Consecutive day
                new_streak += 1
            else:
                # Broken streak
                new_streak = 1
        else:
            # First login
            new_streak = 1
            
        # 2. Update Supabase
        if last_login_str is None or (today - datetime.fromisoformat(last_login_str.replace('Z', '+00:00')).date()).days > 0:
            supabase.table("profiles").update({
                "login_streak": new_streak,
                "last_login": today.isoformat()
            }).eq("user_id", request.user_id).execute()
            
        return {"status": "success", "streak": new_streak}
        
    except Exception as e:
        print(f"Error in daily_login: {e}")
        # Don't block login on error
        return {"status": "error", "message": str(e)}
