from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from app.middleware.auth import get_current_user

router = APIRouter()

@router.get("/learner/{user_id}")
async def get_learner_dashboard(user_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get learner dashboard data: progress, recommended courses, skill gaps.
    """
    # Mock data for now
    return {
        "user_id": user_id,
        "progress": {
            "completed_courses": 2,
            "ongoing_courses": 1,
            "hours_spent": 15.5
        },
        "skill_gaps": ["Python Advanced", "System Design"],
        "recommended_paths": [
            {"title": "Full Stack Developer", "match": 0.85},
            {"title": "Data Scientist", "match": 0.70}
        ],
        "recent_activity": [
            {"date": "2025-11-29", "action": "Completed Quiz: Python Basics"},
            {"date": "2025-11-30", "action": "Viewed Course: React Native"}
        ]
    }

@router.get("/trainer/{trainer_id}")
async def get_trainer_dashboard(trainer_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get trainer dashboard data: cohort analytics.
    """
    return {
        "trainer_id": trainer_id,
        "cohorts": [
            {"id": "c1", "name": "Batch A - Python", "students": 25, "avg_progress": 60},
            {"id": "c2", "name": "Batch B - Web Dev", "students": 30, "avg_progress": 45}
        ],
        "pending_reviews": 5,
        "student_performance": {
            "top_performers": ["Alice", "Bob"],
            "needs_attention": ["Charlie", "Dave"]
        }
    }

@router.get("/policy")
async def get_policy_dashboard(region: str = "All", period: str = "Q4-2025", user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get policy dashboard data: LMI, adoption metrics.
    """
    return {
        "region": region,
        "period": period,
        "adoption_metrics": {
            "total_learners": 15000,
            "active_learners": 8500,
            "course_completions": 3200
        },
        "skill_demand_supply": [
            {"skill": "Python", "demand": 80, "supply": 60},
            {"skill": "Data Analysis", "demand": 70, "supply": 40},
            {"skill": "Cloud Computing", "demand": 90, "supply": 30}
        ],
        "nsqf_distribution": {
            "Level 4": 4000,
            "Level 5": 3000,
            "Level 6": 1000
        }
    }
