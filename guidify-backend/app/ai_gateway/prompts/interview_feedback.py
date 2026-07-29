"""
interview.feedback — AI Gateway Prompt Template v2

Generates the post-session feedback report: strengths, gaps,
communication notes, readiness subscore, and suggested missions.

v2 adds: delivery_metrics input, STAR-structure scoring for behavioral tracks,
cohesive communication_notes synthesis (verbal + delivery).

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

If delivery_metrics are provided:
- Synthesize both the verbal transcript quality AND the delivery metrics into ONE cohesive, encouraging paragraph in communication_notes. Do NOT treat them as two disconnected observations.
- Never state or imply a numeric metric as a pass/fail judgment. Frame as a specific, improvable skill (e.g., "working on maintaining eye contact" not "your eye contact was 41%").
- For HR/behavioral tracks: include a STAR-structure assessment. Evaluate whether answers follow Situation/Task/Action/Result. Do NOT present as binary "used STAR / didn't use STAR". Instead, note where structure was strong and where adding specificity (concrete action, measurable result) would strengthen the answer. This is a coaching signal, not a scoring checkbox.

Respond with ONLY valid JSON matching the schema. No explanation, no markdown fences."""

USER_PROMPT_TEMPLATE = """Session track: {track}
Learner profile: {profile_summary}
Target role: {target_role}
{delivery_section}
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
    delivery_metrics: Optional[dict] = None,
    camera_enabled: bool = False,
) -> str:
    transcript_text = ""
    for entry in transcript:
        role = entry.get("role", "unknown")
        content = entry.get("content", "")
        transcript_text += f"{'Question' if role == 'interviewer' else 'Answer'}: {content}\n"

    delivery_section = ""
    if camera_enabled and delivery_metrics:
        dm = delivery_metrics
        parts = []
        if dm.get("eye_contact_pct") is not None:
            parts.append(f"Eye contact: {dm['eye_contact_pct']}%")
        if dm.get("posture_score") is not None:
            parts.append(f"Posture score: {dm['posture_score']}")
        if dm.get("expression_stability_score") is not None:
            parts.append(f"Expression stability: {dm['expression_stability_score']}")
        if dm.get("fidget_frequency") is not None:
            parts.append(f"Fidget frequency: {dm['fidget_frequency']}/s")
        if dm.get("words_per_minute") is not None:
            parts.append(f"Words per minute: {dm['words_per_minute']}")
        if dm.get("filler_word_rate") is not None:
            parts.append(f"Filler word rate: {dm['filler_word_rate']}")
        if dm.get("pause_frequency") is not None:
            parts.append(f"Pause frequency: {dm['pause_frequency']}/min")
        if parts:
            delivery_section = "Delivery metrics (captured client-side during the session):\n" + "\n".join(parts) + "\n"

    return USER_PROMPT_TEMPLATE.format(
        track=track,
        profile_summary=profile_summary or "Not specified",
        target_role=target_role or "Software Developer",
        delivery_section=delivery_section,
        transcript=transcript_text,
    )
