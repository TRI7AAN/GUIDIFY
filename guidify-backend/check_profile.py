import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in environment variables.")
    exit(1)

supabase: Client = create_client(url, key)

user_id = '1615d58f-11f2-4a5a-99b5-0c38a53272d9'

print(f"Checking profile for user: {user_id}")

try:
    # Try to fetch all columns to see what exists
    response = supabase.table('profiles').select("*").eq('user_id', user_id).execute()
    
    if response.data:
        print("Profile found!")
        profile = response.data[0]
        print("Keys in profile:", list(profile.keys()))
        print("onboarding_complete value:", profile.get('onboarding_complete'))
        print("onboarding_completed value:", profile.get('onboarding_completed'))
    else:
        print("No profile found for this user.")
        
except Exception as e:
    print(f"Error fetching profile: {e}")
