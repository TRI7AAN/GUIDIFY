"""
Groq AI Client

MED-04 FIX: Uses settings.GROQ_API_KEY instead of os.environ.get() directly,
  so Pydantic validates the key exists at startup.
HIGH-08 FIX: All print() replaced with structured logger calls.
PERF-04 FIX: Async wrappers added for all methods so FastAPI routes can use
  asyncio.to_thread() to avoid event loop blocking.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from groq import Groq
from app.core.config import settings

logger = logging.getLogger("guidify")


class GroqClient:
    """Wrapper for Groq API client to handle LLM calls."""

    def __init__(self):
        # MED-04 FIX: Use settings.GROQ_API_KEY — validated by Pydantic at startup.
        # Raises a clear ValidationError on startup instead of a confusing ValueError at runtime.
        self.api_key = settings.GROQ_API_KEY
        self.client = Groq(api_key=self.api_key)
        self.default_model = "llama-3.1-8b-instant"

    def generate_text(self, prompt: str, model: Optional[str] = None, temperature: float = 0.7) -> str:
        """
        Generate text using Groq LLM (synchronous).
        PERF-04: Async callers must wrap with await asyncio.to_thread(groq_client.generate_text, ...)
        """
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=model or self.default_model,
                temperature=temperature
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            # HIGH-08 FIX: logger.error instead of print()
            logger.error(f"Groq API call failed (model={model or self.default_model}): {e}")
            return ""

    async def generate_text_async(self, prompt: str, model: Optional[str] = None, temperature: float = 0.7) -> str:
        """
        PERF-04 FIX: Non-blocking async wrapper for generate_text.
        Use this in all async FastAPI route handlers to avoid event loop blocking.
        """
        return await asyncio.to_thread(self.generate_text, prompt, model, temperature)

    def get_college_recommendations(self, marks: int, board: str, stream: str) -> List[str]:
        """Get college recommendations (synchronous). Use get_college_recommendations_async in routes."""
        prompt = f"""
        A student scored {marks}% in their {board} exam with stream {stream}.
        Suggest 5 top colleges in India suitable for them.
        Just give a clean list of college names, one per line.
        """
        response = self.generate_text(prompt, temperature=0.3)
        colleges = [c.strip("-•* \t") for c in response.split("\n") if c.strip()]
        return colleges[:5]

    async def get_college_recommendations_async(self, marks: int, board: str, stream: str) -> List[str]:
        """Non-blocking async version — use in FastAPI routes."""
        return await asyncio.to_thread(self.get_college_recommendations, marks, board, stream)

    def get_job_recommendations(self, skills: List[str], experience: int, role: str) -> List[Dict[str, Any]]:
        """Get job recommendations (synchronous). Use get_job_recommendations_async in routes."""
        import json, re

        skills_text = ", ".join(skills[:15])
        prompt = f"""
        A professional with {experience} years of experience as {role} has skills: {skills_text}

        Suggest 5 suitable job roles with company types and salary ranges.
        Return a JSON array with fields: title, company_type, skills_needed, salary_range, growth_potential
        Output JSON ONLY.
        """
        response = self.generate_text(prompt, temperature=0.3)

        try:
            json_match = re.search(r'\[\s*\{.*\}\s*\]', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            return []
        except Exception as e:
            logger.error(f"Failed to parse Groq job recommendations: {e}")
            return []

    async def get_job_recommendations_async(self, skills: List[str], experience: int, role: str) -> List[Dict[str, Any]]:
        """PERF-04 FIX: Non-blocking async version — use in FastAPI routes."""
        return await asyncio.to_thread(self.get_job_recommendations, skills, experience, role)

    def generate_quiz(self, topic: str, num_questions: int = 5) -> List[Dict[str, Any]]:
        """Generate a quiz on a specific topic (synchronous)."""
        import json, re

        prompt = f"""
        Create a multiple-choice quiz on {topic} with {num_questions} questions.
        Each question has 4 options with one correct answer.
        Return a JSON array with fields: question, options (array of 4 strings), correct_answer (0-3)
        Output JSON ONLY.
        """
        response = self.generate_text(prompt, temperature=0.7)

        try:
            json_match = re.search(r'\[\s*\{.*\}\s*\]', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            return []
        except Exception as e:
            logger.error(f"Failed to parse Groq quiz response: {e}")
            return []

    async def generate_quiz_async(self, topic: str, num_questions: int = 5) -> List[Dict[str, Any]]:
        """Non-blocking async version — use in FastAPI routes."""
        return await asyncio.to_thread(self.generate_quiz, topic, num_questions)


# Singleton instance
groq_client = GroqClient()