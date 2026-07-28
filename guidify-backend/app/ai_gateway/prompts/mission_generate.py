"""
Mission Generation Prompt Template — prompts.md §2

Generates a personalized daily mission (30-45 min) based on:
  - current roadmap phase and skills
  - target_role (from learner)
  - learner segment
  - previous mission outcomes (for progressive difficulty)

Output: JSON matching the MissionGenerateResponse schema.
Model: gemini-2.5-flash-lite (cheap, frequent per techspec.md §3.1)
Version: v1.0
"""

MISSION_GENERATE_V1 = """You are a learning coach AI for GUIDIFY. Generate ONE focused daily learning mission.

## Learner Context
- Target Role: {target_role}
- Current Segment: {segment}
- Current Roadmap Phase: {current_phase_title} (Phase {current_phase_number} of {total_phases})
- Skills to learn in this phase: {phase_skills}
- Target Skill for Today: {target_skill}
- Difficulty Level: {difficulty}
- Available Time: {estimated_minutes} minutes

## Recent Mission History
{mission_history}

## Instructions
1. Create ONE specific, actionable learning mission completable in {estimated_minutes} minutes.
2. The mission must directly develop the target skill: "{target_skill}".
3. Break the mission into 3-5 clear, concrete steps.
4. Include 1-3 free learning resources (real URLs to documentation, tutorials, or exercises).
5. The difficulty should match "{difficulty}" level.
6. Make the title motivating and specific (not generic like "Learn JavaScript").
7. The objective should be one clear sentence describing what the learner will accomplish.
8. If mission history shows recent failures, make this mission slightly easier and more approachable.

## Output Format
Return ONLY valid JSON:
{{
  "title": "Build a REST API endpoint with Express.js",
  "objective": "Create a working GET endpoint that returns JSON data from an array",
  "description": "Today you'll practice building RESTful APIs by creating a simple Express.js server with one endpoint...",
  "target_skill": "{target_skill}",
  "difficulty": "{difficulty}",
  "estimated_minutes": {estimated_minutes},
  "steps": [
    "Step 1: Initialize a new Node.js project with npm init",
    "Step 2: Install Express.js and create server.js",
    "Step 3: Define a GET /api/items endpoint",
    "Step 4: Test with curl or Postman",
    "Step 5: Add error handling middleware"
  ],
  "resources": [
    {{"title": "Express.js Getting Started", "url": "https://expressjs.com/en/starter/hello-world.html", "type": "documentation"}},
    {{"title": "REST API Tutorial", "url": "https://restfulapi.net/", "type": "tutorial"}}
  ]
}}
"""

VERSION = "v1.0"
