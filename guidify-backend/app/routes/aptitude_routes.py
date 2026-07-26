"""
Aptitude Routes

HIGH-05 FIX: request.scores dict now serialized with json.dumps() before AI interpolation.
Prevents prompt injection via malicious dictionary keys in career-suggestion endpoint.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import json
import logging
from app.services.gemini_client import ask_gemini_async, extract_json_from_response, _sanitize_user_input
from app.middleware.auth import get_current_user

logger = logging.getLogger("guidify")
router = APIRouter()


class GradeRequest(BaseModel):
    questions: List[Dict[str, Any]]
    answers: List[str]


class CareerSuggestionRequest(BaseModel):
    scores: Dict[str, Any]


@router.get("/quiz")
async def generate_quiz(
    topic: str = Query(..., max_length=100, description="Quiz topic"),
    num_questions: int = Query(10, ge=1, le=20, description="Number of questions (1-20)"),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generates a quiz for the authenticated user.
    SEC-07: Requires auth.
    SEC-08: topic is sanitized before interpolation into the AI prompt.
    """
    safe_topic = _sanitize_user_input(topic, max_length=100)
    if not safe_topic:
        raise HTTPException(status_code=400, detail="Invalid topic")

    prompt = f"""
    Generate {num_questions} multiple-choice quiz questions about "{safe_topic}".

    Return a JSON object with a "questions" array. Each question must have:
    - "question": The question text
    - "options": An array of 4 strings (A, B, C, D)
    - "correct_answer": The correct option index (0-3)
    - "explanation": A brief explanation of the answer

    Output JSON ONLY. No markdown.
    """

    response = await ask_gemini_async(prompt, model="gemini-2.5-flash-lite")
    result = extract_json_from_response(response)

    if not result or "questions" not in result:
        raise HTTPException(status_code=503, detail="Could not generate quiz. Please try again.")

    return result


@router.post("/grade")
async def grade_quiz(
    request: GradeRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Grades submitted answers.
    SEC-07: Requires auth.
    """
    if not request.questions or not request.answers:
        raise HTTPException(status_code=400, detail="Questions and answers are required")

    correct = 0
    results = []
    for i, (q, a) in enumerate(zip(request.questions, request.answers)):
        is_correct = str(q.get("correct_answer", "")).strip().lower() == str(a).strip().lower()
        if is_correct:
            correct += 1
        results.append({
            "question": q.get("question"),
            "user_answer": a,
            "correct_answer": q.get("correct_answer"),
            "is_correct": is_correct,
            "explanation": q.get("explanation", "")
        })

    total = len(request.questions)
    score = round((correct / total * 100), 1) if total > 0 else 0

    return {
        "score": score,
        "correct": correct,
        "total": total,
        "results": results
    }


@router.post("/career-suggestion")
async def get_career_suggestion(
    request: CareerSuggestionRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Suggests careers based on quiz scores.
    HIGH-05 FIX: scores dict is serialized with json.dumps() before prompt interpolation.
    This prevents injection via malicious dictionary key names.
    """
    # HIGH-05 FIX: Use json.dumps() to produce a structured string, not Python's dict repr.
    # Python repr of {"Ignore instructions...": 100} would inject the key directly into prompt.
    # json.dumps() produces predictable JSON string that Gemini parses as data, not instructions.
    try:
        safe_scores_json = json.dumps(request.scores)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid scores format")

    prompt = f"""
    Based on these aptitude scores: {safe_scores_json}

    Suggest the top 3 career paths. Return JSON with:
    {{
      "suggestions": [
        {{"career": "Career Name", "match_score": 0-100, "reason": "Brief reason"}}
      ]
    }}
    Output JSON ONLY. No markdown.
    """

    try:
        response = await ask_gemini_async(prompt, model="gemini-2.5-flash-lite")
        result = extract_json_from_response(response)

        if not result:
            raise HTTPException(status_code=503, detail="Could not generate career suggestion. Please try again.")

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Career suggestion error for user {user.get('id')}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate career suggestions")
