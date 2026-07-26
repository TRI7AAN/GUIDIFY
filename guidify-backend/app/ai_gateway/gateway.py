"""
AI Gateway — Central Entry Point

All AI calls from feature services flow through this gateway.
Per techspec.md §2-3:
    - Never call Gemini directly from feature code.
    - Centralizes prompt versioning, retries, cost logging, and provider abstraction.
    - Validates output against Pydantic schema, retries once on schema failure (§3.4).

Usage:
    from app.ai_gateway import AIGateway

    gateway = AIGateway()
    result = await gateway.generate("roadmap.generate", context={...}, response_model=RoadmapSchema)
"""

import json
import logging
import re
import time
from typing import Any, Dict, Optional, Type

from pydantic import BaseModel, ValidationError

from app.ai_gateway.providers.base import AIProvider
from app.ai_gateway.providers.gemini import GeminiProvider
from app.core.exceptions import AIServiceError

logger = logging.getLogger("guidify.ai_gateway")


class AIGateway:
    """
    Central AI Gateway — the single point through which all AI interactions flow.

    Responsibilities:
        1. Route task_type to the appropriate provider/model
        2. Validate AI output against Pydantic schemas (techspec.md §3.4)
        3. Retry once on schema-validation failure
        4. Log token counts for cost dashboards (techspec.md §3.3)
        5. Provide a clean interface: generate(task_type, context) → validated dict
    """

    # Task-type to model mapping — allows cheaper models for frequent tasks
    # Per techspec.md §3.1: "swap models per task (e.g., cheaper model for daily
    # mission text, stronger model for full roadmap generation)"
    TASK_MODEL_MAP: Dict[str, str] = {
        "roadmap.generate": "gemini-2.5-flash",       # Expensive, infrequent
        "mission.generate": "gemini-2.5-flash-lite",   # Cheap, frequent
        "resume.parse": "gemini-2.5-flash",
        "resume.score": "gemini-2.5-flash",
        "interview.question": "gemini-2.5-flash-lite",
        "interview.feedback": "gemini-2.5-flash",
        "test.hello": "gemini-2.5-flash-lite",         # Phase 0 test task
    }

    def __init__(self, provider: Optional[AIProvider] = None):
        """
        Initialize the gateway with a provider.
        Defaults to GeminiProvider if none specified.
        """
        self._provider = provider or GeminiProvider()

    async def generate(
        self,
        task_type: str,
        context: Dict[str, Any],
        response_model: Optional[Type[BaseModel]] = None,
        system_instruction: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate AI output for a given task type.

        Args:
            task_type: One of the registered task types (e.g., "roadmap.generate").
            context: Task-specific context dict, serialized into the prompt.
            response_model: Optional Pydantic model for output validation.
                           If provided, the gateway validates and retries once on failure.
            system_instruction: Optional system prompt override.

        Returns:
            Validated dict matching the response_model schema, or raw parsed JSON.

        Raises:
            AIServiceError: If the AI call fails after retries, or output
                           cannot be validated after retry.
        """
        model = self.TASK_MODEL_MAP.get(task_type)
        if not model:
            raise AIServiceError(
                message=f"Unknown AI Gateway task type: {task_type}",
                details={"task_type": task_type},
            )

        # Build the prompt from context
        prompt = self._build_prompt(task_type, context)

        # Default system instruction: always request strict JSON
        if system_instruction is None:
            system_instruction = (
                "You are an AI assistant for GUIDIFY, a personalized learning platform. "
                "Respond with ONLY valid JSON matching the requested schema. "
                "No explanation, no markdown fences, no extra text."
            )

        start_time = time.time()
        last_error: Optional[Exception] = None

        # Try up to 2 times (initial + 1 retry on schema failure per techspec.md §3.4)
        for attempt in range(2):
            try:
                raw_response = await self._provider.generate(
                    prompt=prompt,
                    system_instruction=system_instruction,
                    model=model,
                )

                duration_ms = (time.time() - start_time) * 1000

                # Log the call for cost tracking (techspec.md §3.3)
                logger.info(
                    "AI Gateway call completed",
                    extra={
                        "task_type": task_type,
                        "provider": self._provider.get_provider_name(),
                        "model": model,
                        "attempt": attempt + 1,
                        "duration_ms": round(duration_ms, 1),
                        "response_length": len(raw_response),
                    },
                )

                # Parse JSON from response
                parsed = self._extract_json(raw_response)
                if not parsed:
                    raise ValueError("AI response did not contain valid JSON")

                # Validate against Pydantic schema if provided
                if response_model is not None:
                    validated = response_model.model_validate(parsed)
                    return validated.model_dump()

                return parsed

            except ValidationError as e:
                last_error = e
                if attempt == 0:
                    logger.warning(
                        f"Schema validation failed for {task_type}, retrying (attempt {attempt + 1})",
                        extra={"errors": str(e)},
                    )
                    # Add schema hint to prompt for retry
                    prompt = self._build_prompt(task_type, context, schema_hint=True)
                    continue
                else:
                    raise AIServiceError(
                        message=f"AI output schema validation failed after retry for {task_type}",
                        details={"validation_errors": str(e)},
                    )

            except Exception as e:
                last_error = e
                if attempt == 0:
                    logger.warning(
                        f"AI Gateway call failed for {task_type}, retrying (attempt {attempt + 1})",
                        extra={"error": str(e)},
                    )
                    continue
                else:
                    raise AIServiceError(
                        message=f"AI Gateway call failed for {task_type}: {str(e)}",
                        details={"task_type": task_type, "error": str(e)},
                    )

        # Should not reach here, but safety net
        raise AIServiceError(
            message=f"AI Gateway exhausted retries for {task_type}",
            details={"last_error": str(last_error)},
        )

    def _build_prompt(
        self,
        task_type: str,
        context: Dict[str, Any],
        schema_hint: bool = False,
    ) -> str:
        """
        Build the prompt string from task type and context.

        Phase 0: Simple JSON serialization of context.
        Phase 1+: Will use versioned prompt templates from prompts/ directory.
        """
        # Phase 0 test task
        if task_type == "test.hello":
            return (
                'Return a JSON object with exactly this structure: '
                '{"message": "hello from GUIDIFY", "status": "ok", "task_type": "test.hello"}. '
                "No other text."
            )

        # Generic prompt construction (will be replaced by prompt templates in later phases)
        prompt_parts = [
            f"Task: {task_type}",
            f"Context: {json.dumps(context, default=str)}",
        ]
        if schema_hint:
            prompt_parts.append(
                "IMPORTANT: Your previous response did not match the required JSON schema. "
                "Please return ONLY valid JSON with no extra text."
            )

        return "\n".join(prompt_parts)

    @staticmethod
    def _extract_json(response: str) -> Dict[str, Any]:
        """
        Extract JSON from an AI response with multiple fallback strategies.

        Handles:
            1. Clean JSON response
            2. JSON wrapped in markdown code fences
            3. JSON embedded in prose text
        """
        if not response:
            return {}

        # Strategy 1: Direct parse
        try:
            return json.loads(response.strip())
        except (json.JSONDecodeError, ValueError):
            pass

        # Strategy 2: Extract from markdown code fences
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", response)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except (json.JSONDecodeError, ValueError):
                pass

        # Strategy 3: Find first JSON object in response
        match = re.search(r"\{[\s\S]*\}", response)
        if match:
            try:
                return json.loads(match.group(0))
            except (json.JSONDecodeError, ValueError):
                pass

        return {}
