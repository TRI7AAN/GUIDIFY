"""
Career Routes

MED-02 FIX: Generic error messages to client; internal errors logged.
HIGH-09 FIX: GamificationService.log_activity() wrapped in asyncio.to_thread — no longer blocks event loop.
"""

from fastapi import APIRouter, HTTPException, Depends
from app.services.career_service import CareerService
from app.middleware.auth import get_current_user
from app.services.supabase_client import supabase
from pydantic import BaseModel
from typing import Dict, Any
import asyncio
import logging

logger = logging.getLogger("guidify")
router = APIRouter()


class RoadmapRequest(BaseModel):
    current_subjects: str
    target_career: str
    current_level: str = "Beginner"
    availability_hours: str = "10"


class StepCompletionRequest(BaseModel):
    step_index: int


@router.post("/roadmap/generate")
async def generate_roadmap(
    request: RoadmapRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    SEC-03: user_id sourced from JWT — user can only update their own roadmap.
    MED-02 FIX: Generic error messages to clients; real error logged internally.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify authenticated user")

    try:
        roadmap = await CareerService.generate_roadmap(
            request.current_subjects,
            request.target_career,
            request.current_level,
            request.availability_hours
        )

        # Save to Supabase — only for the authenticated user's profile
        supabase.table("profiles").update({
            "career_roadmap": roadmap
        }).eq("user_id", user_id).execute()

        return roadmap
    except Exception as e:
        # MED-02 FIX: Log real error, return generic message to client
        logger.error(f"Roadmap generation failed for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate roadmap")


@router.post("/roadmap/complete-step")
async def complete_step(
    request: StepCompletionRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Mark a step as completed in the authenticated user's roadmap.
    HIGH-09 FIX: GamificationService.log_activity wrapped in asyncio.to_thread.
    MED-02 FIX: Generic error message to client.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify authenticated user")

    try:
        # 1. Fetch current roadmap
        response = supabase.table("profiles").select("career_roadmap").eq("user_id", user_id).single().execute()
        if not response.data or not response.data.get("career_roadmap"):
            raise HTTPException(status_code=404, detail="Roadmap not found")

        roadmap = response.data["career_roadmap"]

        # 2. Validate and update step status
        steps = roadmap.get("steps", [])
        if not (0 <= request.step_index < len(steps)):
            raise HTTPException(status_code=400, detail="Invalid step index")

        roadmap["steps"][request.step_index]["completed"] = True

        # 3. Save back to Supabase
        supabase.table("profiles").update({"career_roadmap": roadmap}).eq("user_id", user_id).execute()

        # 4. HIGH-09 FIX: Non-blocking gamification log — use asyncio.to_thread so this
        #    synchronous DB write does not block the async event loop.
        from app.services.gamification_service import GamificationService
        await asyncio.to_thread(GamificationService.log_activity, user_id, 5)

        return {"status": "success", "roadmap": roadmap}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Step completion error for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update roadmap step")
