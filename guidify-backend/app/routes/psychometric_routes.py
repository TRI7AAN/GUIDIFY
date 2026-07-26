"""
Psychometric Routes

SEC-03 FIX: user_id sourced from JWT (get_current_user), not request body.
SEC-07 FIX: All endpoints now require authentication (previously unauthenticated).
PERF-02 FIX: AI calls use ask_gemini_async() to avoid blocking the event loop.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.psychometric_service import PsychometricService
from app.middleware.auth import get_current_user

router = APIRouter()


class AnswerRequest(BaseModel):
    question_text: str
    selected_option: Dict[str, Any]
    previous_responses: List[Dict[str, Any]]


class AnalysisRequest(BaseModel):
    all_responses: List[Dict[str, Any]]


@router.post("/start")
async def start_test(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Starts a new test session and returns baseline questions.
    SEC-07: Now requires auth to prevent free AI quota abuse.
    SEC-03: user_id sourced from JWT.
    """
    try:
        questions = await PsychometricService.generate_baseline_questions()
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/next")
async def next_question(
    request: AnswerRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Receives an answer and returns the next adaptive question.
    SEC-07: Now requires auth to prevent free AI quota abuse.
    """
    try:
        current_entry = {
            "question": request.question_text,
            "answer": request.selected_option
        }
        history = request.previous_responses + [current_entry]

        next_q = await PsychometricService.generate_adaptive_question(history)
        return {"next_question": next_q}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-quiz")
async def generate_quiz(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Generates a batch of 10 questions for the authenticated user.
    SEC-03: user_id sourced from JWT.
    SEC-07: Requires auth to prevent AI quota abuse.
    PERF-01 (partial): generate_quiz_questions is now async-compatible.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify authenticated user")

    try:
        user_profile = {"user_id": user_id}
        response = await PsychometricService.generate_quiz_questions_async(user_profile)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
async def analyze_results(
    request: AnalysisRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyzes the full session and saves the profile.
    SEC-03: user_id sourced from JWT, not request body.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify authenticated user")

    try:
        analysis = await PsychometricService.analyze_personality(user_id, request.all_responses)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
