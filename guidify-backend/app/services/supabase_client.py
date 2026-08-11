"""
Supabase Client Module

Provides Supabase clients and core auth/profile helper functions.

No service-role key is used. All access is through the publishable key:
  - `supabase` → publishable key → auth API (sign-up/in, JWT verification)
  - `db`       → publishable key + request user JWT → RLS-enforced DB access
                 Resolves to a request-scoped client carrying the caller's
                 access token so PostgREST evaluates RLS against auth.uid().
"""

import contextvars
from typing import Any, Dict, Optional
from supabase import create_client, Client
from app.core.config import settings

# ── Base client (publishable key) — auth operations ────────────────────────
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_PUBLISHABLE_KEY)

# ── Request-scoped DB client (publishable key + user JWT, RLS enforced) ────
_request_jwt_var: contextvars.ContextVar = contextvars.ContextVar(
    "guidify_request_jwt", default=None
)
_request_client_var: contextvars.ContextVar = contextvars.ContextVar(
    "guidify_request_client", default=None
)


def _create_client(headers: Dict[str, str]) -> Client:
    # supabase>=2.16 uses dataclass options; older versions accept a plain dict.
    try:
        from supabase.lib.client_options import SyncClientOptions
        options = SyncClientOptions(headers=headers)
    except Exception:
        options = {"headers": headers}
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_PUBLISHABLE_KEY, options)


def set_request_jwt(token: Optional[str]) -> None:
    """Bind the current request's access token (invalidates any cached client)."""
    _request_jwt_var.set(token)
    _request_client_var.set(None)


def get_db_client() -> Client:
    """
    Return a Supabase client for server-side DB access.

    Authenticated requests get a request-scoped client carrying the caller's
    JWT so RLS (auth.uid()) applies. Unauthenticated requests fall back to the
    shared publishable-key client.
    """
    token = _request_jwt_var.get()
    if not token:
        return supabase
    cached = _request_client_var.get()
    if cached is not None:
        return cached
    client = _create_client({
        "apikey": settings.SUPABASE_PUBLISHABLE_KEY,
        "apiKey": settings.SUPABASE_PUBLISHABLE_KEY,
        "Authorization": f"Bearer {token}",
    })
    _request_client_var.set(client)
    return client


class _RequestScopedDBClient:
    """Delegates attribute access to the current request's DB client."""

    def __getattr__(self, name: str):
        return getattr(get_db_client(), name)


# Canonical DB client for services/queries (previously `supabase_admin`).
db: Client = _RequestScopedDBClient()  # type: ignore[assignment]


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