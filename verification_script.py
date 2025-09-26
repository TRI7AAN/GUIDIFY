import requests
import json
import time

BASE_URL = "http://localhost:8000"

def run_verification():
    print("🚀 Starting GUIDIFY Verification...")
    
    # 1. Health Check
    try:
        r = requests.get(f"{BASE_URL}/health")
        print(f"✅ Health Check: {r.status_code} - {r.json()}")
    except Exception as e:
        print(f"❌ Health Check Failed: {e}")
        return

    # 2. ML Profile Generation
    print("\nTesting ML Profile Generation...")
    payload = {
        "user_id": "test_user_v1",
        "update_data": {
            "skills": ["Python", "Data Analysis"],
            "career_goal": "Data Scientist",
            "assessments": {"aptitude": 0.85}
        }
    }
    try:
        r = requests.post(f"{BASE_URL}/api/ml/profile/generate", json=payload)
        if r.status_code == 200:
            print(f"✅ Profile Generated: {json.dumps(r.json(), indent=2)}")
        else:
            print(f"❌ Profile Generation Failed: {r.text}")
    except Exception as e:
        print(f"❌ ML Profile Error: {e}")

    # 3. LMI Trends
    print("\nTesting LMI Trends...")
    try:
        r = requests.get(f"{BASE_URL}/api/lmi/skills-trend?skill=Python")
        if r.status_code == 200:
            print(f"✅ LMI Trend: {json.dumps(r.json(), indent=2)}")
        else:
            print(f"❌ LMI Trend Failed: {r.text}")
    except Exception as e:
        print(f"❌ LMI Error: {e}")

    # 4. Dashboard Data
    print("\nTesting Dashboard API...")
    try:
        # Mock auth header might be needed if not mocked in app
        # Assuming dev mode or mock auth
        r = requests.get(f"{BASE_URL}/api/dashboard/learner/test_user_v1")
        if r.status_code == 200:
            print(f"✅ Dashboard Data: {json.dumps(r.json(), indent=2)}")
        else:
            print(f"⚠️ Dashboard Failed (Auth might be required): {r.status_code}")
    except Exception as e:
        print(f"❌ Dashboard Error: {e}")

    print("\n✨ Verification Complete!")

if __name__ == "__main__":
    run_verification()
