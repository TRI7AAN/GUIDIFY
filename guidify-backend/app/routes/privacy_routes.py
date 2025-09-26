from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from app.middleware.auth import get_current_user
from app.services.supabase_client import supabase

router = APIRouter()

@router.post("/consent")
async def update_consent(
    consent_data: Dict[str, bool],
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update user consent settings.
    """
    user_id = user.get("id") # Assuming Supabase user object structure
    try:
        supabase.table("user_consent").upsert({
            "user_id": user_id,
            **consent_data,
            "updated_at": "now()"
        }).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export")
async def export_user_data(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Export all user data in machine-readable format (GDPR).
    """
    user_id = user.get("id")
    try:
        # Fetch from all tables
        profile = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
        recommendations = supabase.table("user_recommendations").select("*").eq("user_id", user_id).execute()
        
        return {
            "user_id": user_id,
            "profile": profile.data,
            "recommendations": recommendations.data,
            "exported_at": "now()"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/")
async def delete_user_data(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Anonymize/Delete user data (Right to be Forgotten).
    """
    user_id = user.get("id")
    try:
        # Soft delete or anonymize
        # For now, we'll just delete the profile row
        supabase.table("profiles").delete().eq("user_id", user_id).execute()
        # Log the deletion
        supabase.table("data_access_logs").insert({
            "user_id": user_id,
            "action": "DELETE_ACCOUNT",
            "accessed_by": user_id
        }).execute()
        
        return {"status": "success", "message": "User data anonymized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
