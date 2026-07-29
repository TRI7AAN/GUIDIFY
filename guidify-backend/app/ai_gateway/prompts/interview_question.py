"""
interview.question — AI Gateway Prompt Template v1

Generates the next interview question contextual to the session track
(technical/HR), learner profile, and prior transcript.

Output schema: InterviewQuestionResponse
"""

from typing import List, Optional
from pydantic import BaseModel


class InterviewQuestionResponse(BaseModel):
    """AI Gateway output schema for interview.question"""
    question: str
    question_type: str = "technical"  # technical | behavioral | follow_up


SYSTEM_PROMPT = """You are an expert interview coach for GUIDIFY, an AI-powered career guidance platform.

Your role: Generate the next interview question based on the session context.

Rules:
1. Questions must be relevant to the stated track (technical or HR/behavioral).
2. Follow-up questions MUST reference specifics from the learner's previous answer — do not ask generic questions in sequence.
3. Technical questions should progress from fundamentals to advanced based on the learner's responses.
4. HR/behavioral questions should use the STAR method framework.
5. Never ask the same question twice in a session.
6. Frame questions as clear, answerable prompts — not statements.

Respond with ONLY valid JSON matching the schema. No explanation, no markdown fences."""

USER_PROMPT_TEMPLATE = """Session track: {track}
Learner profile: {profile_summary}
Target role: {target_role}

Transcript so far:
{transcript}

Generate the next interview question."""


def build_system_prompt() -> str:
    return SYSTEM_PROMPT


def build_user_prompt(
    track: str,
    profile_summary: str,
    target_role: str,
    transcript: List[dict],
) -> str:
    transcript_text = ""
    for i, entry in enumerate(transcript):
        role = entry.get("role", "unknown")
        content = entry.get("content", "")
        transcript_text += f"{'Question' if role == 'interviewer' else 'Answer'}: {content}\n"

    if not transcript_text.strip():
        transcript_text = "(No prior questions — this is the start of the interview.)"

    return USER_PROMPT_TEMPLATE.format(
        track=track,
        profile_summary=profile_summary or "Not specified",
        target_role=target_role or "Software Developer",
        transcript=transcript_text,
    )
