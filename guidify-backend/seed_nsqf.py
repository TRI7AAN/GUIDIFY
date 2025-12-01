import json
import os
from app.services.supabase_client import supabase

def seed_courses():
    json_path = os.path.join(os.path.dirname(__file__), "data/nsqf_courses.json")
    
    try:
        with open(json_path, "r") as f:
            courses = json.load(f)
            
        print(f"Found {len(courses)} courses to seed.")
        
        # Insert data
        response = supabase.table("verified_courses").insert(courses).execute()
        print("Successfully seeded courses!")
        
    except Exception as e:
        print(f"Error seeding courses: {e}")
        print("Make sure you have run the 'create_verified_courses.sql' script in Supabase first.")

if __name__ == "__main__":
    seed_courses()
