import json
import os
from typing import List, Dict, Any, Optional
from app.services.gemini_client import ask_gemini, extract_json_from_response
from supabase import create_client, Client

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# Load verified colleges
VERIFIED_COLLEGES_PATH = os.path.join(os.path.dirname(__file__), "../data/verified_colleges.json")
try:
    with open(VERIFIED_COLLEGES_PATH, "r") as f:
        VERIFIED_COLLEGES = json.load(f)
except Exception as e:
    print(f"Error loading verified colleges: {e}")
    VERIFIED_COLLEGES = []

# ============================
# College Recommendation Functions
# ============================
def get_college_recommendations(marks: int, board: str, stream: str, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get college recommendations based on verified data.
    Uses Supabase caching if user_id is provided.
    """
    query_type = f"college_list_{stream}_{marks}"
    
    # Step A: Check Cache
    if user_id:
        try:
            response = supabase.table("user_recommendations")\
                .select("result_data")\
                .eq("user_id", user_id)\
                .eq("query_type", query_type)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if response.data:
                print("Returning cached college recommendations")
                return response.data[0]["result_data"]
        except Exception as e:
            print(f"Cache lookup failed: {e}")

    # Step B: Generate (Filter Verified Data)
    # Simple filtering logic based on stream and marks (mock logic for "cutoff")
    filtered_colleges = [
        c for c in VERIFIED_COLLEGES 
        if c.get("stream", "").lower() == stream.lower()
    ]
    
    # If marks are high, show top colleges, else show others (simplified)
    # In a real app, this would be more complex.
    # For now, we return top 5 matching stream.
    recommendations = filtered_colleges[:5]
    
    if not recommendations:
        # Fallback if no exact stream match
        recommendations = VERIFIED_COLLEGES[:5]

    # Step C: Save to Cache
    if user_id:
        try:
            supabase.table("user_recommendations").insert({
                "user_id": user_id,
                "query_type": query_type,
                "result_data": recommendations
            }).execute()
        except Exception as e:
            print(f"Cache save failed: {e}")

    return recommendations

# ============================
# Job Recommendation Functions
# ============================
def parse_resume(resume_text: str) -> Dict[str, Any]:
    """Extract skills and other information from resume using Gemini"""
    prompt = f"""
    Extract applicant data from this resume text. Return JSON:
    {{
      "skills": ["..."],
      "cgpa": number | null,
      "summary": "≤ 30 words"
    }}
    Resume:
    \"\"\"{resume_text[:10000]}\"\"\"
    """
    
    response = ask_gemini(prompt, system_instruction="You are an expert HR AI. Extract data accurately.")
    result = extract_json_from_response(response)
    
    if not result:
        result = {"skills": [], "cgpa": None, "summary": ""}
    
    return result

def recommend_companies(skills: List[str], cgpa: Optional[float], stream: str, institute: str, location: str) -> List[Dict[str, Any]]:
    """Get company recommendations from Gemini"""
    skills_hint = ", ".join(skills[:15]) if skills else "entry-level"
    
    prompt = f"""
    Context:
    - Skills: {skills_hint}
    - CGPA: {cgpa if cgpa else "unknown"}
    - Stream: {stream}
    - Institute: {institute}
    - Preferred Location: {location}
    
    For each company, include nearest office location relative to {location}.
    
    Return JSON:
    {{
      "companies": [
        {{
          "name": "Company Name",
          "roles": ["..."],
          "nearest_office": "Nearest office to {location}",
          "employment_rating": number,
          "management_rating": number,
          "why_fit": "≤ 30 words"
        }}
      ]
    }}
    """
    response = ask_gemini(prompt, system_instruction="You are a career counselor. Suggest real companies.")
    result = extract_json_from_response(response)
    
    return result.get("companies", [])

# ============================
# Course Recommendation Functions
# ============================
def get_course_recommendations(college: str, preference: str) -> List[Dict[str, Any]]:
    """Get course recommendations from Gemini"""
    prompt = f"""
    Generate a list of 10 courses offered at {college} with placement ratings.
    Focus on {preference} related courses if applicable.
    
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
# Load NCVET courses once at module level
NCVET_COURSES = []
try:
    json_path = os.path.join(os.path.dirname(__file__), "../data/nsqf_courses.json")
    with open(json_path, "r") as f:
        NCVET_COURSES = json.load(f)
except Exception as e:
    print(f"Error loading NCVET courses: {e}")

# ============================
# NCVET Recommendation Functions
# ============================
def recommend_nsqf_courses(current_tier: str, career_goal: str) -> List[Dict[str, Any]]:
    """
    Recommend NCVET verified courses based on user tier and career goal.
    """
    # 1. Map Tier to NSQF Levels
    tier_map = {
        "Novice": [3, 4],
        "Apprentice": [5],
        "Adept": [6, 7],
        "Expert": [8, 9, 10],
        "Master": [9, 10]
    }
    target_levels = tier_map.get(current_tier, [3, 4]) # Default to Novice
    
    # 2. Fetch Verified Courses (DB or JSON Fallback)
    courses = []
    # Try DB first (optional, can comment out if DB is slow/empty)
    # try:
    #     response = supabase.table("verified_courses").select("*").in_("nsqf_level", target_levels).execute()
    #     courses = response.data
    # except Exception as e:
    #     print(f"DB Fetch failed: {e}")
        
    if not courses:
        # Use pre-loaded JSON data
        courses = [c for c in NCVET_COURSES if c.get("nsqf_level") in target_levels]

    if not courses:
        return []

    # 3. Use Gemini to Select Best Matches
    # Limit context size: Send only relevant fields and max 20 courses
    simplified_courses = [
        {
            "name": c.get("course_name"),
            "level": c.get("nsqf_level"),
            "sector": c.get("sector", "General")
        } 
        for c in courses[:30] # Limit to 30 to prevent token overflow
    ]
    
    courses_str = json.dumps(simplified_courses)
    
    prompt = f"""
    Select top 3 NCVET courses for:
    - Level: {current_tier} (NSQF {target_levels})
    - Goal: {career_goal}
    
    Options:
    {courses_str}
    
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
    
    # Use Flash model for speed
    response = ask_gemini(prompt, model="gemini-2.5-flash-lite")
    result = extract_json_from_response(response)
    
    if not result:
        return []

    return result.get("recommendations", [])