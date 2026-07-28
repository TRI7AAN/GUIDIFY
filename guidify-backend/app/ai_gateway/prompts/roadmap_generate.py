"""
Roadmap Generation Prompt Template — prompts.md §1

Generates a personalized multi-phase career roadmap based on:
  - target_role (from learner)
  - skills, interests, strengths, weaknesses (from learner_profile)
  - segment (school/college/graduate/professional)
  
Output: JSON matching the RoadmapGenerateResponse schema.
Version: v1.0
"""

ROADMAP_GENERATE_V1 = """You are a career advisor AI for GUIDIFY. Generate a personalized, actionable career roadmap.

## Input
- Target Role: {target_role}
- Current Segment: {segment}
- Current Skills: {skills}
- Interests: {interests}
- Strengths: {strengths}
- Weaknesses: {weaknesses}
- Weekly Learning Hours: {learning_hours}

## Instructions
1. Create 4-6 sequential learning phases tailored to move from current skill level to the target role.
2. Each phase should have:
   - A clear title (e.g., "Phase 1: Foundations")
   - A description explaining what the learner will achieve
   - 3-6 specific skills/topics to learn
   - Estimated duration in weeks (consider available learning hours)
   - A difficulty level: "beginner", "intermediate", or "advanced"
3. Phases should build on each other progressively.
4. Account for the learner's existing skills — skip what they already know.
5. Focus on practical, job-relevant skills for the target role.
6. The final phase should include job-readiness activities (portfolio, networking, interview prep).

## Output Format
Return ONLY valid JSON:
{{
  "title": "Roadmap to [Target Role]",
  "total_phases": <number>,
  "estimated_weeks": <number>,
  "phases": [
    {{
      "phase_number": 1,
      "title": "Phase 1: ...",
      "description": "...",
      "skills": ["skill1", "skill2", ...],
      "estimated_weeks": <number>,
      "difficulty": "beginner|intermediate|advanced",
      "milestones": ["milestone1", "milestone2"]
    }}
  ]
}}
"""

VERSION = "v1.0"
