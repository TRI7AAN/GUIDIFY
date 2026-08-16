"""
Database Layer — Supabase RLS-Aware Queries

Provides typed query helpers for the schema.md tables.
All queries operate through the Supabase client with RLS enforcement.

Per techspec.md §7: Every table with learner data is scoped by auth.uid().
"""

import asyncio
from typing import Any, Dict, List, Optional
import logging

from app.services.supabase_client import db

logger = logging.getLogger("guidify.db")

# Use the request-scoped publishable-key client for all server-side queries.
# RLS is enforced and resolves auth.uid() to the validated request JWT, so:
# 1. Auth middleware already validates the JWT and extracts learner_id
# 2. All query functions filter by learner_id parameter
supabase = db


async def _run_query(query_builder):
    """Run a synchronous Supabase query in a thread pool to avoid blocking the event loop."""
    return await asyncio.to_thread(query_builder.execute)


# --- Learners (schema.md §1) ---

async def get_learner(learner_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a learner record by ID."""
    try:
        response = await _run_query(supabase.table("learners").select("*").eq("id", learner_id).single())
        return response.data if response.data else None
    except Exception as e:
        logger.error(f"Failed to fetch learner {learner_id}: {e}")
        return None


async def upsert_learner(learner_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create or update a learner record."""
    try:
        data["id"] = learner_id
        response = await _run_query(supabase.table("learners").upsert(data))
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to upsert learner {learner_id}: {e}")
        raise


async def update_learner(learner_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update specific fields on a learner record."""
    try:
        response = await _run_query(supabase.table("learners").update(data).eq("id", learner_id))
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update learner {learner_id}: {e}")
        raise


# --- Learner Profiles (schema.md §2) ---

async def get_learner_profile(learner_id: str) -> Optional[Dict[str, Any]]:
    """Fetch the learner profile for a given learner."""
    try:
        response = await _run_query(
            supabase.table("learner_profiles")
            .select("*")
            .eq("learner_id", learner_id)
            .order("created_at", desc=True)
            .limit(1)
        )
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to fetch profile for learner {learner_id}: {e}")
        return None


async def create_learner_profile(learner_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new learner profile record."""
    try:
        data["learner_id"] = learner_id
        response = await _run_query(supabase.table("learner_profiles").insert(data))
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create profile for learner {learner_id}: {e}")
        raise


async def update_learner_profile(profile_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an existing learner profile."""
    try:
        response = await _run_query(supabase.table("learner_profiles").update(data).eq("id", profile_id))
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update profile {profile_id}: {e}")
        raise


# --- Roadmaps (schema.md §3) ---

async def get_active_roadmap(learner_id: str) -> Optional[Dict[str, Any]]:
    """Fetch the active (non-superseded) roadmap for a learner."""
    try:
        response = await _run_query(
            supabase.table("roadmaps")
            .select("*")
            .eq("learner_id", learner_id)
            .eq("status", "active")
            .order("version", desc=True)
            .limit(1)
        )
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to fetch active roadmap for {learner_id}: {e}")
        return None


async def create_roadmap(learner_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new roadmap, superseding any previous active one (atomic via RPC)."""
    try:
        # Use atomic RPC function if available, fallback to legacy implementation
        try:
            response = await _run_query(
                supabase.rpc("create_roadmap_atomic", {
                    "p_learner_id": learner_id,
                    "p_title": data.get("title", "Career Roadmap"),
                    "p_total_phases": data.get("total_phases", 0),
                    "p_estimated_weeks": data.get("estimated_weeks", 0),
                    "p_phases": data.get("phases", []),
                    "p_trigger_reason": data.get("trigger_reason", "manual"),
                    "p_current_phase_number": data.get("current_phase_number", 1),
                    "p_progress_pct": data.get("progress_pct", 0),
                })
            )
            if response.data:
                return response.data
        except Exception:
            # Fallback to legacy implementation if RPC doesn't exist
            pass

        # Legacy implementation (non-atomic)
        # First, supersede any existing active roadmap
        await _run_query(
            supabase.table("roadmaps").update(
                {"status": "superseded"}
            ).eq("learner_id", learner_id).eq("status", "active")
        )

        # Get next version number
        existing = await _run_query(
            supabase.table("roadmaps").select("version").eq(
                "learner_id", learner_id
            ).order("version", desc=True).limit(1)
        )
        next_version = (existing.data[0]["version"] + 1) if existing.data else 1

        # Create new roadmap
        data["learner_id"] = learner_id
        data["version"] = next_version
        data["status"] = "active"
        response = await _run_query(supabase.table("roadmaps").insert(data))
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create roadmap for {learner_id}: {e}")
        raise


async def get_roadmap_history(learner_id: str) -> List[Dict[str, Any]]:
    """Fetch all roadmap versions for a learner, newest first."""
    try:
        response = await _run_query(
            supabase.table("roadmaps")
            .select("id, title, version, status, trigger_reason, created_at")
            .eq("learner_id", learner_id)
            .order("version", desc=True)
        )
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Failed to fetch roadmap history for {learner_id}: {e}")
        return []


# --- Daily Missions (schema.md §4) ---

async def get_todays_mission(learner_id: str) -> Optional[Dict[str, Any]]:
    """Fetch today's mission for a learner (pending or in_progress)."""
    from datetime import date
    today = date.today().isoformat()
    try:
        response = await _run_query(
            supabase.table("daily_missions")
            .select("*")
            .eq("learner_id", learner_id)
            .eq("assigned_date", today)
            .in_("status", ["pending", "in_progress"])
            .limit(1)
        )
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to fetch today's mission for {learner_id}: {e}")
        return None


async def get_todays_completed_mission(learner_id: str) -> Optional[Dict[str, Any]]:
    """Fetch today's already-completed mission (to show status, not regenerate)."""
    from datetime import date
    today = date.today().isoformat()
    try:
        response = await _run_query(
            supabase.table("daily_missions")
            .select("*")
            .eq("learner_id", learner_id)
            .eq("assigned_date", today)
            .in_("status", ["completed", "skipped", "failed"])
            .order("created_at", desc=True)
            .limit(1)
        )
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to fetch completed mission for {learner_id}: {e}")
        return None


async def create_mission(learner_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new daily mission."""
    try:
        data["learner_id"] = learner_id
        response = await _run_query(supabase.table("daily_missions").insert(data))
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create mission for {learner_id}: {e}")
        raise


async def update_mission_status(
    mission_id: str,
    learner_id: str,
    status: str,
    notes: Optional[str] = None,
    time_spent: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """Update mission status — used for failed/skipped/too_hard."""
    try:
        update_data: Dict[str, Any] = {"status": status}
        if notes:
            update_data["completion_notes"] = notes
        if time_spent:
            update_data["time_spent_minutes"] = time_spent
        response = await _run_query(
            supabase.table("daily_missions")
            .update(update_data)
            .eq("id", mission_id)
            .eq("learner_id", learner_id)
        )
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update mission {mission_id}: {e}")
        raise


async def complete_mission(
    mission_id: str,
    learner_id: str,
    notes: Optional[str] = None,
    time_spent: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """Mark a mission as completed with timestamp."""
    from datetime import datetime, timezone
    try:
        update_data: Dict[str, Any] = {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        if notes:
            update_data["completion_notes"] = notes
        if time_spent:
            update_data["time_spent_minutes"] = time_spent
        response = await _run_query(
            supabase.table("daily_missions")
            .update(update_data)
            .eq("id", mission_id)
            .eq("learner_id", learner_id)
        )
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to complete mission {mission_id}: {e}")
        raise


async def get_recent_missions(learner_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Fetch recent missions for AI context (to avoid repetition and gauge difficulty)."""
    try:
        response = await _run_query(
            supabase.table("daily_missions")
            .select("title, target_skill, difficulty, status, assigned_date")
            .eq("learner_id", learner_id)
            .order("assigned_date", desc=True)
            .limit(limit)
        )
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Failed to fetch recent missions for {learner_id}: {e}")
        return []


async def get_mission_by_id(mission_id: str, learner_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a specific mission by ID (scoped to learner)."""
    try:
        response = await _run_query(
            supabase.table("daily_missions")
            .select("*")
            .eq("id", mission_id)
            .eq("learner_id", learner_id)
            .single()
        )
        return response.data if response.data else None
    except Exception as e:
        logger.error(f"Failed to fetch mission {mission_id}: {e}")
        return None


async def calculate_streak(learner_id: str) -> int:
    """Calculate the current consecutive-day completion streak (via SQL RPC)."""
    try:
        # Use optimized SQL function if available
        try:
            response = await _run_query(
                supabase.rpc("calculate_streak_sql", {"p_learner_id": learner_id})
            )
            if response.data is not None:
                return int(response.data)
        except Exception:
            # Fallback to Python implementation if RPC doesn't exist
            pass

        # Legacy Python implementation
        from datetime import date, timedelta
        response = await _run_query(
            supabase.table("daily_missions")
            .select("assigned_date, status")
            .eq("learner_id", learner_id)
            .eq("status", "completed")
            .order("assigned_date", desc=True)
            .limit(90)
        )
        if not response.data:
            return 0

        completed_dates = set(row["assigned_date"] for row in response.data)
        today = date.today()
        streak = 0

        check_date = today
        if today.isoformat() not in completed_dates:
            check_date = today - timedelta(days=1)
            if check_date.isoformat() not in completed_dates:
                return 0

        while check_date.isoformat() in completed_dates:
            streak += 1
            check_date -= timedelta(days=1)

        return streak
    except Exception as e:
        logger.error(f"Failed to calculate streak for {learner_id}: {e}")
        return 0


# --- Resumes (schema.md §3) ---

async def create_resume(learner_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new resume record."""
    try:
        data["learner_id"] = learner_id
        response = await _run_query(supabase.table("resumes").insert(data))
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create resume for {learner_id}: {e}")
        raise


async def get_resume_by_id(resume_id: str, learner_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a specific resume by ID (scoped to learner)."""
    try:
        response = await _run_query(
            supabase.table("resumes")
            .select("*")
            .eq("id", resume_id)
            .eq("learner_id", learner_id)
            .single()
        )
        return response.data if response.data else None
    except Exception as e:
        logger.error(f"Failed to fetch resume {resume_id}: {e}")
        return None


async def get_current_resume(learner_id: str) -> Optional[Dict[str, Any]]:
    """Fetch the current (most recent active) resume for a learner."""
    try:
        response = await _run_query(
            supabase.table("resumes")
            .select("*")
            .eq("learner_id", learner_id)
            .eq("is_current", True)
            .order("created_at", desc=True)
            .limit(1)
        )
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to fetch current resume for {learner_id}: {e}")
        return None


async def get_resume_history(learner_id: str) -> List[Dict[str, Any]]:
    """Fetch all resumes for a learner, newest first."""
    try:
        response = await _run_query(
            supabase.table("resumes")
            .select("id, file_name, score, is_current, created_at")
            .eq("learner_id", learner_id)
            .order("created_at", desc=True)
        )
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Failed to fetch resume history for {learner_id}: {e}")
        return []


async def update_resume(resume_id: str, learner_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a resume record (parsed_data, score, gap_analysis)."""
    try:
        response = await _run_query(
            supabase.table("resumes")
            .update(data)
            .eq("id", resume_id)
            .eq("learner_id", learner_id)
        )
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update resume {resume_id}: {e}")
        raise


async def set_current_resume(resume_id: str, learner_id: str) -> bool:
    """Mark a resume as current (unmarks previous current) - atomic via RPC."""
    try:
        # Use atomic RPC function if available, fallback to legacy implementation
        try:
            response = await _run_query(
                supabase.rpc("set_current_resume_atomic", {
                    "p_resume_id": resume_id,
                    "p_learner_id": learner_id,
                })
            )
            return response.data is not None
        except Exception:
            # Fallback to legacy implementation if RPC doesn't exist
            pass

        # Legacy implementation (non-atomic)
        # Unmark all current resumes for this learner
        await _run_query(
            supabase.table("resumes").update(
                {"is_current": False}
            ).eq("learner_id", learner_id).eq("is_current", True)
        )

        # Mark the target resume as current
        await _run_query(
            supabase.table("resumes").update(
                {"is_current": True}
            ).eq("id", resume_id).eq("learner_id", learner_id)
        )

        return True
    except Exception as e:
        logger.error(f"Failed to set current resume {resume_id}: {e}")
        return False


# --- Event Log (schema.md §7) ---

async def create_event(
    learner_id: str,
    event_type: str,
    payload: Dict[str, Any],
    related_mission_id: Optional[str] = None,
    related_roadmap_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Create a new event log entry."""
    try:
        event_data: Dict[str, Any] = {
            "learner_id": learner_id,
            "event_type": event_type,
            "payload": payload,
        }
        if related_mission_id:
            event_data["related_mission_id"] = related_mission_id
        if related_roadmap_id:
            event_data["related_roadmap_id"] = related_roadmap_id
        
        response = await _run_query(supabase.table("event_log").insert(event_data))
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create event for {learner_id}: {e}")
        raise


async def get_recent_events(learner_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Fetch recent events for a learner, newest first."""
    try:
        response = await _run_query(
            supabase.table("event_log")
            .select("id, event_type, payload, created_at")
            .eq("learner_id", learner_id)
            .order("created_at", desc=True)
            .limit(limit)
        )
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Failed to fetch recent events for {learner_id}: {e}")
        return []


async def get_events_by_type(
    learner_id: str,
    event_type: str,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """Fetch events of a specific type for a learner."""
    try:
        response = await _run_query(
            supabase.table("event_log")
            .select("id, event_type, payload, created_at")
            .eq("learner_id", learner_id)
            .eq("event_type", event_type)
            .order("created_at", desc=True)
            .limit(limit)
        )
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Failed to fetch {event_type} events for {learner_id}: {e}")
        return []


async def get_last_regeneration(learner_id: str) -> Optional[str]:
    """Get the timestamp of the last roadmap regeneration for debounce check."""
    try:
        response = await _run_query(
            supabase.table("event_log")
            .select("created_at")
            .eq("learner_id", learner_id)
            .eq("event_type", "roadmap_regenerated")
            .order("created_at", desc=True)
            .limit(1)
        )
        if response.data and len(response.data) > 0:
            return response.data[0].get("created_at")
        return None
    except Exception as e:
        logger.error(f"Failed to fetch last regeneration for {learner_id}: {e}")
        return None


# --- Job Queue ---

async def create_job(
    job_type: str,
    learner_id: str,
    payload: Dict[str, Any],
    resume_id: Optional[str] = None,
    roadmap_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Create a new job in the job queue."""
    try:
        job_data: Dict[str, Any] = {
            "job_type": job_type,
            "learner_id": learner_id,
            "payload": payload,
        }
        if resume_id:
            job_data["resume_id"] = resume_id
        if roadmap_id:
            job_data["roadmap_id"] = roadmap_id

        response = await _run_query(supabase.table("job_queue").insert(job_data))
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create job for learner {learner_id}: {e}")
        raise


# --- Skill Baselines (schema.md §9) ---

async def get_skill_baseline(role_or_company: str) -> Optional[Dict[str, Any]]:
    """Fetch skill baseline for a target role or company."""
    try:
        response = await _run_query(
            supabase.table("skill_baselines")
            .select("*")
            .eq("role_or_company", role_or_company)
            .limit(1)
        )
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to fetch skill baseline for {role_or_company}: {e}")
        return None


async def create_skill_baseline(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create or update a skill baseline entry."""
    try:
        response = await _run_query(supabase.table("skill_baselines").upsert(data))
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create skill baseline: {e}")
        raise


# --- Interview Sessions (schema.md §8) ---

async def create_interview_session(learner_id: str, track: str) -> Optional[Dict[str, Any]]:
    """Create a new interview session."""
    try:
        response = await _run_query(
            supabase.table("interview_sessions")
            .insert({"learner_id": learner_id, "track": track})
        )
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create interview session: {e}")
        return None


async def get_interview_session(session_id: str, learner_id: str) -> Optional[Dict[str, Any]]:
    """Fetch an interview session by ID, scoped to learner."""
    try:
        response = await _run_query(
            supabase.table("interview_sessions")
            .select("*")
            .eq("id", session_id)
            .eq("learner_id", learner_id)
            .single()
        )
        return response.data if response.data else None
    except Exception as e:
        logger.error(f"Failed to fetch interview session {session_id}: {e}")
        return None


async def update_interview_session(session_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an interview session (transcript, status, feedback)."""
    try:
        response = await _run_query(
            supabase.table("interview_sessions")
            .update(data)
            .eq("id", session_id)
        )
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update interview session {session_id}: {e}")
        return None


async def get_interview_history(learner_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Get recent interview sessions for a learner."""
    try:
        response = await _run_query(
            supabase.table("interview_sessions")
            .select("id, status, delivery_metrics, created_at, readiness_subscore, camera_enabled, track")
            .eq("learner_id", learner_id)
            .order("created_at", desc=True)
            .limit(limit)
        )
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Failed to fetch interview history for {learner_id}: {e}")
        return []


# --- Activity Heatmap (api.md §6) ---

async def get_daily_activity(learner_id: str) -> Dict[str, int]:
    """
    Aggregate daily activity counts over the last ~365 days for the contribution heatmap.

    Sources (each counts as one activity):
      - daily_missions (completed / in_progress / skipped on assigned_date)
      - interview_sessions (created_at)
      - event_log entries (created_at)

    Returns a dict of {"YYYY-MM-DD": count} for dates with activity.
    """
    from datetime import date, datetime, timedelta, timezone

    cut_off = (date.today() - timedelta(days=365)).isoformat()
    activity: Dict[str, int] = {}

    def _bump(dt_value):
        """Extract a date key from an ISO datetime or date string and increment count."""
        if not dt_value:
            return
        value = str(dt_value)
        if len(value) >= 10:
            day_key = value[:10]
        else:
            return
        try:
            parsed = datetime.fromisoformat(day_key).date()
        except ValueError:
            parsed = date.fromisoformat(day_key)
        if parsed >= date.fromisoformat(cut_off) and parsed <= date.today():
            activity[day_key] = activity.get(day_key, 0) + 1

    async def _fetch_missions():
        try:
            response = await _run_query(
                supabase.table("daily_missions")
                .select("assigned_date, status")
                .eq("learner_id", learner_id)
                .gte("assigned_date", cut_off)
            )
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to fetch missions for heatmap: {e}")
            return []

    async def _fetch_interviews():
        try:
            response = await _run_query(
                supabase.table("interview_sessions")
                .select("created_at")
                .eq("learner_id", learner_id)
                .gte("created_at", cut_off)
            )
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to fetch interviews for heatmap: {e}")
            return []

    async def _fetch_events():
        try:
            response = await _run_query(
                supabase.table("event_log")
                .select("created_at")
                .eq("learner_id", learner_id)
                .gte("created_at", cut_off)
            )
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to fetch events for heatmap: {e}")
            return []

    missions, interviews, events = await asyncio.gather(
        _fetch_missions(), _fetch_interviews(), _fetch_events()
    )

    for row in missions:
        _bump(row.get("assigned_date"))
    for row in interviews:
        _bump(row.get("created_at"))
    for row in events:
        _bump(row.get("created_at"))

    return activity

