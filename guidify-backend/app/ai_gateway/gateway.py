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
from app.ai_gateway.providers.openrouter import OpenRouterProvider
from app.core.config import settings
from app.core.exceptions import AIServiceError

logger = logging.getLogger("guidify.ai_gateway")


def _sanitize_user_input(text: str) -> str:
    """
    Sanitize user input to prevent prompt injection.
    Strips quotes, backticks, and control characters that could break prompt structure.
    """
    if not text:
        return ""
    # Remove quotes, backticks, and common injection patterns
    sanitized = text.replace('"', '').replace("'", "").replace("`", "")
    # Remove potential control sequences
    sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', sanitized)
    # Limit length
    return sanitized[:500]


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
        "roadmap.generate": "nvidia/nemotron-3-super-120b-a12b:free",
        "mission.generate": "nvidia/nemotron-3-super-120b-a12b:free",
        "resume.parse": "nvidia/nemotron-3-super-120b-a12b:free",
        "resume.score": "nvidia/nemotron-3-super-120b-a12b:free",
        "interview.question": "nvidia/nemotron-3-super-120b-a12b:free",
        "interview.feedback": "nvidia/nemotron-3-super-120b-a12b:free",
        "psychometrics.narrate": "nvidia/nemotron-3-super-120b-a12b:free",
        "resume.jd_match": "nvidia/nemotron-3-super-120b-a12b:free",
        "test.hello": "nvidia/nemotron-3-super-120b-a12b:free",
    }

    def __init__(self, provider: Optional[AIProvider] = None):
        """
        Initialize the gateway with a provider.
        Defaults to OpenRouterProvider (Nemotron 3 Super) if none specified.
        Falls back to GeminiProvider if OpenRouter key is not configured.
        """
        if provider:
            self._provider = provider
        elif settings.OPENROUTER_API_KEY:
            self._provider = OpenRouterProvider()
        else:
            logger.warning("OPENROUTER_API_KEY not set — falling back to Gemini")
            self._provider = GeminiProvider()

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

        # Allow prompt templates to override system instruction
        if "_system_instruction" in context:
            system_instruction = context.pop("_system_instruction")

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
                # Provider/transport errors (slow free models timing out, rate limits,
                # network failures) are NOT retried: a retry would double an already
                # long wait for an identical request. Fail fast so the caller can
                # surface a clear error instead of hanging twice the timeout.
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

        Uses versioned prompt templates from prompts/ directory where available.
        Falls back to generic JSON serialization for tasks without templates.
        """
        # Phase 0 test task
        if task_type == "test.hello":
            return (
                'Return a JSON object with exactly this structure: '
                '{"message": "hello from GUIDIFY", "status": "ok", "task_type": "test.hello"}. '
                "No other text."
            )

        # Roadmap generation — uses versioned prompt template
        if task_type == "roadmap.generate":
            from app.ai_gateway.prompts.roadmap_generate import (
                ROADMAP_GENERATE_V1, PSYCHOMETRIC_SECTION, PSYCHOMETRIC_INSTRUCTIONS,
            )

            # Build psychometric section if context present
            psychometric_narrative = context.get("psychometric_narrative")
            if psychometric_narrative:
                psychometric_section = PSYCHOMETRIC_SECTION.format(
                    psychometric_narrative=_sanitize_user_input(psychometric_narrative),
                    psychometric_pacing=context.get("psychometric_pacing", "mixed"),
                    psychometric_tone=context.get("psychometric_tone", "encouraging"),
                )
                psychometric_instructions = PSYCHOMETRIC_INSTRUCTIONS
            else:
                psychometric_section = ""
                psychometric_instructions = ""

            prompt = ROADMAP_GENERATE_V1.format(
                target_role=_sanitize_user_input(context.get("target_role", "Software Developer")),
                segment=_sanitize_user_input(context.get("segment", "college")),
                skills=", ".join([_sanitize_user_input(s) for s in context.get("skills", [])]) or "None listed",
                interests=", ".join([_sanitize_user_input(s) for s in context.get("interests", [])]) or "None listed",
                strengths=", ".join([_sanitize_user_input(s) for s in context.get("strengths", [])]) or "None listed",
                weaknesses=", ".join([_sanitize_user_input(s) for s in context.get("weaknesses", [])]) or "None listed",
                learning_hours=context.get("learning_hours", "5"),
                psychometric_section=psychometric_section,
                psychometric_instructions=psychometric_instructions,
            )
            if schema_hint:
                prompt += (
                    "\n\nIMPORTANT: Your previous response did not match the required JSON schema. "
                    "Please return ONLY valid JSON with no extra text."
                )
            return prompt

        # Mission generation — uses versioned prompt template
        if task_type == "mission.generate":
            from app.ai_gateway.prompts.mission_generate import MISSION_GENERATE_V1

            # Format mission history for context
            history_items = context.get("mission_history", [])
            if history_items:
                history_str = "\n".join(
                    f"- [{h.get('assigned_date', '?')}] {h.get('title', 'Unknown')} "
                    f"(skill: {h.get('target_skill', '?')}, status: {h.get('status', '?')})"
                    for h in history_items
                )
            else:
                history_str = "No previous missions — this is the learner's first mission."

            prompt = MISSION_GENERATE_V1.format(
                target_role=_sanitize_user_input(context.get("target_role", "Software Developer")),
                segment=_sanitize_user_input(context.get("segment", "college")),
                current_phase_title=_sanitize_user_input(context.get("current_phase_title", "Foundations")),
                current_phase_number=context.get("current_phase_number", 1),
                total_phases=context.get("total_phases", 4),
                phase_skills=", ".join([_sanitize_user_input(s) for s in context.get("phase_skills", [])]) or "General skills",
                target_skill=_sanitize_user_input(context.get("target_skill", "Problem Solving")),
                difficulty=context.get("difficulty", "beginner"),
                estimated_minutes=context.get("estimated_minutes", 35),
                mission_history=history_str,
            )
            if schema_hint:
                prompt += (
                    "\n\nIMPORTANT: Your previous response did not match the required JSON schema. "
                    "Please return ONLY valid JSON with no extra text."
                )
            return prompt

        # Resume parsing — uses versioned prompt template
        if task_type == "resume.parse":
            from app.ai_gateway.prompts.resume_parse import RESUME_PARSE_V1
            prompt = RESUME_PARSE_V1.format(
                resume_text=_sanitize_user_input(context.get("resume_text", "")),
            )
            if schema_hint:
                prompt += (
                    "\n\nIMPORTANT: Your previous response did not match the required JSON schema. "
                    "Please return ONLY valid JSON with no extra text."
                )
            return prompt

        # Resume scoring — uses versioned prompt template
        if task_type == "resume.score":
            from app.ai_gateway.prompts.resume_score import RESUME_SCORE_V1
            prompt = RESUME_SCORE_V1.format(
                target_role=_sanitize_user_input(context.get("target_role", "Software Developer")),
                segment=_sanitize_user_input(context.get("segment", "college")),
                current_skills=", ".join([_sanitize_user_input(s) for s in context.get("current_skills", [])]) or "None listed",
                parsed_resume_json=json.dumps(context.get("parsed_resume", {}), default=str),
            )
            if schema_hint:
                prompt += (
                    "\n\nIMPORTANT: Your previous response did not match the required JSON schema. "
                    "Please return ONLY valid JSON with no extra text."
                )
            return prompt

        # Interview question — uses versioned prompt template
        if task_type == "interview.question":
            from app.ai_gateway.prompts.interview_question import (
                build_system_prompt as iq_system,
                build_user_prompt as iq_user,
            )
            prompt = iq_user(
                track=context.get("track", "technical"),
                profile_summary=_sanitize_user_input(context.get("profile_summary", "")),
                target_role=_sanitize_user_input(context.get("target_role", "Software Developer")),
                transcript=context.get("transcript", []),
            )
            if schema_hint:
                prompt += (
                    "\n\nIMPORTANT: Your previous response did not match the required JSON schema. "
                    "Please return ONLY valid JSON with no extra text."
                )
            # Override system instruction for this task
            context["_system_instruction"] = iq_system()
            return prompt

        # Interview feedback — uses versioned prompt template
        if task_type == "interview.feedback":
            from app.ai_gateway.prompts.interview_feedback import (
                build_system_prompt as if_system,
                build_user_prompt as if_user,
            )
            prompt = if_user(
                track=context.get("track", "technical"),
                profile_summary=_sanitize_user_input(context.get("profile_summary", "")),
                target_role=_sanitize_user_input(context.get("target_role", "Software Developer")),
                transcript=context.get("transcript", []),
                delivery_metrics=context.get("delivery_metrics"),
                camera_enabled=context.get("camera_enabled", False),
            )
            if schema_hint:
                prompt += (
                    "\n\nIMPORTANT: Your previous response did not match the required JSON schema. "
                    "Please return ONLY valid JSON with no extra text."
                )
            context["_system_instruction"] = if_system()
            return prompt

        # Psychometrics narrate — uses versioned prompt template
        if task_type == "psychometrics.narrate":
            from app.ai_gateway.prompts.psychometrics_narrate import build_narrate_prompt
            prompt = build_narrate_prompt(
                ipip_scores=context.get("ipip_scores", {}),
                riasec_scores=context.get("riasec_scores", {}),
                grit_score=context.get("grit_score"),
            )
            if schema_hint:
                prompt += (
                    "\n\nIMPORTANT: Your previous response did not match the required JSON schema. "
                    "Please return ONLY valid JSON with no extra text."
                )
            return prompt

        # Resume JD matching — uses versioned prompt template
        if task_type == "resume.jd_match":
            from app.ai_gateway.prompts.resume_jd_match import RESUME_JD_MATCH_V1
            prompt = RESUME_JD_MATCH_V1.format(
                parsed_resume_json=json.dumps(context.get("parsed_resume", {}), default=str),
                job_title=_sanitize_user_input(context.get("job_title", "Software Developer")),
                company=_sanitize_user_input(context.get("company", "Not specified")),
                job_description=_sanitize_user_input(context.get("job_description", "")),
                target_role=_sanitize_user_input(context.get("target_role", "Software Developer")),
                segment=_sanitize_user_input(context.get("segment", "college")),
            )
            if schema_hint:
                prompt += (
                    "\n\nIMPORTANT: Your previous response did not match the required JSON schema. "
                    "Please return ONLY valid JSON with no extra text."
                )
            return prompt

        # Generic prompt construction for other task types
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


# Module-level singleton — reused across all request handlers
gateway = AIGateway()
