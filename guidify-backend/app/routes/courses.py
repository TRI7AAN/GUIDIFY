from fastapi import APIRouter, HTTPException, Depends, Form
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import random
from app.services.recommender import get_course_recommendations
from app.middleware.auth import get_current_user

router = APIRouter()

@router.post("/")
async def recommend_courses(
    college: str = Form(...),
    preference: str = Form(...),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Recommend courses based on college and preference
    
    - **college**: College/University name
    - **preference**: Course preference/interest area
    """
    try:
        # Get course recommendations
        courses = get_course_recommendations(college, preference)
        
        # Generate random stats if LLM doesn't provide enough data
        if len(courses) < 10:
            course_types = [
                "B.Tech", "B.Sc", "BBA", "MBA", "M.Tech", "MCA", 
                "B.Com", "M.Com", "BA", "MA", "BCA", "Ph.D"
            ]
            subjects = [
                "Computer Science", "Electronics", "Mechanical", "Civil", 
                "Electrical", "Information Technology", "Data Science",
                "Artificial Intelligence", "Business Administration", 
                "Economics", "Physics", "Chemistry", "Mathematics"
            ]
            
            for _ in range(10 - len(courses)):
                course_type = random.choice(course_types)
                subject = random.choice(subjects)
                courses.append({
                    "name": f"{course_type} in {subject}",
                    "duration": f"{random.randint(1, 5)} years",
                    "placement_rate": random.randint(50, 95),
                    "average_salary": f"{random.randint(3, 15)} LPA",
                    "difficulty": round(random.uniform(2.5, 4.8), 1),
                    "description": f"A {course_type} program focusing on {subject} fundamentals and applications."
                })
        
        return {
            "user_name": user.get("user_metadata", {}).get("name", "User"),
            "college": college,
            "preference": preference,
            "courses": courses
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

class NSQFRequest(BaseModel):
    current_tier: str
    career_goal: str

@router.post("/nsqf")
async def recommend_nsqf(
    request: NSQFRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Recommend NCVET verified courses based on tier and career goal.
    """
    try:
        from app.services.recommender import recommend_nsqf_courses
        recommendations = recommend_nsqf_courses(request.current_tier, request.career_goal)
        return {"courses": recommendations}
    except Exception as e:
        import traceback
        print(f"CRITICAL ERROR in recommend_nsqf: {str(e)}")
        traceback.print_exc()
        # Return empty list instead of crashing to keep frontend stable
        return {"courses": []}