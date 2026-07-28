"""
Resume Parse Prompt Template — prompts.md §3

Extracts structured data from raw resume text:
  - Contact info (name, email, phone, location)
  - Work experience (company, role, dates, descriptions)
  - Education (institution, degree, dates, GPA)
  - Technical skills
  - Soft skills
  - Projects
  - Certifications

Output: JSON matching the ResumeParseResponse schema.
Model: gemini-2.5-flash (accurate extraction per techspec.md §3.1)
Version: v1.0
"""

RESUME_PARSE_V1 = """You are an AI resume analyst for GUIDIFY. Extract structured data from the following resume text.

## Resume Text
{resume_text}

## Instructions
1. Extract ALL information you can find from the resume.
2. For work experience, extract company name, job title, start/end dates, and key responsibilities.
3. For education, extract institution name, degree/program, field of study, start/end dates, and GPA/percentage if available.
4. Categorize skills into technical_skills and soft_skills.
5. Extract any projects with their names, descriptions, and technologies used.
6. Extract certifications with issuing organization and date if available.
7. If information is not available for a field, use an empty list or null as appropriate.
8. Be precise — do not hallucinate or infer information not present in the resume.

## Output Format
Return ONLY valid JSON matching this schema:
{{
  "contact": {{
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "+1234567890",
    "location": "City, State/Country",
    "linkedin": "linkedin.com/in/username or null",
    "github": "github.com/username or null",
    "portfolio": "website URL or null"
  }},
  "summary": "Brief professional summary or objective statement if present",
  "experience": [
    {{
      "company": "Company Name",
      "title": "Job Title",
      "start_date": "MM/YYYY or YYYY",
      "end_date": "MM/YYYY or 'Present'",
      "location": "City, State or null",
      "description": "Brief description of role",
      "responsibilities": [
        "Key responsibility or achievement 1",
        "Key responsibility or achievement 2"
      ]
    }}
  ],
  "education": [
    {{
      "institution": "University/School Name",
      "degree": "Bachelor's/Master's/etc.",
      "field_of_study": "Computer Science/etc.",
      "start_date": "YYYY",
      "end_date": "YYYY",
      "gpa": "3.8/4.0 or null",
      "percentage": null,
      "honors": "Dean's List/etc. or null"
    }}
  ],
  "technical_skills": ["Python", "JavaScript", "React", "Node.js"],
  "soft_skills": ["Leadership", "Communication", "Teamwork"],
  "projects": [
    {{
      "name": "Project Name",
      "description": "Brief description of the project",
      "technologies": ["Tech1", "Tech2"],
      "url": "github.com/user/repo or null"
    }}
  ],
  "certifications": [
    {{
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "MM/YYYY or YYYY",
      "url": "verification URL or null"
    }}
  ],
  "languages": ["English", "Hindi"],
  "total_years_experience": 2
}}
"""

VERSION = "v1.0"
