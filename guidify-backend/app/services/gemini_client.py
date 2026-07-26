"""
Gemini AI Client Module

Provides async-safe helpers for calling the Google Gemini API.
All blocking calls are wrapped with asyncio.to_thread() to avoid
blocking FastAPI's event loop (PERF-02 fix).
"""

import os
import json
import re
import asyncio
from typing import Dict, Any, Optional
from google import genai
from google.genai import types
from app.core.config import settings

# Initialize Gemini client using centralized settings (CQ-01 pattern)
_api_key = settings.GOOGLE_API_KEY
if not _api_key:
    import logging
    logging.getLogger("guidify").warning("GOOGLE_API_KEY not set — AI features will be unavailable")

client = genai.Client(api_key=_api_key)

# Maximum input length to prevent prompt injection via oversized payloads
MAX_PROMPT_INPUT_LENGTH = 4000


def _sanitize_user_input(text: str, max_length: int = 500) -> str:
    """
    Sanitize user-controlled strings before prompt interpolation.
    - Strips leading/trailing whitespace
    - Enforces a maximum character length
    - Removes characters that could be used for prompt injection sequences
    SEC-08 fix: Prevents prompt injection by limiting and sanitizing user input.
    """
    if not text:
        return ""
    # Strip and truncate
    text = text.strip()[:max_length]
    # Remove characters that could break out of prompt context
    text = re.sub(r'[`\'"\\]', '', text)
    return text


def ask_gemini(prompt: str, model: str = "gemini-2.5-flash-lite", system_instruction: str = None) -> str:
    """
    Send a prompt to Gemini synchronously and return the response.
    NOTE: Use ask_gemini_async() from async FastAPI routes to avoid blocking the event loop.
    """
    try:
        config = types.GenerateContentConfig(
            temperature=0.4,
            system_instruction=system_instruction
        )
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config
        )
        return response.text or ""
    except Exception as e:
        import logging
        logging.getLogger("guidify").error(f"Gemini API error: {e}")
        return ""


async def ask_gemini_async(prompt: str, model: str = "gemini-2.5-flash-lite", system_instruction: str = None) -> str:
    """
    Async-safe wrapper around ask_gemini().
    Runs the blocking Gemini call in a thread pool to avoid blocking the event loop.
    PERF-02 fix: Use this from all async FastAPI route handlers.
    """
    return await asyncio.to_thread(ask_gemini, prompt, model, system_instruction)


def ask_gemini_stream(prompt: str, model: str = "gemini-2.5-flash-lite", system_instruction: str = None):
    """
    Send a prompt to Gemini and yield response chunks (Streaming).
    NOTE: This is blocking — only use in dedicated worker threads, not directly in async routes.
    """
    try:
        config = types.GenerateContentConfig(
            temperature=0.4,
            system_instruction=system_instruction
        )
        response = client.models.generate_content_stream(
            model=model,
            contents=prompt,
            config=config
        )
        for chunk in response:
            yield chunk.text
    except Exception as e:
        import logging
        logging.getLogger("guidify").error(f"Gemini stream error: {e}")
        yield ""


def extract_json_from_response(response: str) -> Dict[str, Any]:
    """Extract JSON from LLM response with multiple fallback strategies"""
    if not response:
        return {}
    try:
        return json.loads(response)
    except Exception:
        pass

    # Try to extract JSON block from markdown
    match = re.search(r'```(?:json)?\s*([\s\S]*?)```', response)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except Exception:
            pass

    # Try to find first JSON object in response
    match = re.search(r'\{[\s\S]*\}', response)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass

    return {}
