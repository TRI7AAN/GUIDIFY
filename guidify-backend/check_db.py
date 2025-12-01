from app.services.supabase_client import supabase

try:
    response = supabase.table("verified_courses").select("count", count="exact").execute()
    print("Table exists! Count:", response.count)
except Exception as e:
    print("Error accessing table:", e)
