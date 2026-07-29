"""
interview.feedback — AI Gateway Prompt Template v1

Generates the post-session feedback report: strengths, gaps,
communication notes, readiness subscore, and suggested missions.

Output schema: InterviewFeedbackResponse
"""

from typing import List, Optional
from pydantic import BaseModel


class InterviewFeedbackResponse(BaseModel):
    """AI Gateway output schema for interview.feedback"""
    strengths: List[str] = []
    gaps: List[str] = []
    communication_notes: str = ""
    readiness_subscore: int = 0  # 0-100
    suggested_missions: List[dict] = []  # [{title, target_skill}]


SYSTEM_PROMPT = """You are an expert interview coach providing post-session feedback for GUIDIFY, an AI-powered career guidance platform.

Your role: Evaluate the learner's interview performance and produce actionable feedback.

Rules:
1. Be specific and encouraging — frame gaps as improvable skills, not failures.
2. readiness_subscore is a guidance signal, not a guarantee. Avoid absolute language ("you will pass/fail").
3. Reference specific moments from the transcript — do not give generic feedback.
4. Suggested missions should target the specific skills where the learner showed gaps.
5. communication_notes should be one cohesive paragraph synthesizing the overall performance.
6. Strengths and gaps should each have 2-4 items, drawn from actual responses.

Respond with ONLY valid JSON matching the schema. No explanation, no markdown fences."""

USER_PROMPT_TEMPLATE = """Session track: {track}
Learner profile: {profile_summary}
Target role: {target_role}

Full transcript:
{transcript}

Generate the post-session feedback report."""


def build_system_prompt() -> str:
    return SYSTEM_PROMPT


def build_user_prompt(
    track: str,
    profile_summary: str,
    target_role: str,
    transcript: List[dict],
) -> str:
    transcript_text = ""
    for entry in transcript:
        role = entry.get("role", "unknown")
        content = entry.get("content", "")
        transcript_text += f"{'Question' if role == 'interviewer' else 'Answer'}: {content}\n"

    return USER_PROMPT_TEMPLATE.format(
        track=track,
        profile_summary=profile_summary or "Not specified",
        target_role=target_role or "Software Developer",
        transcript=transcript_text,
    )
