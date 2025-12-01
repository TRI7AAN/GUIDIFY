import json
from app.services.gemini_client import ask_gemini, extract_json_from_response

class CareerService:
    @staticmethod
    async def generate_roadmap(current_stream, target_career, current_level="Beginner", availability_hours="10"):
        """
        Generates a hyper-personalized career roadmap using Gemini.
        """
        prompt = f"""
        You are an elite career strategist and technical mentor.
        
        User Profile:
        - Current Background: {current_stream}
        - Target Career: {target_career}
        - Current Proficiency: {current_level}
        - Weekly Availability: {availability_hours} hours

        TASK:
        Create a "Master Career Roadmap" specifically tailored to this user. 
        Since they have {availability_hours} hours/week, adjust the timeline realism accordingly.
        
        The roadmap must be:
        1. **Actionable**: No vague advice like "Learn Python". Instead, say "Complete 'Python for Everybody' on Coursera" or "Build a CLI tool".
        2. **Progressive**: Start from their current level ({current_level}) and bridge the gap to {target_career}.
        3. **Resource-Rich**: Mention specific books, courses (Coursera, Udemy, YouTube), or tools.

        Return a JSON object with this EXACT structure:
        {{
            "title": "Master Plan: {target_career}",
            "summary": "A high-level strategy summary tailored to your background in {current_stream}...",
            "steps": [
                {{ 
                    "title": "Phase 1: [Specific Name]", 
                    "description": "Detailed instructions, specific resources to study, and what to ignore.", 
                    "duration": "X months", 
                    "type": "course" 
                }},
                {{ 
                    "title": "Phase 2: [Project Name]", 
                    "description": "Build a [Specific Project] using [Tech Stack]. Focus on [Key Skill].", 
                    "duration": "X weeks", 
                    "type": "project" 
                }}
                ... (5-7 steps total)
            ]
        }}
        
        "type" options: "course", "project", "certification", "internship", "milestone".
        
        IMPORTANT: Output JSON ONLY. Do not include markdown formatting like ```json.
        """
        
        # Use gemini-2.5-flash-lite for speed
        response = ask_gemini(prompt, model="gemini-2.5-flash-lite")
        result = extract_json_from_response(response)
        
        # Fallback
        if not result or "steps" not in result:
            print("Gemini Roadmap Generation Failed. Using Fallback.")
            return {
                "title": f"Roadmap to {target_career} (Offline Mode)",
                "summary": "We couldn't generate a live plan, but here is a standard path.",
                "steps": [
                    {"title": "Foundations", "description": f"Master the core concepts of {target_career}. Recommended: Coursera Specializations.", "duration": "2 months", "type": "course"},
                    {"title": "First Project", "description": "Build a portfolio project to demonstrate your skills.", "duration": "1 month", "type": "project"},
                    {"title": "Advanced Specialization", "description": "Deep dive into a specific niche within the field.", "duration": "3 months", "type": "course"},
                    {"title": "Professional Networking", "description": "Optimize LinkedIn and connect with industry professionals.", "duration": "4+ months    ", "type": "milestone"}
                ]
            }
            
        return result
