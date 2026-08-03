"""
Resume ↔ Job Description Match Prompt — v1

Compares a parsed resume against a job description to produce:
- Match score (0-100)
- Missing/matching skills
- Specific resume change suggestions
- Course recommendations
- Similar job suggestions
"""

RESUME_JD_MATCH_V1 = """You are an expert career advisor and resume consultant. Analyze the following resume data and job description, then provide a comprehensive fit analysis.

## Candidate Resume (Parsed)
```json
{parsed_resume_json}
```

## Target Job
- **Title:** {job_title}
- **Company:** {company}
- **Job Description:**
{job_description}

## Candidate Context
- **Current target role:** {target_role}
- **Segment:** {segment}

## Your Task
Analyze how well the candidate's resume matches this job description. Return a JSON object with EXACTLY this structure:

{{
  "match_score": <int 0-100, how well the resume matches the JD>,
  "match_summary": "<1-2 sentence summary of the fit>",
  "matching_skills": ["<skills the candidate already has that match the JD>"],
  "missing_skills": ["<skills required by JD that the candidate lacks>"],
  "resume_changes": [
    {{
      "section": "<which resume section to modify: summary, experience, skills, projects>",
      "current_text": "<what the resume currently says (brief quote or null if missing)>",
      "suggested_text": "<what it should say instead to better match this JD>",
      "reason": "<why this change improves the match>"
    }}
  ],
  "courses": [
    {{
      "title": "<specific course name>",
      "provider": "<platform: Coursera, Udemy, edX, YouTube, etc.>",
      "url": "<URL if known, or null>",
      "skill_targeted": "<which missing skill this addresses>",
      "relevance": "<how this course helps close the gap>"
    }}
  ],
  "job_suggestions": [
    {{
      "title": "<job title the candidate should also apply for>",
      "company_type": "<type of company: startup, enterprise, agency, etc.>",
      "match_reason": "<why the candidate would be a good fit>",
      "estimated_fit_pct": <int 0-100>,
      "search_query": "<suggested search query for job boards>"
    }}
  ]
}}

## Guidelines
- Provide 3-6 specific resume_changes, prioritized by impact
- Recommend 3-5 courses from well-known platforms
- Suggest 3-5 alternative jobs the candidate should consider
- Be specific and actionable — no vague advice
- Match score should reflect actual keyword/skill overlap, not potential
- For resume_changes, show concrete before/after text
"""
