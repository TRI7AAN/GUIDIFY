from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from app.services.college_service import CollegeService
from app.utils.helpers import save_uploaded_file, generate_response

router = APIRouter()
college_service = CollegeService()

@router.post("/recommend")
async def recommend_colleges(
    file: UploadFile = File(...),
    board: str = Form(...),
    stream: str = Form(...),
    entrance_marks: Optional[int] = Form(None),
    preference: Optional[str] = Form("General")
):
    """
    Recommend colleges based on academic performance
    
    - **file**: Student's result file (PDF/image)
    - **board**: Education board (CBSE, ICSE, etc.)
    - **stream**: Academic stream (Science, Commerce, Arts)
    - **entrance_marks**: Optional entrance exam marks
    - **preference**: Student preference
    """
    try:
        # Save uploaded file
        file_path = save_uploaded_file(await file.read(), file.filename)
        
        # Get recommendations
        result = college_service.recommend_colleges(
            file_path=file_path,
            board=board,
            stream=stream,
            entrance_marks=entrance_marks,
            preference=preference
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))