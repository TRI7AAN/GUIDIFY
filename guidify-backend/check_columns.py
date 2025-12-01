from app.services.supabase_client import supabase
import json

try:
    # Try to select one row to see structure
    response = supabase.table("profiles").select("*").limit(1).execute()
    if response.data:
        print("Columns found:", response.data[0].keys())
    else:
        print("No data in profiles table, cannot determine columns.")
        
    # Also try to select career_roadmap specifically
    try:
        response = supabase.table("profiles").select("career_roadmap").limit(1).execute()
        print("career_roadmap column exists.")
    except Exception as e:
        print(f"career_roadmap check failed: {e}")

except Exception as e:
    print(f"General error: {e}")
