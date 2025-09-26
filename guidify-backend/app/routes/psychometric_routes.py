from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.psychometric_service import PsychometricService

router = APIRouter()

# Pydantic models for request bodies
class StartTestRequest(BaseModel):
    user_id: str

class AnswerRequest(BaseModel):
    user_id: str
    question_text: str
    selected_option: Dict[str, Any] # Contains text and trait_impact
    previous_responses: List[Dict[str, Any]] # Full history to help AI context

class AnalysisRequest(BaseModel):
    user_id: str
    all_responses: List[Dict[str, Any]]

@router.post("/start")
async def start_test(request: StartTestRequest):
    """
    Starts a new test session and returns baseline questions.
    """
    try:
        # In a real app, we might create a DB record here.
        # For now, we just return the initial questions.
        questions = await PsychometricService.generate_baseline_questions()
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/next")
async def next_question(request: AnswerRequest):
    """
    Receives an answer and returns the next adaptive question.
    """
    try:
        # Append the current answer to history for context
        current_entry = {
            "question": request.question_text,
            "answer": request.selected_option
        }
        history = request.previous_responses + [current_entry]
        
        # Generate next question
        next_q = await PsychometricService.generate_adaptive_question(history)
        return {"next_question": next_q}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-quiz")
async def generate_quiz(request: StartTestRequest):
    """
    Generates a batch of 10 questions for the user.
    """
    try:
        user_profile = {"user_id": request.user_id} 
        response = PsychometricService.generate_quiz_questions(user_profile)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_results(request: AnalysisRequest):
    """
    Analyzes the full session and returns the profile.
    """
    try:
        analysis = await PsychometricService.analyze_personality(request.user_id, request.all_responses)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
