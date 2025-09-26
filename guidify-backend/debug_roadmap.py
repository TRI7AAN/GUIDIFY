import requests
import json

url = "http://127.0.0.1:8000/api/roadmap/generate"
payload = {
    "current_subjects": "Computer Science",
    "target_career": "AI Engineer",
    "user_id": "test-user-id" 
}
headers = {"Content-Type": "application/json"}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
