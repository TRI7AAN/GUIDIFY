from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.utils.file_parser import extract_text_from_file, extract_resume_data
from app.utils.groq_client import GroqClient
from app.utils.helpers import save_uploaded_file, generate_response

router = APIRouter()
groq_client = GroqClient()

@router.post("/recommend")
async def recommend_roles(
    file: UploadFile = File(...),
    current_role: str = Form(...),
    desired_path: str = Form(...)
):
    """
    Recommend career paths for experienced employees
    
    - **file**: Resume file (PDF/DOCX/TXT)
    - **current_role**: Current job role
    - **desired_path**: Desired career path
    """
    try:
        # Save uploaded file
        file_path = save_uploaded_file(await file.read(), file.filename)
        
        # Extract text from resume
        resume_text = extract_text_from_file(file_path)
        
        # Extract resume data
        resume_data = extract_resume_data(resume_text)
        
        # Get job recommendations
        experience = 3  # Default experience value
        recommendations = groq_client.get_job_recommendations(
            skills=resume_data.get("skills", []),
            experience=experience,
            role=current_role
        )
        
        return generate_response(data={
            "current_skills": resume_data.get("skills", []),
            "missing_skills": [],  # Would need more complex analysis
            "recommended_roles": recommendations
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))