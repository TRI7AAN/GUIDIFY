from typing import List, Dict, Any, Optional
from app.utils.file_parser import extract_text_from_file, extract_marks
from app.utils.groq_client import GroqClient

class CollegeService:
    """Service for college and course recommendations"""
    
    def __init__(self):
        self.groq_client = GroqClient()
    
    def recommend_colleges(self, file_path: str, board: str, stream: str, 
                          entrance_marks: Optional[int] = None, 
                          preference: Optional[str] = "General") -> Dict[str, Any]:
        """
        Recommend colleges based on academic performance
        
        Args:
            file_path: Path to uploaded result file
            board: Education board (CBSE, ICSE, etc.)
            stream: Academic stream (Science, Commerce, Arts)
            entrance_marks: Optional entrance exam marks
            preference: Student preference
            
        Returns:
            Dictionary with college recommendations
        """
        try:
            # Extract text and marks from result file
            text = extract_text_from_file(file_path)
            marks = extract_marks(text)
            
            # If no marks detected and no entrance marks provided, return error
            if marks is None and entrance_marks is None:
                return {
                    "success": False,
                    "data": [],
                    "detected_marks": None,
                    "error": "Could not extract marks from the uploaded file. Please provide entrance exam marks or upload a file with clear percentage/score information."
                }
            
            # Calculate final marks (average with entrance if provided)
            if entrance_marks:
                final_marks = entrance_marks if marks is None else (marks + entrance_marks) // 2
            else:
                final_marks = marks
            
            # Get college recommendations from LLM
            colleges = self.groq_client.get_college_recommendations(final_marks, board, stream)
            
            return {
                "success": True,
                "data": colleges,
                "detected_marks": final_marks,
                "error": None
            }
            
        except Exception as e:
            return {
                "success": False,
                "data": [],
                "detected_marks": None,
                "error": f"Error recommending colleges: {str(e)}"
            }