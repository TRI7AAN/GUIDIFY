import random
from typing import List, Dict, Any, Optional
from app.services.groq_client import ask_groq, extract_json_from_response

# ============================
# College Recommendation Functions
# ============================
def generate_random_college_data(college_name: str, stream: str) -> Dict[str, Any]:
    """Generate random metadata for colleges"""
    rating = round(random.uniform(2.5, 5.0), 2)
    placement_rate = random.randint(40, 95)
    management_rating = round(random.uniform(3.0, 5.0), 2)
    courses = {
        "Science": ["B.Tech - 4 years", "B.Sc - 3 years", "MBBS - 5.5 years"],
        "Commerce": ["B.Com - 3 years", "CA - 3 years", "BBA - 3 years"],
        "Arts": ["BA - 3 years", "BFA - 4 years", "B.Ed - 2 years"]
    }
    return {
        "college": college_name,
        "course": random.choice(courses.get(stream, ["General Studies - 3 years"])),
        "rating": rating,
        "placement_rate": f"{placement_rate}%",
        "management_rating": management_rating
    }

def get_college_recommendations(marks: int, board: str, stream: str) -> List[str]:
    """Get college recommendations from LLM"""
    prompt = f"""
    A student scored {marks}% in their {board} exam with stream {stream}.
    Suggest 5 top colleges in India suitable for them.
    Just give clean list of college names.
    """
    response = ask_groq(prompt)
    colleges = [c.strip("-•* ") for c in response.split("\n") if c.strip()]
    return colleges[:5]

# ============================
# Job Recommendation Functions
# ============================
def parse_resume(resume_text: str) -> Dict[str, Any]:
    """Extract skills and other information from resume"""
    prompt = f"""
Extract applicant data from this resume text. Return JSON:
{{
  "skills": ["..."],
  "cgpa": number | null,
  "summary": "≤ 30 words"
}}
Resume:
\"\"\"{resume_text[:5000]}\"\"\""""
    
    response = ask_groq(prompt)
    result = extract_json_from_response(response)
    
    # Ensure we have the expected structure
    if not result:
        result = {"skills": [], "cgpa": None, "summary": ""}
    
    return result

def recommend_companies(skills: List[str], cgpa: Optional[float], stream: str, institute: str, location: str) -> List[Dict[str, Any]]:
    """Get company recommendations from LLM"""
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
    response = ask_groq(prompt)
    result = extract_json_from_response(response)
    
    return result.get("companies", [])

# ============================
# Course Recommendation Functions
# ============================
def get_course_recommendations(college: str, preference: str) -> List[Dict[str, Any]]:
    """Get course recommendations from LLM"""
    prompt = f"""
Generate a list of 30+ courses offered at {college} with placement ratings.
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
    response = ask_groq(prompt)
    result = extract_json_from_response(response)
    
    return result.get("courses", [])