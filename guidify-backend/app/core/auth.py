"""
Auth Middleware — JWT Validation

Validates Supabase Auth JWTs and extracts learner_id for route handlers.
Per techspec.md §7: All endpoints (except /health) require Bearer token auth.

Usage in routes:
    from app.core.auth import get_current_learner_id

    @router.get("/profile/me")
    async def get_profile(learner_id: str = Depends(get_current_learner_id)):
        ...
"""

import asyncio
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exceptions import AuthenticationError, InvalidTokenError
from app.services.supabase_client import supabase

security = HTTPBearer()


async def get_current_learner_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """
    FastAPI dependency that validates the Supabase JWT and returns the learner_id.

    The learner_id equals auth.uid() — the Supabase Auth user ID.
    Per schema.md §1: learners.id = auth.uid().

    Raises:
        AuthenticationError: If no token provided.
        InvalidTokenError: If token is invalid or expired.
    """
    token = credentials.credentials
    if not token:
        raise AuthenticationError("No authentication token provided")

    try:
        # Supabase SDK v2: pass JWT directly to get_user()
        # Wrap in asyncio.to_thread to avoid blocking the event loop
        user_response = await asyncio.to_thread(supabase.auth.get_user, token)
        if user_response and user_response.user:
            return user_response.user.id
        raise InvalidTokenError("Could not validate token")
    except InvalidTokenError:
        raise
    except Exception as e:
        raise InvalidTokenError(f"Token validation failed: {str(e)}")
