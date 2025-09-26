import os
import httpx
from typing import List, Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential
from app.services.supabase_client import supabase

NCVET_API_URL = os.environ.get("NCVET_API_URL", "https://api.ncvet.gov.in/mock") # Mock URL
NCVET_API_KEY = os.environ.get("NCVET_API_KEY", "mock_key")

class NCVETConnector:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def fetch_courses(self) -> List[Dict[str, Any]]:
        """
        Fetch courses from NCVET API.
        """
        # Mock implementation if no real URL
        if "mock" in NCVET_API_URL:
            return self._get_mock_data()

        response = await self.client.get(
            f"{NCVET_API_URL}/courses",
            headers={"Authorization": f"Bearer {NCVET_API_KEY}"}
        )
        response.raise_for_status()
        return response.json()

    def _get_mock_data(self):
        return [
            {
                "courseId": "NCVET-001",
                "title": "Data Entry Operator",
                "nsqfLevel": 4,
                "skills": ["Typing", "Excel"],
                "duration": "3 months",
                "provider": "NSDC",
                "url": "https://example.com/deo"
            },
            {
                "courseId": "NCVET-002",
                "title": "Python Developer",
                "nsqfLevel": 5,
                "skills": ["Python", "Django"],
                "duration": "6 months",
                "provider": "NIELIT",
                "url": "https://example.com/python"
            }
        ]

    async def sync_courses(self):
        """
        Fetch and sync courses to DB.
        """
        try:
            raw_courses = await self.fetch_courses()
            normalized_courses = []
            
            for c in raw_courses:
                normalized = {
                    "course_id": c.get("courseId"),
                    "title": c.get("title"),
                    "nsqf_level": int(c.get("nsqfLevel", 0)),
                    "skills": c.get("skills", []),
                    "duration": c.get("duration"),
                    "provider": c.get("provider"),
                    "url": c.get("url"),
                    "updated_at": "now()"
                }
                normalized_courses.append(normalized)

            if normalized_courses:
                # Upsert to Supabase
                response = supabase.table("ncvet_courses").upsert(
                    normalized_courses, on_conflict="course_id"
                ).execute()
                return len(normalized_courses)
            return 0
        except Exception as e:
            print(f"Error syncing NCVET courses: {e}")
            raise e

ncvet_connector = NCVETConnector()
