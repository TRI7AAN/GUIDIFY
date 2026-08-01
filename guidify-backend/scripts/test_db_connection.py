import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

URL = os.environ.get("SUPABASE_URL")
# Partial key print for debug
KEY = os.environ.get("SUPABASE_KEY")

print(f"Supabase URL: {URL}")
if KEY:
    print(f"Supabase Key found (starts with): {KEY[:10]}...")
else:
    print("Supabase Key NOT found.")

if not URL or not KEY:
    print("Missing credentials.")
    exit(1)

try:
    print("Attempting to connect...")
    supabase: Client = create_client(URL, KEY)
    # Simple query
    response = supabase.table("learners").select("count", count="exact").limit(1).execute()
    print("Connection Successful!")
    print(f"Learners count data: {response.count}")
except Exception as e:
    print(f"Connection Failed: {e}")
