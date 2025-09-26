from fastapi import APIRouter, UploadFile, Form, File, HTTPException, Depends
from typing import Optional, List, Dict, Any
from app.services.ocr import extract_text_from_file, extract_marks, save_upload_file, cleanup_temp_files
from app.services.recommender import get_college_recommendations, generate_random_college_data
from app.services.supabase_client import store_document_reference
from app.middleware.auth import get_current_user

router = APIRouter()

@router.post("/")
async def recommend_colleges(
    file: UploadFile = File(...),
    board: str = Form(...),
    stream: str = Form(...),
    entrance_marks: Optional[int] = Form(None),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Recommend colleges based on marksheet and preferences
    
    - **file**: Marksheet PDF or image
    - **board**: Education board (CBSE, ICSE, etc.)
    - **stream**: Academic stream (Science, Commerce, Arts)
    - **entrance_marks**: Optional entrance exam score
    """
    try:
        # Save and process uploaded file
        file_path = await save_upload_file(file)
        text = extract_text_from_file(file_path)
        marks = extract_marks(text)
        
        # Calculate final marks
        final_marks = (marks + entrance_marks) // 2 if entrance_marks else marks
        
        # Store document reference in Supabase
        document_metadata = {
            "board": board,
            "stream": stream,
            "detected_marks": marks,
            "entrance_marks": entrance_marks,
            "final_marks": final_marks
        }
        
        store_document_reference(
            user_id=user.get("id"),
            document_type="marksheet",
            document_path=file_path,
            metadata=document_metadata
        )
        
        # Get college recommendations
        colleges = get_college_recommendations(final_marks, board, stream)
        results = [generate_random_college_data(c, stream) for c in colleges]
        
        # Clean up temp file after storing reference
        cleanup_temp_files(file_path)
        
        return {
            "user_name": user.get("user_metadata", {}).get("name", "User"),
            "detected_marks": final_marks,
            "board": board,
            "stream": stream,
            "colleges": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")