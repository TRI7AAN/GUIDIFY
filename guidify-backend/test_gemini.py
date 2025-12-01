import os
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_connection():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ Error: GEMINI_API_KEY not found in environment variables.")
        return

    print(f"🔑 Found API Key: {api_key[:5]}...{api_key[-4:]}")
    
    try:
        client = genai.Client(api_key=api_key)
        
        # Updated to the recommended model
        model_id = "gemini-2.5-flash-lite"
        
        print(f"📡 Sending test request to {model_id}...")
        response = client.models.generate_content(
            model=model_id,
            contents="Respond with only the word 'Success'."
        )
        
        print(f"✅ API Response: {response.text}")
        print(f"🎉 {model_id} is working perfectly!")
        
    except Exception as e:
        print(f"❌ Connection Failed: {str(e)}")
        print("💡 Tip: If 2.5-flash-lite fails, try 'gemini-2.0-flash' as a fallback.")

if __name__ == "__main__":
    test_connection()