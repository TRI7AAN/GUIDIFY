import json
from app.services.gemini_client import ask_gemini, extract_json_from_response

class PsychometricService:
    @staticmethod
    async def generate_baseline_questions():
        """
        Returns a static set of 5 warm-up questions for instant loading.
        """
        # Hardcoded for speed (0ms latency vs 3s+ with AI)
        return [
            {
                "question_text": "When you encounter a difficult problem, what is your first instinct?",
                "question_type": "multiple_choice",
                "options": [
                    {"text": "Break it down into logical steps", "trait_impact": "Analytical"},
                    {"text": "Ask others for their input", "trait_impact": "Social"},
                    {"text": "Look for a creative workaround", "trait_impact": "Creative"},
                    {"text": "Just dive in and learn by doing", "trait_impact": "Action-Oriented"}
                ]
            },
            {
                "question_text": "How do you prefer to work on a project?",
                "question_type": "multiple_choice",
                "options": [
                    {"text": "Alone, so I can focus deeply", "trait_impact": "Introversion"},
                    {"text": "In a team, bouncing ideas off others", "trait_impact": "Extroversion"},
                    {"text": "Leading the group and setting goals", "trait_impact": "Leadership"},
                    {"text": "Following a clear plan set by others", "trait_impact": "Conscientiousness"}
                ]
            },
            {
                "question_text": "What motivates you the most?",
                "question_type": "multiple_choice",
                "options": [
                    {"text": "Achieving a high score or rank", "trait_impact": "Achievement"},
                    {"text": "Understanding how things work", "trait_impact": "Curiosity"},
                    {"text": "Helping others succeed", "trait_impact": "Altruism"},
                    {"text": "Creating something unique", "trait_impact": "Creativity"}
                ]
            },
            {
                "question_text": "If your plan fails, what do you do?",
                "question_type": "multiple_choice",
                "options": [
                    {"text": "Analyze what went wrong and retry", "trait_impact": "Resilience"},
                    {"text": "Feel discouraged and switch tasks", "trait_impact": "Low Resilience"},
                    {"text": "Ask for help immediately", "trait_impact": "Dependency"},
                    {"text": "Pivot to a completely new idea", "trait_impact": "Adaptability"}
                ]
            },
            {
                "question_text": "Which environment makes you most productive?",
                "question_type": "multiple_choice",
                "options": [
                    {"text": "A quiet room with no distractions", "trait_impact": "Focus"},
                    {"text": "A busy cafe with background noise", "trait_impact": "Stimulation"},
                    {"text": "A collaborative space with friends", "trait_impact": "Social"},
                    {"text": "Outdoors or in nature", "trait_impact": "Freedom"}
                ]
            }
        ]

    @staticmethod
    async def generate_adaptive_question(previous_responses):
        """
        Generates a single adaptive question based on the user's previous answers.
        Uses Gemini Flash for speed.
        """
        # Format history for the prompt
        history_text = json.dumps(previous_responses, indent=2)
        
        prompt = f"""
        You are an expert psychometrician. Here is the user's Q&A history so far:
        {history_text}
        
        Based on this, generate ONE new multiple-choice question to probe deeper into an area where the user's personality is still ambiguous or interesting.
        Focus on: Grit, Resilience, Openness, or Emotional Intelligence.
        
        Return a JSON object (NOT an array) with:
        - "question_text": The question string.
        - "options": An array of 4 options, each with "text" and "trait_impact".
        - "question_type": "multiple_choice"
        - "reasoning": A short string explaining why you asked this question.
        """
        
        # Use gemini-1.5-flash for faster response
        response = ask_gemini(prompt, model="gemini-2.5-flash-lite")
        result = extract_json_from_response(response)
        
        # Validation and Fallback
        if not result or "question_text" not in result:
            print("WARNING: AI failed to generate question. Using fallback.")
            return {
                "question_text": "When working on a team project, what role do you naturally take?",
                "question_type": "multiple_choice",
                "options": [
                    {"text": "The leader who organizes everything", "trait_impact": "Leadership"},
                    {"text": "The creative who generates ideas", "trait_impact": "Creativity"},
                    {"text": "The implementer who gets things done", "trait_impact": "Conscientiousness"},
                    {"text": "The mediator who resolves conflicts", "trait_impact": "Agreeableness"}
                ],
                "reasoning": "Fallback question due to AI generation failure."
            }
            
        return result

    @staticmethod
    def generate_quiz_questions(user_profile):
        """
        Generates a batch of 10 adaptive questions based on user profile.
        Uses gemini-2.5-flash-lite for speed.
        """
        prompt = f"""
        You are an expert career counselor and psychometrician.
        User Profile: {json.dumps(user_profile)}
        
        Generate 10 psychometric multiple-choice questions to assess this student's aptitude, personality, and career interests.
        
        Return a JSON object with a key "questions" containing a list of 10 questions.
        Each question must have:
        - "question_text": String
        - "options": Array of 4 objects {{"text": "...", "trait_impact": "..."}}
        - "question_type": "multiple_choice"
        
        Output JSON ONLY. No markdown.
        """
        
        # Use gemini-2.5-flash-lite for maximum speed
        response = ask_gemini(prompt, model="gemini-2.5-flash-lite")
        result = extract_json_from_response(response)
        
        # Validation
        if not result or "questions" not in result or len(result["questions"]) < 5:
            print("WARNING: AI failed to generate batch. Returning empty.")
            return {"questions": []}
            
        return result

    @staticmethod
    async def analyze_personality(user_id, all_responses):
        """
        Performs the final deep-dive analysis on the full session and saves to DB.
        """
        from app.services.supabase_client import supabase

        history_text = json.dumps(all_responses, indent=2)
        
        prompt = f"""
        You are a world-class behavioral psychologist. Analyze the following Q&A session from a student:
        {history_text}
        
        Generate a highly detailed personality profile.
        
        Return a JSON object with the following structure:
        {{
          "traits": {{ "Analytical": <0-100>, "Creative": <0-100>, "Social": <0-100>, "Technical": <0-100>, "Leadership": <0-100> }},
          "summary": "One sentence summary...",
          "top_careers": ["Data Scientist", "AI Engineer", "Product Manager"]
        }}
        """
        
        # Try with requested model, fallback to 1.5-flash if it fails
        try:
            response = ask_gemini(prompt, model="gemini-2.5-flash-lite")
        except Exception as e:
            print(f"Model gemini-2.5-flash-lite failed: {e}. Falling back to gemini-1.5-flash")
            response = ask_gemini(prompt, model="gemini-1.5-flash")
            
        analysis_result = extract_json_from_response(response)
        
        # Fallback if JSON extraction fails
        if not analysis_result:
            print("JSON extraction failed. Using fallback analysis.")
            analysis_result = {
                "traits": { "Analytical": 75, "Creative": 65, "Social": 70, "Technical": 80, "Leadership": 60 },
                "summary": "You are a balanced thinker with a strong aptitude for problem-solving and innovation.",
                "top_careers": ["Software Engineer", "Data Analyst", "Project Manager"]
            }
        
        # Save to personality_profiles table (detailed record)
        supabase.table("personality_profiles").upsert(data, on_conflict="user_id").execute()
        
        # SYNC TO PROFILES TABLE (For Dashboard Visibility)
        # The dashboard reads from 'profiles', so we must mirror the key data there.
        profile_update = {
            "category_scores": analysis_result.get("traits"),
            "career_suggestion": analysis_result.get("summary"),
            "updated_at": "now()"
        }
        supabase.table("profiles").update(profile_update).eq("user_id", user_id).execute()
                
            except Exception as e:
                print(f"Error saving to Supabase: {e}")
        
        return analysis_result
