"""Deterministic, non-secret configuration for unit-test imports."""

import os


os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault(
    "SUPABASE_PUBLISHABLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIwMDAwMDAwMDB9."
    "ZHVtbXktc2lnbmF0dXJl",
)
os.environ.setdefault("GOOGLE_API_KEY", "test-google-api-key")
