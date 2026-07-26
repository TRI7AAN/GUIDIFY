"""
Career Service

SEC-08 FIX: User-controlled inputs sanitized before AI prompt interpolation.
PERF-02 FIX: Uses ask_gemini_async() for non-blocking execution.
"""

import json
from app.services.gemini_client import ask_gemini_async, extract_json_from_response, _sanitize_user_input


class CareerService:
    @staticmethod
    async def generate_roadmap(current_stream, target_career, current_level="Beginner", availability_hours="10"):
        """
        Generates a hyper-personalized career roadmap using Gemini.
        SEC-08: All user inputs sanitized before prompt interpolation.
        PERF-02: Uses async AI call.
        """
        # SEC-08: Sanitize all user-controlled inputs
        safe_stream = _sanitize_user_input(str(current_stream), max_length=200)
        safe_career = _sanitize_user_input(str(target_career), max_length=200)
        safe_level = _sanitize_user_input(str(current_level), max_length=50)
        # Validate availability hours is a number
        try:
            safe_hours = max(1, min(168, int(availability_hours)))
        except (ValueError, TypeError):
            safe_hours = 10

        prompt = f"""
        You are an elite career strategist and technical mentor.
        
        User Profile:
        - Current Background: {safe_stream}
        - Target Career: {safe_career}
        - Current Proficiency: {safe_level}
        - Weekly Availability: {safe_hours} hours

        TASK:
        Create a "Master Career Roadmap" specifically tailored to this user. 
        Since they have {safe_hours} hours/week, adjust the timeline realism accordingly.
        
        The roadmap must be:
        1. **Actionable**: No vague advice. Mention specific courses and projects.
        2. **Progressive**: Start from their current level and bridge the gap.
        3. **Resource-Rich**: Mention specific books, courses (Coursera, Udemy, YouTube), or tools.

        Return a JSON object with this EXACT structure:
        {{
            "title": "Master Plan: {safe_career}",
            "summary": "A high-level strategy summary...",
            "steps": [
                {{ 
                    "title": "Phase 1: [Specific Name]", 
                    "description": "Detailed instructions...", 
                    "duration": "X months", 
                    "type": "course",
                    "completed": false
                }}
            ]
        }}
        
        "type" options: "course", "project", "certification", "internship", "milestone".
        Generate 5-7 steps.
        
        IMPORTANT: Output JSON ONLY. Do not include markdown formatting like ```json.
        """

        # PERF-02: Non-blocking async call
        response = await ask_gemini_async(prompt, model="gemini-2.5-flash-lite")
        result = extract_json_from_response(response)

        if not result or "steps" not in result:
            return {
                "title": f"Roadmap to {safe_career} (Offline Mode)",
                "summary": "We couldn't generate a live plan, but here is a standard path.",
                "steps": [
                    {"title": "Foundations", "description": f"Master the core concepts of {safe_career}. Recommended: Coursera Specializations.", "duration": "2 months", "type": "course", "completed": False},
                    {"title": "First Project", "description": "Build a portfolio project to demonstrate your skills.", "duration": "1 month", "type": "project", "completed": False},
                    {"title": "Advanced Specialization", "description": "Deep dive into a specific niche within the field.", "duration": "3 months", "type": "course", "completed": False},
                    {"title": "Professional Networking", "description": "Optimize LinkedIn and connect with industry professionals.", "duration": "Ongoing", "type": "milestone", "completed": False}
                ]
            }

        return result
