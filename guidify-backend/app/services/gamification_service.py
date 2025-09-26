from datetime import datetime, timezone, timedelta
from app.services.supabase_client import supabase

class GamificationService:
    @staticmethod
    def sync_login(user_id: str):
        """
        Updates login streak and activity log based on the current login.
        """
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")

        # Fetch current profile data
        response = supabase.table("profiles").select("login_streak, last_login, activity_log").eq("user_id", user_id).single().execute()
        
        if not response.data:
            return None

        profile = response.data
        current_streak = profile.get("login_streak", 0) or 0
        last_login_str = profile.get("last_login")
        activity_log = profile.get("activity_log", {}) or {}

        # Migration: If activity_log is a list (old format), convert to dict
        if isinstance(activity_log, list):
            new_log = {}
            for date in activity_log:
                new_log[date] = 1
            activity_log = new_log

        # Update Activity Log (Heatmap) - Login counts as 1 activity
        current_count = activity_log.get(today_str, 0)
        # Only increment if it's the first login of the day, OR just set to at least 1
        if current_count == 0:
            activity_log[today_str] = 1
        
        # Calculate Streak
        new_streak = current_streak
        
        if last_login_str:
            last_login_date = datetime.fromisoformat(last_login_str.replace('Z', '+00:00')).date()
            current_date = now.date()
            diff = (current_date - last_login_date).days

            if diff == 1:
                # Consecutive day
                new_streak += 1
            elif diff > 1:
                # Missed a day (or more)
                new_streak = 1
            # If diff == 0 (same day), do nothing to streak
        else:
            # First login ever
            new_streak = 1

        # Update Profile
        update_data = {
            "login_streak": new_streak,
            "last_login": now.isoformat(),
            "activity_log": activity_log
        }
        
        supabase.table("profiles").update(update_data).eq("user_id", user_id).execute()
        
        return update_data

    @staticmethod
    def log_activity(user_id: str, weight: int = 1):
        """
        Logs an activity (e.g., completing a task) to increase heatmap intensity.
        """
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")
        
        # Fetch current log
        response = supabase.table("profiles").select("activity_log").eq("user_id", user_id).single().execute()
        if not response.data:
            return
            
        activity_log = response.data.get("activity_log", {}) or {}
        
        # Migration check
        if isinstance(activity_log, list):
            new_log = {}
            for date in activity_log:
                new_log[date] = 1
            activity_log = new_log
            
        # Increment count
        current_count = activity_log.get(today_str, 0)
        activity_log[today_str] = current_count + weight
        
        supabase.table("profiles").update({"activity_log": activity_log}).eq("user_id", user_id).execute()
        return activity_log

    @staticmethod
    def update_task_completion(user_id: str, roadmap_data: dict):
        """
        Updates the career roadmap and recalculates readiness score.
        """
        # Calculate Readiness Score
        tasks = roadmap_data.get("current_tier_tasks", [])
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.get("completed"))
        
        # Simple logic: 20% base + (80% * completion_rate)
        # In a real app, this would be more complex across tiers
        readiness_score = 20 + int(80 * (completed_tasks / total_tasks)) if total_tasks > 0 else 20

        update_data = {
            "career_roadmap": roadmap_data,
            "career_readiness_score": readiness_score
        }
        
        supabase.table("profiles").update(update_data).eq("user_id", user_id).execute()
        
        return {"readiness_score": readiness_score}
