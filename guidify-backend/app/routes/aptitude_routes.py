from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.utils.groq_client import GroqClient
from app.utils.helpers import generate_response

router = APIRouter()
groq_client = GroqClient()

@router.get("/quiz")
async def generate_quiz(topic: str, num_questions: int = 5):
    """
    Generate a quiz on a specific topic
    
    - **topic**: Quiz topic
    - **num_questions**: Number of questions to generate
    """
    try:
        questions = groq_client.generate_quiz(topic, num_questions)
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