import os
import json
import re
from typing import Dict, Any, List, Optional
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def ask_groq(prompt: str, model: str = "llama-3.1-8b-instant") -> str:
    """Send a prompt to Groq LLM and get the response"""
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        return resp.choices[0].message.content
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return ""

def extract_json_from_response(response: str) -> Dict[str, Any]:
    """Extract JSON from LLM response"""
    try:
        # Try direct JSON parsing
        return json.loads(response)
    except:
        # Try to extract JSON block from markdown
        match = re.search(r'```(?:json)?\s*([\s\S]*?)```', response)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except:
                pass
        
        # Try to find JSON object with regex
        match = re.search(r'{[\s\S]*}', response)
        if match:
            try:
                return json.loads(match.group(0))
            except:
                pass
    
    # Return empty dict if all parsing attempts fail
    return {}