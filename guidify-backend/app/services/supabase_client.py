import os
from typing import Dict, Any, Optional
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def sign_up(email: str, password: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Register a new user with Supabase Auth and create profile"""
    # Register user with Supabase Auth
    auth_response = supabase.auth.sign_up({
        "email": email,
        "password": password
    })
    
    # Create user profile in profiles table
    if auth_response.user:
        user_id = auth_response.user.id
        profile_data = {
            "id": user_id,
            "email": email,
            **user_data
        }
        
        # Insert profile data
        supabase.table("profiles").insert(profile_data).execute()
        
    return auth_response.dict()

def sign_in(email: str, password: str) -> Dict[str, Any]:
    """Sign in existing user"""
    auth_response = supabase.auth.sign_in_with_password({
        "email": email,
        "password": password
    })
    return auth_response.dict()

def sign_out(jwt: str) -> Dict[str, Any]:
    """Sign out user"""
    supabase.auth.set_auth(jwt)
    return supabase.auth.sign_out()

def get_user_profile(user_id: str) -> Dict[str, Any]:
    """Get user profile data"""
    response = supabase.table("profiles").select("*").eq("id", user_id).execute()
    if response.data and len(response.data) > 0:
        return response.data[0]
    return {}

def update_user_profile(user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """Update user profile data"""
    response = supabase.table("profiles").update(profile_data).eq("id", user_id).execute()
    if response.data and len(response.data) > 0:
        return response.data[0]
    return {}

def store_document_reference(user_id: str, document_type: str, document_path: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Store document reference in user_documents table"""
    document_data = {
        "user_id": user_id,
        "document_type": document_type,
        "document_path": document_path,
        "metadata": metadata
    }
    response = supabase.table("user_documents").insert(document_data).execute()
    if response.data and len(response.data) > 0:
        return response.data[0]
    return {}

def get_user_documents(user_id: str, document_type: Optional[str] = None) -> list:
    """Get user documents"""
    query = supabase.table("user_documents").select("*").eq("user_id", user_id)
    
    if document_type:
        query = query.eq("document_type", document_type)
    
    response = query.execute()
    return response.data if response.data else []

def verify_token(jwt: str) -> Dict[str, Any]:
    """Verify JWT token and return user data"""
    try:
        supabase.auth.set_auth(jwt)
        user = supabase.auth.get_user()
        return {"valid": True, "user": user.dict()}
    except Exception as e:
        return {"valid": False, "error": str(e)}