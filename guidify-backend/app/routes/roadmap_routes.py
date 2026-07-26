"""
Roadmap Routes

CRIT-03 FIX: Endpoint now requires authentication.
MED-01 FIX: User inputs sanitized before AI prompt interpolation.
LOW-03 FIX: Uses ask_gemini_async() instead of blocking ask_gemini().
"""

from fastapi import APIRouter, Form, HTTPException, Depends
from typing import Dict, Any
from app.services.gemini_client import ask_gemini_async, _sanitize_user_input
from app.middleware.auth import get_current_user
from app.utils.helpers import generate_response
import logging

logger = logging.getLogger("guidify")
router = APIRouter()


@router.post("/create")
async def create_roadmap(
    subjects: str = Form(..., max_length=500),
    career: str = Form(..., max_length=200),
    user: Dict[str, Any] = Depends(get_current_user)  # CRIT-03 FIX: Auth required
):
    """
    Create a learning roadmap for a career path.
    CRIT-03 FIX: Requires authentication.
    MED-01 FIX: Inputs sanitized before AI prompt interpolation.
    LOW-03 FIX: Non-blocking async AI call.
    """
    # MED-01 FIX: Sanitize all user-controlled inputs
    safe_subjects = _sanitize_user_input(subjects, max_length=500)
    safe_career = _sanitize_user_input(career, max_length=200)

    if not safe_subjects or not safe_career:
        raise HTTPException(status_code=400, detail="Subjects and career are required")

    try:
        # LOW-03 FIX: Use async version to avoid blocking event loop
        roadmap_description = await ask_gemini_async(
            f"Create a detailed learning roadmap for {safe_career} for someone with background in {safe_subjects}. Break it down into steps.",
            system_instruction="You are a mentor. Create a clear, step-by-step roadmap."
        )

        if not roadmap_description:
            raise HTTPException(status_code=503, detail="Could not generate roadmap. Please try again.")

        return generate_response(data={"description": roadmap_description})

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Roadmap creation error for user {user.get('id')}: {e}")
        raise HTTPException(status_code=500, detail="Failed to create roadmap")