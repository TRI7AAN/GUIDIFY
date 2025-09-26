from fastapi import APIRouter, HTTPException, Body
from app.services.career_service import CareerService
from pydantic import BaseModel

router = APIRouter()

from app.services.supabase_client import supabase

class RoadmapRequest(BaseModel):
    current_subjects: str
    target_career: str
    current_level: str = "Beginner"
    availability_hours: str = "10"
    user_id: str

@router.post("/roadmap/generate")
async def generate_roadmap(request: RoadmapRequest):
    try:
        # Generate Roadmap
        roadmap = await CareerService.generate_roadmap(
            request.current_subjects, 
            request.target_career,
            request.current_level,
            request.availability_hours
        )
        
        # Save to Supabase
        supabase.table("profiles").update({
            "career_roadmap": roadmap
        }).eq("user_id", request.user_id).execute()
        
        return roadmap
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class StepCompletionRequest(BaseModel):
    user_id: str
    step_index: int

@router.post("/roadmap/complete-step")
async def complete_step(request: StepCompletionRequest):
    try:
        # 1. Fetch current roadmap
        response = supabase.table("profiles").select("career_roadmap").eq("user_id", request.user_id).single().execute()
        if not response.data or not response.data.get("career_roadmap"):
            raise HTTPException(status_code=404, detail="Roadmap not found")
            
        roadmap = response.data["career_roadmap"]
        
        # 2. Update step status
        if 0 <= request.step_index < len(roadmap.get("steps", [])):
            roadmap["steps"][request.step_index]["completed"] = True
            
            # 3. Save back to Supabase
            supabase.table("profiles").update({"career_roadmap": roadmap}).eq("user_id", request.user_id).execute()
            
            # 4. Log Activity (Weight 5 for completing a step)
            from app.services.gamification_service import GamificationService
            GamificationService.log_activity(request.user_id, weight=5)
            
            return {"status": "success", "roadmap": roadmap}
        else:
            raise HTTPException(status_code=400, detail="Invalid step index")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
