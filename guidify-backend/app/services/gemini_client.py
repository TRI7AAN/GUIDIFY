import os
import json
import re
from typing import Dict, Any, Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Gemini client
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # Fallback or warning if key is missing
    print("WARNING: GEMINI_API_KEY not found in environment variables.")

client = genai.Client(api_key=api_key)

def ask_gemini(prompt: str, model: str = "gemini-2.5-flash-lite", system_instruction: str = None) -> str:
    """
    Send a prompt to Gemini and get the response.
    """
    try:
        config = types.GenerateContentConfig(
            temperature=0.4,
            system_instruction=system_instruction
        )
        
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config
        )
        return response.text
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return ""

def ask_gemini_stream(prompt: str, model: str = "gemini-2.5-flash-lite", system_instruction: str = None):
    """
    Send a prompt to Gemini and yield response chunks (Streaming).
    """
    try:
        config = types.GenerateContentConfig(
            temperature=0.4,
            system_instruction=system_instruction
        )
        
        response = client.models.generate_content_stream(
            model=model,
            contents=prompt,
            config=config
        )
        
        for chunk in response:
            yield chunk.text
            
    except Exception as e:
        print(f"Error calling Gemini API (Stream): {e}")
        yield ""

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
