"""
AI Provider Interface

Abstract base class for all AI providers (Gemini, Gemma, etc.).
Per techspec.md §3.1: Feature services call ai_gateway.generate(task_type, context)
— they never know which model is behind it.
"""

from abc import ABC, abstractmethod
from typing import Optional


class AIProvider(ABC):
    """
    Abstract interface for AI model providers.

    Implementations:
        - GeminiProvider (default, cloud) — techspec.md §3.1
        - GemmaProvider (future, on-device/offline) — deferred per roadmap.md
    """

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: Optional[str] = None,
    ) -> str:
        """
        Send a prompt to the AI model and return the raw text response.

        Args:
            prompt: The user/context prompt to send.
            system_instruction: Optional system-level instruction.
            model: Optional model override (provider-specific).

        Returns:
            Raw text response from the model.
        """
        ...

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the provider name for logging/cost tracking."""
        ...
