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
