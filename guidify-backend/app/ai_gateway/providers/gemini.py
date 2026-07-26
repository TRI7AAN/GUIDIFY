"""
Gemini AI Provider

Wraps the Google Generative AI SDK (google.genai) behind the AIProvider interface.
Per techspec.md §3.1: Default cloud provider for all AI Gateway tasks.

Uses asyncio.to_thread() for async-safe operation since the SDK is synchronous.
"""

import asyncio
import logging
from typing import Optional

from google import genai
from google.genai import types

from app.core.config import settings
from app.ai_gateway.providers.base import AIProvider

logger = logging.getLogger("guidify.ai_gateway.gemini")


class GeminiProvider(AIProvider):
    """
    Google Gemini AI provider.

    Wraps the google.genai SDK and exposes the standard AIProvider interface.
    All blocking SDK calls are run in a thread pool to avoid blocking
    FastAPI's async event loop.
    """

    def __init__(self):
        api_key = settings.GOOGLE_API_KEY
        if not api_key:
            logger.warning("GOOGLE_API_KEY not set — Gemini calls will fail")
        self._client = genai.Client(api_key=api_key)
        self._default_model = settings.GEMINI_MODEL

    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: Optional[str] = None,
    ) -> str:
        """
        Send a prompt to Gemini and return the response text.

        Runs the blocking SDK call in a thread pool (asyncio.to_thread)
        to avoid blocking the event loop.
        """
        target_model = model or self._default_model

        def _sync_call() -> str:
            try:
                config = types.GenerateContentConfig(
                    temperature=0.4,
                    system_instruction=system_instruction,
                )
                response = self._client.models.generate_content(
                    model=target_model,
                    contents=prompt,
                    config=config,
                )
                return response.text or ""
            except Exception as e:
                logger.error(f"Gemini API error (model={target_model}): {e}")
                raise

        return await asyncio.to_thread(_sync_call)

    def get_provider_name(self) -> str:
        return "gemini"
