from fastapi import APIRouter, Form, HTTPException
from app.services.gemini_client import ask_gemini
from app.utils.helpers import generate_response

router = APIRouter()


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
        prompt = f"Create a detailed learning roadmap for {career} for someone with background in {subjects}. Break it down into steps."
        roadmap_description = ask_gemini(prompt, system_instruction="You are a mentor. Create a clear, step-by-step roadmap.")

        return generate_response(data={"description": roadmap_description})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))