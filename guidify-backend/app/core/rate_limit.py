"""Shared rate limiter instance.

Single Limiter shared by main.py (app.state.limiter + exception handler) and
route modules that apply per-endpoint @limiter.limit(...) decorators.

Placed in core/ so route modules never import from app.main (which is only
partially initialized during app startup and caused a circular import).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
