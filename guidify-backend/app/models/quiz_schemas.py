from typing import List, Optional
from pydantic import BaseModel

# Aptitude Quiz Schemas
class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: int

class GenerateQuizResponse(BaseModel):
    success: bool = True
    questions: List[QuizQuestion] = []
    error: Optional[str] = None

class GradeQuizRequest(BaseModel):
    user_answers: List[int]
    questions: List[dict]

class GradeQuizResponse(BaseModel):
    success: bool = True
    score: int
    total: int
    feedback: str
    error: Optional[str] = None
