"""
Recommender Service

CRIT-04 / MED-08 FIX: Removed `recommend_companies()` sync wrapper that used asyncio.run().
`asyncio.run()` inside an already-running event loop raises RuntimeError under FastAPI.
All callers should use `recommend_companies_async()` directly with `await`.

CQ-01 FIX: Removed duplicate Supabase client initialization.
SEC-08 FIX: User-controlled strings sanitized before AI prompt interpolation.
"""

import json
import os
import asyncio
from typing import List, Dict, Any, Optional
from app.services.gemini_client import ask_gemini, ask_gemini_async, extract_json_from_response, _sanitize_user_input

# CQ-01 FIX: Use the centralized singleton Supabase client
from app.services.supabase_client import supabase_admin as supabase
import logging

logger = logging.getLogger("guidify")

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
def parse_resume(resume_text: str) -> Dict[str, Any]:
    """Extract skills and other information from resume using Gemini."""
    safe_text = resume_text[:8000]
    prompt = f"""
    Extract applicant data from this resume text. Return JSON:
    {{
      "skills": ["..."],
      "cgpa": number | null,
      "summary": "30 words max",
      "years_experience": number | null
    }}
    Resume:
    \"\"\"{safe_text}\"\"\"
    """
    response = ask_gemini(prompt, system_instruction="You are an expert HR AI. Extract data accurately.")
    result = extract_json_from_response(response)
    if not result:
        result = {"skills": [], "cgpa": None, "summary": "", "years_experience": None}
    return result


async def recommend_companies_async(skills: List[str], cgpa: Optional[float], stream: str, institute: str, location: str) -> List[Dict[str, Any]]:
    """
    Get company recommendations from Gemini (async).
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
    response = await ask_gemini_async(prompt, system_instruction="You are a career counselor. Suggest real companies.")
    result = extract_json_from_response(response)
    return result.get("companies", [])


# CRIT-04 / MED-08 FIX: recommend_companies() sync wrapper using asyncio.run() has been REMOVED.
# asyncio.run() inside FastAPI's running event loop raises RuntimeError and crashes the server.
# All callers MUST use: await recommend_companies_async(...)


# ============================
# Course Recommendation Functions
# ============================
def get_course_recommendations(college: str, preference: str) -> List[Dict[str, Any]]:
    """Get course recommendations from Gemini."""
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
    response = ask_gemini(prompt, system_instruction="Provide accurate course info.")
    result = extract_json_from_response(response)
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


def recommend_nsqf_courses(current_tier: str, career_goal: str) -> List[Dict[str, Any]]:
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

    response = ask_gemini(prompt, model="gemini-2.5-flash-lite")
    result = extract_json_from_response(response)
    if not result:
        return []

    return result.get("recommendations", [])