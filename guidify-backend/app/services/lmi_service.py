from typing import List, Dict, Any

from app.core.exceptions import ExternalServiceError

class LMIService:
    def __init__(self):
        # Seed data
        self.jobs_db = [
            {"title": "Python Developer", "skills": ["Python", "Django", "SQL"], "salary": "6-10 LPA", "location": "Bangalore", "trend": "High"},
            {"title": "Data Analyst", "skills": ["Excel", "Python", "Tableau"], "salary": "5-8 LPA", "location": "Mumbai", "trend": "Medium"},
            {"title": "Frontend Dev", "skills": ["React", "JavaScript", "CSS"], "salary": "5-9 LPA", "location": "Remote", "trend": "High"},
            {"title": "Digital Marketer", "skills": ["SEO", "Social Media", "Content"], "salary": "3-6 LPA", "location": "Delhi", "trend": "Medium"}
        ]

    def get_skills_trend(self, skill: str, period: str) -> Dict[str, Any]:
        """
        Get trend data for a specific skill.

        F-21 FIX: Previously this returned random.randint() numbers presented as
        real market demand data — fabricated LMI served to users. No real LMI
        data source is connected, so the endpoint now returns an explicit 503
        instead of lying. Re-enable only with a real data pipeline.
        """
        raise ExternalServiceError(
            service="LMI",
            message="Labour market data is not connected yet. This endpoint was "
                    "disabled because it previously returned fabricated (mock) data.",
        )

    def match_jobs(self, learner_profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Match jobs to learner profile based on skills.
        """
        user_skills = set(s.lower() for s in learner_profile.get("skills", []))
        matches = []
        
        for job in self.jobs_db:
            job_skills = set(s.lower() for s in job["skills"])
            intersection = user_skills.intersection(job_skills)
            if intersection:
                match_score = len(intersection) / len(job_skills)
                matches.append({
                    **job,
                    "match_score": round(match_score, 2),
                    "matched_skills": list(intersection)
                })
        
        matches.sort(key=lambda x: x["match_score"], reverse=True)
        return matches

lmi_service = LMIService()
