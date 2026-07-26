"""
Fresher Routes — CRIT-03 FIX: Added authentication requirement.
HIGH-04 FIX: Replaced random fake company data with real Gemini AI recommendations.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Dict, Any
from app.utils.file_parser import extract_text_from_file, extract_resume_data
from app.utils.helpers import save_uploaded_file
from app.middleware.auth import get_current_user
from app.services.gemini_client import ask_gemini_async, extract_json_from_response, _sanitize_user_input
import logging
import asyncio

logger = logging.getLogger("guidify")
router = APIRouter()


@router.post("/recommend")
async def recommend_jobs(
    file: UploadFile = File(...),
    stream: str = Form(..., max_length=100),
    institute: str = Form(..., max_length=200),
    location: str = Form(..., max_length=200),
    user: Dict[str, Any] = Depends(get_current_user)  # CRIT-03 FIX: Auth required
):
    """
    Recommend jobs for fresh graduates.
    CRIT-03 FIX: Requires authentication.
    HIGH-04 FIX: Uses real Gemini AI — no more random fake company data.
    """
    # Sanitize user-supplied form inputs
    safe_stream = _sanitize_user_input(stream, 100)
    safe_institute = _sanitize_user_input(institute, 200)
    safe_location = _sanitize_user_input(location, 200)

    try:
        # Save and parse uploaded file
        file_path = await save_uploaded_file(file)
        resume_text = extract_text_from_file(file_path)
        profile = extract_resume_data(resume_text)

        skills = profile.get("skills", [])
        safe_skills = [_sanitize_user_input(s, 50) for s in skills[:15]]
        skills_text = ", ".join(safe_skills) if safe_skills else "general skills"

        # HIGH-04 FIX: Real AI-powered recommendations — no random() padding
        prompt = f"""
        A fresh graduate is seeking job opportunities with the following profile:
        - Academic Stream: {safe_stream}
        - Institute: {safe_institute}
        - Preferred Location: {safe_location}
        - Skills: {skills_text}
        - CGPA: {profile.get("cgpa", "not specified")}

        Suggest 5 realistic entry-level job opportunities.
        IMPORTANT: These are AI-generated suggestions for career guidance. Users must verify independently.

        Return JSON with "companies" array, each item having:
        {{
          "name": "Company Name",
          "role": "Entry-level Role Title",
          "salary_range": "range in LPA",
          "tech_stack": ["skill1", "skill2"],
          "why_fit": "Brief reason (max 30 words)",
          "disclaimer": "AI-generated suggestion. Verify with official sources."
        }}
        Output JSON ONLY. No markdown.
        """
        response = await ask_gemini_async(prompt, model="gemini-2.5-flash-lite")
        result = extract_json_from_response(response)
        companies = result.get("companies", []) if result else []

        if not companies:
            raise HTTPException(status_code=503, detail="Could not generate job recommendations. Please try again.")

        return {
            "profile": profile,
            "companies": companies
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fresher recommend error for user {user.get('id')}: {e}")
        raise HTTPException(status_code=500, detail="Failed to process recommendation request")