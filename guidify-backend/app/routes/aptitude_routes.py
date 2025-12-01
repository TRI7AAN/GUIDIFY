from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel
from app.services.gemini_client import ask_gemini, extract_json_from_response
from app.utils.helpers import generate_response

router = APIRouter()


@router.get("/quiz")
async def generate_quiz(topic: str, num_questions: int = 5):
    """
    Generate a quiz on a specific topic
    
    - **topic**: Quiz topic
    - **num_questions**: Number of questions to generate
    """
    try:
        prompt = f"Generate a quiz on {topic} with {num_questions} questions. Return JSON with 'questions' list containing 'question', 'options' (list), 'correct_answer' (index)."
        response = ask_gemini(prompt, system_instruction="You are a quiz generator. Output strict JSON.")
        data = extract_json_from_response(response)
        questions = data.get("questions", [])
        return generate_response(data={"questions": questions})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quiz/grade")
async def grade_quiz(user_answers: List[int], questions: List[Dict[str, Any]]):
    """
    Grade a quiz based on user answers
    
    - **user_answers**: List of user's selected answer indices
    - **questions**: List of quiz questions with correct answers
    """
    try:
        # Calculate score
        score = 0
        total = len(questions)
        
        for i, question in enumerate(questions):
            if i < len(user_answers) and user_answers[i] == question.get("correct_answer", 0):
                score += 1
        
        # Generate feedback
        percentage = (score / total) * 100
        if percentage >= 80:
            feedback = "Excellent! You have a strong understanding of this topic."
        elif percentage >= 60:
            feedback = "Good job! You have a decent grasp of the material."
        else:
            feedback = "Keep practicing! You might need to review this topic more."
        
        return generate_response(data={
            "score": score,
            "total": total,
            "percentage": percentage,
            "feedback": feedback
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Payload model for career suggestion
class ScoresPayload(BaseModel):
    scores: Dict[str, int]

@router.post("/career-suggestion")
async def career_suggestion(payload: ScoresPayload):
    """
    Generate an AI-based career suggestion based on aptitude scores.

    - **scores**: Mapping of category to score percentage (0-100)
    """
    try:
        scores = payload.scores or {}
        if not isinstance(scores, dict) or not scores:
            return generate_response(error="Invalid scores payload")

        # Sort categories by score descending
        sorted_items = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_two = [item[0] for item in sorted_items[:2]]

        # Build a concise prompt for Groq
        score_text = ", ".join([f"{k}: {v}%" for k, v in sorted_items])
        primary = top_two[0] if top_two else "Analytical"
        secondary = top_two[1] if len(top_two) > 1 else None

        prompt = f"""
        The user has aptitude scores across categories: {score_text}.
        Based on their strengths (primary: {primary}{', secondary: ' + secondary if secondary else ''}),
        suggest 1-2 suitable career paths and relevant degrees.
        Write a single concise paragraph tailored to these strengths, practical and encouraging.
        Avoid bullet lists. Keep it under 120 words.
        """

        suggestion = ask_gemini(prompt, system_instruction="You are a career counselor. Be concise and encouraging.")

        # Basic fallback if Groq returns an error string
        if not suggestion or suggestion.startswith("Error generating response"):
            # Fallback suggestions by category
            suggestions_map = {
                "Analytical": ("Data Analysis or Engineering", "Computer Science, Mathematics, or Statistics"),
                "Creative": ("Design or Content Creation", "Fine Arts, Digital Media, or Communications"),
                "Social": ("Human Resources or Counseling", "Psychology, Sociology, or Education"),
                "Business": ("Business Management or Marketing", "Business Administration, Economics, or Marketing"),
                "Science": ("Research or Healthcare", "Biology, Chemistry, or Health Sciences"),
            }

            primary_career, primary_degree = suggestions_map.get(primary, suggestions_map["Analytical"])
            if secondary:
                sec_career, _ = suggestions_map.get(secondary, suggestions_map["Analytical"])
                suggestion = (
                    f"Based on your profile, {primary_career} aligns with your {primary.lower()} strengths. "
                    f"Consider degrees like {primary_degree}. Alternatively, {sec_career} could also be a strong fit."
                )
            else:
                suggestion = (
                    f"Based on your profile, {primary_career} aligns with your {primary.lower()} strengths. "
                    f"Consider degrees like {primary_degree}."
                )

        return generate_response(data={"suggestion": suggestion})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))