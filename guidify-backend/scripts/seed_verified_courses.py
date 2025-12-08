import json
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env variables
load_dotenv()

URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_KEY")

if not URL or not KEY:
    # Try local dev fallback or error
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in env.")
    exit(1)

supabase: Client = create_client(URL, KEY)

SEED_FILE = os.path.join(os.path.dirname(__file__), "../data/nqr_seed.json")

def seed_courses():
    print("Starting NCVET Course Seeding...")
    try:
        with open(SEED_FILE, "r") as f:
            courses = json.load(f)
            
        print(f"Loaded {len(courses)} courses from seed file.")
        
        # Insert into DB
        # We process one by one or batch? Supabase supports batch.
        
        # 1. Clear existing? Maybe not for production, but for demo yes to avoid dups if run multiple times without constraints.
        # But user might have run simple scraper. Let's just upsert or insert.
        # Since we don't have unique constraint on course_name in the simplified schema (only id), we might dup.
        # Better to check or clear.
        
        # Ideally we truncated, but let's just insert and assume clean start or accept risk in dev.
        # Or check if exists.
        
        final_data = []
        for c in courses:
            final_data.append({
                "course_name": c["course_name"],
                "nsqf_level": c["nsqf_level"],
                "sector": c["sector"],
                "certification_body": c["certification_body"],
                "duration_hours": c["duration_hours"],
                "min_eligibility": c["min_eligibility"],
                "job_roles": c["job_roles"],
            })
            
        response = supabase.table("verified_courses").insert(final_data).execute()
        print("Success! Seeded courses.")
        
    except Exception as e:
        print(f"Error seeding courses: {e}")

if __name__ == "__main__":
    seed_courses()
