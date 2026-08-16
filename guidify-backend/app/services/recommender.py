"""
Recommender Service

CRIT-04 / MED-08 FIX: Removed `recommend_companies()` sync wrapper that used asyncio.run().
`asyncio.run()` inside an already-running event loop raises RuntimeError under FastAPI.
All callers should use `recommend_companies_async()` directly with `await`.

CQ-01 FIX: Removed duplicate Supabase client initialization.
SEC-08 FIX: User-controlled strings sanitized before AI prompt interpolation.
Updated to use AI Gateway instead of legacy gemini_client.
"""

import json
import os
import asyncio
from typing import List, Dict, Any, Optional

# CQ-01 FIX: Use the centralized singleton Supabase client
from app.services.supabase_client import db as supabase
from app.ai_gateway.gateway import gateway
import logging

logger = logging.getLogger("guidify")


def _sanitize_user_input(text: str, max_length: int = 200) -> str:
    """Sanitize user input to prevent prompt injection."""
    if not text:
        return ""
    sanitized = text.replace('"', '').replace("'", "").replace("`", "")
    sanitized = ''.join(c for c in sanitized if ord(c) >= 32 or c in '\n\t')
    return sanitized[:max_length]

# Load verified colleges
VERIFIED_COLLEGES_PATH = os.path.join(os.path.dirname(__file__), "../data/verified_colleges.json")
try:
    with open(VERIFIED_COLLEGES_PATH, "r") as f:
        VERIFIED_COLLEGES = json.load(f)
except Exception as e:
    logger.warning(f"Could not load verified colleges data: {e}")
    VERIFIED_COLLEGES = []

# ============================
# College Recommendation Functions
# ============================
# F-29 FIX: get_college_recommendations has no callers and no exposed route —
# DEPRECATED. Retained (not deleted) because the college data + user_recommendations
# cache path is a planned feature; remove wholesale once the roadmap settles.
# NOTE: The sync `supabase.table(...).execute()` calls below are dead code (never
# run) and must not be wired into an async endpoint as-is (blocks the event loop).
def get_college_recommendations(marks: int, board: str, stream: str, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get college recommendations based on verified data + Supabase caching.
    """
    query_type = f"college_list_{stream}_{marks}"

    # Step A: Check Cache
    if user_id:
        try:
            response = supabase.table("user_recommendations")\
                .select("result_data, created_at")\
                .eq("user_id", user_id)\
                .eq("query_type", query_type)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            # Only return cache if it was created within 7 days
            if response.data:
                from datetime import datetime, timezone, timedelta
                cache_age = datetime.now(timezone.utc) - datetime.fromisoformat(response.data[0]["created_at"].replace("Z", "+00:00"))
                if cache_age < timedelta(days=7):
                    return response.data[0]["result_data"]
        except Exception as e:
            logger.warning(f"College cache lookup failed: {e}")

    # Step B: Filter verified data by stream, sort by marks cutoff if available
    filtered_colleges = [c for c in VERIFIED_COLLEGES if c.get("stream", "").lower() == stream.lower()]
    recommendations = filtered_colleges[:5] if filtered_colleges else VERIFIED_COLLEGES[:5]

    # Step C: Save to Cache
    if user_id and recommendations:
        try:
            supabase.table("user_recommendations").insert({
                "user_id": user_id,
                "query_type": query_type,
                "result_data": recommendations
            }).execute()
        except Exception as e:
            logger.warning(f"College cache save failed: {e}")

    return recommendations


# ============================
# Job Recommendation Functions
# ============================
async def parse_resume(resume_text: str) -> Dict[str, Any]:
    """Extract skills and other information from resume using AI Gateway."""
    safe_text = resume_text[:8000]
    try:
        # Use the resume.parse task type which is designed for this
        result = await gateway.generate(
            task_type="resume.parse",
            context={"resume_text": safe_text},
        )
        if not result:
            result = {"skills": [], "cgpa": None, "summary": "", "years_experience": None}
    except Exception as e:
        logger.warning(f"AI Gateway resume parse failed: {e}")
        result = {"skills": [], "cgpa": None, "summary": "", "years_experience": None}
    return result


async def recommend_companies_async(skills: List[str], cgpa: Optional[float], stream: str, institute: str, location: str) -> List[Dict[str, Any]]:
    """
    Get company recommendations from AI Gateway (async).
    SEC-08 FIX: User-controlled inputs sanitized before interpolation.
    """
    safe_stream = _sanitize_user_input(stream, 80)
    safe_institute = _sanitize_user_input(institute, 100)
    safe_location = _sanitize_user_input(location, 100)
    safe_skills = [_sanitize_user_input(s, 50) for s in skills[:15]]
    skills_hint = ", ".join(safe_skills) if safe_skills else "entry-level"

    prompt = f"""
    Context:
    - Skills: {skills_hint}
    - CGPA: {cgpa if cgpa else "unknown"}
    - Stream: {safe_stream}
    - Institute: {safe_institute}
    - Preferred Location: {safe_location}

    Suggest 5 suitable companies for a job seeker with this profile.
    IMPORTANT: This is for guidance only. Real data must be verified by the user.

    Return JSON:
    {{
      "companies": [
        {{
          "name": "Company Name",
          "roles": ["..."],
          "nearest_office": "City near {safe_location}",
          "employment_rating": number,
          "management_rating": number,
          "why_fit": "30 words max",
          "disclaimer": "AI-generated suggestion. Verify with official sources."
        }}
      ]
    }}
    """
    try:
        # F-08 FIX: pass the fully-built prompt via _custom_prompt. Previously the
        # prompt was smuggled through job_description, which the jd_match template
        # truncated to 500 chars and wrapped in an unrelated schema — so the AI
        # never saw these instructions and the "companies" key was always absent.
        response = await gateway.generate(
            task_type="resume.jd_match",
            context={"_custom_prompt": prompt},
        )
        result = response if isinstance(response, dict) else {}
    except Exception as e:
        logger.warning(f"AI Gateway company recommendations failed: {e}")
        result = {}

    return result.get("companies", [])


# CRIT-04 / MED-08 FIX: recommend_companies() sync wrapper using asyncio.run() has been REMOVED.
# asyncio.run() inside FastAPI's running event loop raises RuntimeError and crashes the server.
# All callers MUST use: await recommend_companies_async(...)


# ============================
# Course Recommendation Functions
# ============================
async def get_course_recommendations(college: str, preference: str) -> List[Dict[str, Any]]:
    """Get course recommendations from AI Gateway."""
    safe_college = _sanitize_user_input(college, 100)
    safe_preference = _sanitize_user_input(preference, 100)

    prompt = f"""
    Generate a list of 10 courses at {safe_college}, focused on {safe_preference}.

    Return JSON:
    {{
      "courses": [
        {{
          "name": "Course name",
          "duration": "Duration in years",
          "placement_rate": number,
          "average_salary": "Average salary package",
          "difficulty": number,
          "description": "Brief description"
        }}
      ]
    }}
    """
    try:
        # F-08 FIX: _custom_prompt passthrough (see recommend_companies_async).
        response = await gateway.generate(
            task_type="resume.jd_match",
            context={"_custom_prompt": prompt},
        )
        result = response if isinstance(response, dict) else {}
    except Exception as e:
        logger.warning(f"AI Gateway course recommendations failed: {e}")
        result = {}

    return result.get("courses", [])


# ============================
# NCVET Recommendation Functions
# ============================
NCVET_COURSES = []
try:
    json_path = os.path.join(os.path.dirname(__file__), "../../data/nsqf_courses.json")
    with open(json_path, "r") as f:
        NCVET_COURSES = json.load(f)
except Exception as e:
    logger.warning(f"Could not load NCVET courses: {e}")


async def recommend_nsqf_courses(current_tier: str, career_goal: str) -> List[Dict[str, Any]]:
    """
    Recommend NCVET verified courses based on user tier and career goal.
    SEC-08 FIX: career_goal sanitized before AI prompt interpolation.
    """
    tier_map = {
        "Novice": [3, 4],
        "Apprentice": [5],
        "Adept": [6, 7],
        "Expert": [8, 9, 10],
        "Master": [9, 10]
    }
    target_levels = tier_map.get(current_tier, [3, 4])
    safe_goal = _sanitize_user_input(career_goal, 200)

    courses = []
    try:
        response = supabase.table("verified_courses")\
            .select("*")\
            .in_("nsqf_level", target_levels)\
            .execute()
        courses = response.data or []
    except Exception as e:
        logger.warning(f"DB fetch for NCVET courses failed: {e}")

    if not courses:
        courses = [c for c in NCVET_COURSES if c.get("nsqf_level") in target_levels]

    if not courses:
        return []

    simplified = [
        {"name": c.get("course_name"), "level": c.get("nsqf_level"), "sector": c.get("sector", "General")}
        for c in courses[:30]
    ]

    prompt = f"""
    Select top 3 NCVET courses for:
    - Level: {current_tier} (NSQF {target_levels})
    - Goal: {safe_goal}

    Options:
    {json.dumps(simplified)}

    Return JSON:
    {{
        "recommendations": [
            {{
                "course_name": "Exact Name",
                "nsqf_level": int,
                "certification_body": "NCVET",
                "duration_hours": 100,
                "reason": "Brief reason"
            }}
        ]
    }}
    """

    try:
        # F-08 FIX: _custom_prompt passthrough (see recommend_companies_async).
        response = await gateway.generate(
            task_type="resume.jd_match",
            context={"_custom_prompt": prompt},
        )
        result = response if isinstance(response, dict) else {}
    except Exception as e:
        logger.warning(f"AI Gateway NCVET recommendations failed: {e}")
        result = {}

    return result.get("recommendations", [])