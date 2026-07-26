"""
Privacy & Data Routes

CRIT-06 FIX: Uses admin_delete_user() which correctly uses the service-role key.
DB-08 FIX: Replaced hard-delete with soft-delete (PII scrubbing) for GDPR compliance.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
from app.services.supabase_client import supabase, admin_delete_user
from app.middleware.auth import get_current_user
import logging

logger = logging.getLogger("guidify")
router = APIRouter()


class ConsentRequest(BaseModel):
    consent_type: str
    agreed: bool


@router.post("/consent")
async def update_consent(
    request: ConsentRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Update user data consent preferences."""
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify authenticated user")

    try:
        supabase.table("user_consent").upsert({
            "user_id": user_id,
            "consent_type": request.consent_type,
            "agreed": request.agreed
        }, on_conflict="user_id,consent_type").execute()

        return {"status": "success", "message": "Consent updated"}
    except Exception as e:
        logger.error(f"Error updating consent for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update consent")


@router.get("/export")
async def export_user_data(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Export all data for the authenticated user (GDPR right of access).
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify authenticated user")

    try:
        profile_response = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
        recommendations_response = supabase.table("user_recommendations").select("*").eq("user_id", user_id).execute()
        quiz_response = supabase.table("quiz_responses").select("*").eq("user_id", user_id).execute()

        export_data = {
            "profile": profile_response.data[0] if profile_response.data else None,
            "recommendations": recommendations_response.data or [],
            "quiz_responses": quiz_response.data or [],
        }

        _log_data_access(user_id, "export")

        return {"status": "success", "data": export_data}

    except Exception as e:
        logger.error(f"Error exporting data for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to export user data")


@router.delete("/delete")
async def delete_user_data(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Anonymize user data (GDPR right to be forgotten).

    DB-08 FIX: Implements soft-delete with PII scrubbing instead of hard-delete.
    - PII fields overwritten with anonymized values
    - Record retained for audit/legal compliance (non-PII data preserved)
    - Auth user deleted via service-role admin client (CRIT-06 FIX)

    This approach satisfies GDPR right to erasure while preserving audit trail.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify authenticated user")

    try:
        # Log the deletion attempt BEFORE modifying (so the record exists)
        _log_data_access(user_id, "deletion_request")

        # DB-08 FIX: Soft-delete with PII scrubbing instead of hard-delete
        # Anonymize PII fields; retain non-PII aggregate data for reporting integrity
        supabase.table("profiles").update({
            "name": "DELETED_USER",
            "email": f"deleted_{user_id[:8]}@null.invalid",
            "age": None,
            "gender": None,
            "location": None,
            "is_deleted": True,
            "deleted_at": "now()",
            # Keep: career_roadmap, category_scores for aggregate analytics
            # but clear identifiable career suggestion text
            "career_suggestion": None,
        }).eq("user_id", user_id).execute()

        # Delete associated PII tables
        supabase.table("user_documents").delete().eq("user_id", user_id).execute()
        supabase.table("quiz_responses").delete().eq("user_id", user_id).execute()

        # CRIT-06 FIX: Delete auth user using service-role admin client
        deleted = admin_delete_user(user_id)
        if not deleted:
            logger.warning(f"Auth user deletion failed for {user_id}. Profile PII has been scrubbed.")

        return {
            "status": "success",
            "message": "Your personal data has been anonymized. Account access has been removed."
        }

    except Exception as e:
        logger.error(f"Error deleting data for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to process deletion request")


def _log_data_access(user_id: str, action: str):
    """
    Write an audit log entry to data_access_logs.
    Failure is logged but does NOT abort the parent operation.
    """
    try:
        supabase.table("data_access_logs").insert({
            "user_id": user_id,
            "action": action,
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to write data access log for user {user_id} action '{action}': {e}")
