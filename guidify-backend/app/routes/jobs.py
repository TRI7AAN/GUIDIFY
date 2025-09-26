from fastapi import APIRouter, UploadFile, Form, File, HTTPException, Depends
from typing import Optional, List, Dict, Any
from app.services.ocr import extract_text_from_file, save_upload_file, cleanup_temp_files
from app.services.recommender import parse_resume, recommend_companies
from app.services.supabase_client import store_document_reference
from app.middleware.auth import get_current_user

router = APIRouter()

@router.post("/")
async def recommend_jobs(
    file: UploadFile = File(...),
    stream: str = Form(...),
    institute: str = Form(...),
    location: str = Form(...),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Recommend jobs based on resume and preferences
    
    - **file**: Resume PDF or image
    - **stream**: Academic stream/field
    - **institute**: Educational institution
    - **location**: Preferred job location
    """
    try:
        # Save and process uploaded file
        file_path = await save_upload_file(file)
        resume_text = extract_text_from_file(file_path)
        
        # Parse resume
        profile = parse_resume(resume_text)
        
        # Store document reference in Supabase
        document_metadata = {
            "stream": stream,
            "institute": institute,
            "location": location,
            "skills": profile.get("skills", []),
            "cgpa": profile.get("cgpa")
        }
        
        store_document_reference(
            user_id=user.get("id"),
            document_type="resume",
            document_path=file_path,
            metadata=document_metadata
        )
        
        # Get company recommendations
        companies = recommend_companies(
            profile.get("skills", []),
            profile.get("cgpa"),
            stream,
            institute,
            location
        )
        
        # Clean up temp file
        cleanup_temp_files(file_path)
        
        return {
            "user_name": user.get("user_metadata", {}).get("name", "User"),
            "profile": profile,
            "companies": companies
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")