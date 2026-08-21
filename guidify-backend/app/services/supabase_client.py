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
from typing import Dict, Optional
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