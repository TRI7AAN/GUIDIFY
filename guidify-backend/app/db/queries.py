"""
Database Layer — Supabase RLS-Aware Queries

Provides typed query helpers for the schema.md tables.
All queries operate through the Supabase client with RLS enforcement.

Per techspec.md §7: Every table with learner data is scoped by auth.uid().
"""

from typing import Any, Dict, List, Optional
import logging

from app.services.supabase_client import supabase, supabase_admin

logger = logging.getLogger("guidify.db")


# --- Learners (schema.md §1) ---

async def get_learner(learner_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a learner record by ID."""
    try:
        response = supabase.table("learners").select("*").eq("id", learner_id).single().execute()
        return response.data if response.data else None
    except Exception as e:
        logger.error(f"Failed to fetch learner {learner_id}: {e}")
        return None


async def upsert_learner(learner_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create or update a learner record."""
    try:
        data["id"] = learner_id
        response = supabase.table("learners").upsert(data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to upsert learner {learner_id}: {e}")
        raise


async def update_learner(learner_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update specific fields on a learner record."""
    try:
        response = supabase.table("learners").update(data).eq("id", learner_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update learner {learner_id}: {e}")
        raise


# --- Learner Profiles (schema.md §2) ---

async def get_learner_profile(learner_id: str) -> Optional[Dict[str, Any]]:
    """Fetch the learner profile for a given learner."""
    try:
        response = (
            supabase.table("learner_profiles")
            .select("*")
            .eq("learner_id", learner_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to fetch profile for learner {learner_id}: {e}")
        return None


async def create_learner_profile(learner_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new learner profile record."""
    try:
        data["learner_id"] = learner_id
        response = supabase.table("learner_profiles").insert(data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create profile for learner {learner_id}: {e}")
        raise


async def update_learner_profile(profile_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an existing learner profile."""
    try:
        response = supabase.table("learner_profiles").update(data).eq("id", profile_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update profile {profile_id}: {e}")
        raise
