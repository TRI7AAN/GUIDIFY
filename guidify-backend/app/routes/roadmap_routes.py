from fastapi import APIRouter, Form, HTTPException
from app.utils.groq_client import GroqClient
from app.utils.helpers import generate_response

router = APIRouter()
groq_client = GroqClient()

@router.post("/create")
async def create_roadmap(
    subjects: str = Form(...),
    career: str = Form(...)
):
    """
    Create a learning roadmap for a career path
    
    - **subjects**: Current subjects or skills
    - **career**: Target career
    """
    try:
        roadmap_description = groq_client.create_roadmap(subjects, career)
        return generate_response(data={"description": roadmap_description})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))