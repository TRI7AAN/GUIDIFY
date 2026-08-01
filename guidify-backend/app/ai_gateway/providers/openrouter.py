"""
OpenRouter AI Provider

Wraps OpenRouter's OpenAI-compatible API behind the AIProvider interface.
Default model: NVIDIA Nemotron 3 Super (120B-A12B).

Uses the openai SDK with a custom base_url pointing to OpenRouter.
All blocking SDK calls are run in a thread pool to avoid blocking
FastAPI's async event loop.
"""

import asyncio
import logging
from typing import Optional

from openai import OpenAI

from app.core.config import settings
from app.ai_gateway.providers.base import AIProvider

logger = logging.getLogger("guidify.ai_gateway.openrouter")


class OpenRouterProvider(AIProvider):
    """
    OpenRouter AI provider — OpenAI-compatible API gateway.

    Wraps the openai SDK with OpenRouter's base URL and exposes
    the standard AIProvider interface.
    """

    BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(self):
        api_key = settings.OPENROUTER_API_KEY
        if not api_key:
            logger.warning("OPENROUTER_API_KEY not set — OpenRouter calls will fail")
        self._client = OpenAI(
            api_key=api_key,
            base_url=self.BASE_URL,
        )
        self._default_model = settings.OPENROUTER_MODEL

    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: Optional[str] = None,
    ) -> str:
        """
        Send a prompt to OpenRouter and return the response text.

        Runs the blocking SDK call in a thread pool (asyncio.to_thread)
        to avoid blocking the event loop.
        """
        target_model = model or self._default_model

        def _sync_call() -> str:
            try:
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                response = self._client.chat.completions.create(
                    model=target_model,
                    messages=messages,
                    temperature=0.4,
                    timeout=settings.AI_TIMEOUT_SECONDS,
                )
                return response.choices[0].message.content or ""
            except Exception as e:
                logger.error(f"OpenRouter API error (model={target_model}): {e}")
                raise

        return await asyncio.to_thread(_sync_call)

    def get_provider_name(self) -> str:
        return "openrouter"
