"""
Employee Routes

CQ-03 FIX: Experience is now extracted from resume data, not hardcoded to 3.
SEC-07 FIX: Route now requires authentication.
SEC-08 FIX: User inputs sanitized before AI usage.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from app.utils.file_parser import extract_text_from_file, extract_resume_data
from app.utils.groq_client import GroqClient
from app.utils.helpers import save_uploaded_file, generate_response
from app.middleware.auth import get_current_user
from app.services.gemini_client import _sanitize_user_input
from typing import Dict, Any

router = APIRouter()
groq_client = GroqClient()


@router.post("/recommend")
async def recommend_roles(
    file: UploadFile = File(...),
    current_role: str = Form(..., max_length=200),
    desired_path: str = Form(..., max_length=200),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Recommend career paths for experienced employees.
    
    CQ-03 FIX: experience extracted from resume data (not hardcoded to 3).
    SEC-07 FIX: Requires authentication.
    SEC-08 FIX: User-controlled form inputs sanitized.
    """
    # SEC-08: Sanitize user inputs
    safe_role = _sanitize_user_input(current_role, max_length=200)
    safe_path = _sanitize_user_input(desired_path, max_length=200)

    try:
        # Save and parse uploaded file
        file_path = save_uploaded_file(await file.read(), file.filename)
        resume_text = extract_text_from_file(file_path)
        resume_data = extract_resume_data(resume_text)

        # CQ-03 FIX: Extract years_experience from resume data
        # extract_resume_data returns a dict that may include years_experience
        experience = resume_data.get("years_experience")
        if experience is None:
            # Fallback: try to infer from summary text or default to None
            experience = resume_data.get("experience_years", None)
        # Ensure experience is a reasonable integer (1–50 years)
        if experience is not None:
            try:
                experience = max(0, min(50, int(experience)))
            except (ValueError, TypeError):
                experience = None

        recommendations = groq_client.get_job_recommendations(
            skills=resume_data.get("skills", []),
            experience=experience,  # CQ-03: Now uses real extracted experience or None
            role=safe_role
        )

        return generate_response(data={
            "current_skills": resume_data.get("skills", []),
            "years_experience": experience,
            "recommended_roles": recommendations,
            "desired_path": safe_path
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))