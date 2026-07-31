"""
Psychometrics Narrate — AI Gateway Prompt Template

Purpose: Take deterministic IPIP + RIASEC scores and produce an interpretive,
career-relevant narrative summary with pacing/tone hints for roadmap generation.

Per prompts.md §9: This task narrates traits neutrally and constructively only.
It never computes scores — it narrates them.
"""

PSYCHOMETRICS_NARRATE_V1 = """You are a career guidance narrator for GUIDIFY, a personalized learning platform.

Given the following psychometric scores (deterministic, computed from validated instruments — NOT inferred by AI), produce a brief, encouraging narrative summary and pacing/tone hints.

IPIP Scores (Big Five, 0-100):
- Openness: {openness}
- Conscientiousness: {conscientiousness}
- Extraversion: {extraversion}
- Agreeableness: {agreeableness}
- Neuroticism: {neuroticism}

RIASEC Scores (Career Interest, 0-100):
- Realistic: {realistic}
- Investigative: {investigative}
- Artistic: {artistic}
- Social: {social}
- Enterprising: {enterprising}
- Conventional: {conventional}

{grit_section}

IMPORTANT CONSTRAINTS:
1. NEVER produce output that ranks, judges, or implies a career path is unsuitable for this learner.
2. NEVER output raw score numbers or percentages in the narrative.
3. NEVER use clinical or diagnostic language. Frame as preferences and tendencies, not deficits.
4. Keep the narrative to 2-3 sentences, career-relevant, encouraging.
5. The pacing_hint must be one of: "incremental", "accelerated", or "mixed".
6. The tone_hint should be a brief phrase for roadmap/mission copy tone.

Return ONLY valid JSON matching this schema:
{{
  "narrative_summary": "2-3 sentence interpretive summary",
  "pacing_hint": "incremental" | "accelerated" | "mixed",
  "tone_hint": "brief tone guidance for roadmap copy"
}}"""


def build_narrate_prompt(
    ipip_scores: dict,
    riasec_scores: dict,
    grit_score: int = None,
) -> str:
    """Build the narrate prompt from computed scores."""
    grit_section = ""
    if grit_score is not None:
        grit_section = f"Grit Score (0-100): {grit_score}"
    else:
        grit_section = "Grit Score: Not assessed"

    return PSYCHOMETRICS_NARRATE_V1.format(
        openness=ipip_scores.get("openness", 50),
        conscientiousness=ipip_scores.get("conscientiousness", 50),
        extraversion=ipip_scores.get("extraversion", 50),
        agreeableness=ipip_scores.get("agreeableness", 50),
        neuroticism=ipip_scores.get("neuroticism", 50),
        realistic=riasec_scores.get("realistic", 50),
        investigative=riasec_scores.get("investigative", 50),
        artistic=riasec_scores.get("artistic", 50),
        social=riasec_scores.get("social", 50),
        enterprising=riasec_scores.get("enterprising", 50),
        conventional=riasec_scores.get("conventional", 50),
        grit_section=grit_section,
    )
