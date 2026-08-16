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
import time
from typing import Dict, Tuple
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exceptions import AuthenticationError, InvalidTokenError
from app.services.supabase_client import supabase, set_request_jwt

security = HTTPBearer()

# F-18 FIX: TTL cache for get_user() results, keyed by the bearer token.
# Previously every request made an external HTTP call to Supabase Auth
# (supabase.auth.get_user), which the audit flagged as a per-request network
# round-trip on the hot path. Tokens carry their own ~1h expiry, so a short
# TTL (5 min) still surfaces expirations/revocations promptly while removing
# the network call for the majority of requests within a session.
_USER_CACHE_TTL_SECONDS = 300
_MAX_CACHED_TOKENS = 10_000
_user_cache: Dict[str, Tuple[float, str]] = {}


def _cache_get_user(token: str):
    """Return (user_id, expired_flag). Pulls from TTL cache or Supabase Auth."""
    now = time.monotonic()
    cached = _user_cache.get(token)
    if cached and cached[0] > now:
        return cached[1], False

    user_response = supabase.auth.get_user(token)
    if not user_response or not user_response.user:
        raise InvalidTokenError("Could not validate token")

    _user_cache[token] = (now + _USER_CACHE_TTL_SECONDS, user_response.user.id)
    # Bounded cache: reset when it grows too large (tokens are ephemeral).
    if len(_user_cache) > _MAX_CACHED_TOKENS:
        _user_cache.clear()
    return user_response.user.id, True


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
        # F-18 FIX: cached lookup; the off-loop call is made only on cache miss.
        # Wrap in asyncio.to_thread to avoid blocking the event loop.
        user_id, _ = await asyncio.to_thread(_cache_get_user, token)
        # Bind the request's JWT so DB queries run under RLS for this user.
        set_request_jwt(token)
        return user_id
    except InvalidTokenError:
        raise
    except Exception as e:
        raise InvalidTokenError(f"Token validation failed: {str(e)}")
