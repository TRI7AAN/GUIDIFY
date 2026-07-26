"""
Supabase Client Module

Provides singleton Supabase clients and core auth/profile helper functions.

CLIENT SEPARATION (CRIT-06 FIX):
  - `supabase`       → anon key  → use for all user-facing operations (RLS enforced)
  - `supabase_admin` → service key → use ONLY for admin operations (delete_user, etc.)
                       Never expose the admin client to user-controlled input paths.
"""

import os
from typing import Dict, Any, Optional
from supabase import create_client, Client
from app.core.config import settings

# ── Public anon client (RLS enforced) ──────────────────────────────────────
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# ── Admin service-role client (CRIT-06 FIX) ────────────────────────────────
# Used exclusively for operations that require elevated privileges:
# - auth.admin.delete_user()
# - Any server-side write that must bypass RLS safely
import logging as _logging
_logger = _logging.getLogger("guidify")

if settings.SUPABASE_SERVICE_KEY:
    supabase_admin: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
else:
    supabase_admin = None  # type: ignore[assignment]
    _logger.warning(
        "SUPABASE_SERVICE_KEY is not set. Admin operations (e.g. delete_user) will fail. "
        "Set this variable in your .env file."
    )


def sign_up(email: str, password: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Register a new user with Supabase Auth and create profile"""
    auth_response = supabase.auth.sign_up({
        "email": email,
        "password": password
    })

    # Create user profile in profiles table if signup succeeded
    if auth_response.user:
        user_id = auth_response.user.id
        profile_data = {
            "user_id": user_id,
            "email": email,
            **user_data
        }
        supabase.table("profiles").insert(profile_data).execute()

    # Return serializable dict from Supabase response (SDK v2 uses model objects)
    return {
        "user": auth_response.user.model_dump() if auth_response.user else None,
        "session": auth_response.session.model_dump() if auth_response.session else None,
    }


def sign_in(email: str, password: str) -> Dict[str, Any]:
    """Sign in existing user"""
    auth_response = supabase.auth.sign_in_with_password({
        "email": email,
        "password": password
    })
    return {
        "user": auth_response.user.model_dump() if auth_response.user else None,
        "session": auth_response.session.model_dump() if auth_response.session else None,
    }


def sign_out(jwt: str) -> Dict[str, Any]:
    """Sign out user"""
    return supabase.auth.sign_out()


def get_user_profile(user_id: str) -> Dict[str, Any]:
    """Get user profile data"""
    response = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
    if response.data and len(response.data) > 0:
        return response.data[0]
    return {}


def update_user_profile(user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """Update user profile data"""
    response = supabase.table("profiles").update(profile_data).eq("user_id", user_id).execute()
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
    """
    Verify JWT token and return user data.

    Uses Supabase SDK v2 get_user() API — passes the token directly
    instead of the deprecated set_auth() method.
    """
    try:
        # SDK v2: pass the JWT directly to get_user()
        user_response = supabase.auth.get_user(jwt)
        if user_response and user_response.user:
            return {"valid": True, "user": user_response.user.model_dump()}
        return {"valid": False, "error": "User not found"}
    except Exception as e:
        return {"valid": False, "error": str(e)}


def admin_delete_user(user_id: str) -> bool:
    """
    CRIT-06 FIX: Delete a user from Supabase Auth using the service role admin client.
    Returns True on success, False on failure.
    Must only be called from server-side code — never expose to user-controlled paths.
    """
    if not supabase_admin:
        _logger.error("admin_delete_user called but SUPABASE_SERVICE_KEY is not configured.")
        return False
    try:
        supabase_admin.auth.admin.delete_user(user_id)
        return True
    except Exception as e:
        _logger.error(f"admin_delete_user failed for user {user_id}: {e}")
        return False