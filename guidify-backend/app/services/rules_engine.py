"""
Rules Engine — Adaptation Logic (rules.md)

Evaluates learner performance events and triggers roadmap adaptations.
Per rules.md §1-2:
  - Debounce window: 24-hour minimum between regenerations
  - Failure pattern detection: 3 consecutive failures trigger adaptation
  - Goal change trigger: Immediate full regeneration
  - Skill gap analysis: Real-time gap calculation
Per rules.md §6.1:
  - Delivery-specific remedial mission triggers (2-consecutive-session threshold)
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from app.db import queries
from app.services.roadmap_service import regenerate_roadmap

logger = logging.getLogger("guidify.rules_engine")

# Constants from rules.md
DEBOUNCE_WINDOW_HOURS = 24
FAILURE_THRESHOLD = 3
MIN_MISSION_HISTORY_FOR_ADAPTATION = 3

# Delivery metric thresholds for remedial triggers (rules.md §6.1)
# If metric falls below this value in 2 consecutive sessions → remedial mission
DELIVERY_THRESHOLDS = {
    "eye_contact_pct": 40,        # Below 40% → practice eye contact
    "posture_score": 0.5,         # Below 0.5 → practice posture
    "filler_word_rate": 0.1,      # Above 10% → practice reducing fillers
    "words_per_minute": 100,      # Below 100 WPM → practice pacing
}
DELIVERY_CONSECUTIVE_SESSIONS = 2


class RulesEngine:
    """
    Adaptation Engine — evaluates events and decides whether to regenerate roadmap.
    
    Per rules.md §1-2:
    - Four trigger categories with concrete rules
    - Guardrails against regeneration thrash
    - Always additive to history (no deletions)
    """

    async def evaluate_and_trigger(
        self,
        learner_id: str,
        event_type: str,
        event_payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Main entry point: evaluate an event and determine if adaptation is needed.
        
        Args:
            learner_id: The learner's ID
            event_type: Type of event (from event_log schema)
            event_payload: Event-specific data
            
        Returns:
            Dict with adaptation decision and details
        """
        # Log the event
        await queries.create_event(learner_id, event_type, event_payload)

        # Get learner context
        learner = await queries.get_learner(learner_id)
        if not learner:
            return {"adaptation_needed": False, "reason": "Learner not found"}

        # Check each trigger condition
        adaptation = await self._check_triggers(learner_id, event_type, event_payload, learner)
        
        return adaptation

    async def _check_triggers(
        self,
        learner_id: str,
        event_type: str,
        payload: Dict[str, Any],
        learner: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Check all trigger conditions and return adaptation decision.
        
        Per rules.md §1:
        1.1 Completes faster → advance difficulty
        1.2 Fails assessments → insert remedial missions
        1.3 Changes career goal → full regeneration
        1.4 Uploads certificate → update skill gaps
        """
        
        # §1.3: Goal change → ALWAYS triggers full regeneration (bypasses debounce)
        if event_type == "target_role_changed":
            return await self._handle_goal_change(learner_id, payload)
        
        # §1.2: Failure pattern detection (3 consecutive failures)
        if event_type in ("mission_failed", "mission_too_hard"):
            return await self._handle_failure_pattern(learner_id, event_type, payload)
        
        # §1.1: Fast completion pattern (3 consecutive fast completions)
        if event_type == "mission_completed":
            return await self._handle_fast_completion(learner_id, payload)
        
        # §1.4: Certificate upload → update skill gaps
        if event_type == "certificate_uploaded":
            return await self._handle_certificate_upload(learner_id, payload)
        
        # §6.1: Delivery metrics submitted → check for remedial triggers
        if event_type == "delivery_metrics_submitted":
            return await self._check_delivery_triggers(learner_id, payload)
        
        # Default: no adaptation needed
        return {"adaptation_needed": False, "reason": "No trigger matched"}

    async def _handle_goal_change(
        self,
        learner_id: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        §1.3: Changes career goal → full regeneration.
        Bypasses debounce window — always triggers.
        """
        logger.info(f"Goal change detected for learner {learner_id}")
        
        # Get current active roadmap
        roadmap = await queries.get_active_roadmap(learner_id)
        if not roadmap:
            return {"adaptation_needed": False, "reason": "No active roadmap to regenerate"}
        
        # Check minimum mission history (§2)
        recent_missions = await queries.get_recent_missions(learner_id, limit=MIN_MISSION_HISTORY_FOR_ADAPTATION)
        if len(recent_missions) < MIN_MISSION_HISTORY_FOR_ADAPTATION:
            return {
                "adaptation_needed": False,
                "reason": f"Need at least {MIN_MISSION_HISTORY_FOR_ADAPTATION} missions before regeneration"
            }

        # F-09 FIX: actually regenerate the roadmap (rules.md §1.3). Previously
        # the engine only returned an adaptation_needed decision and no caller
        # ever regenerated, so a target-role change never produced a new roadmap.
        outcome = await regenerate_roadmap(
            learner_id=learner_id,
            trigger_reason="goal_change",
            bypass_debounce=True,
        )
        if outcome.get("status") != "ok":
            logger.error(f"Goal-change regeneration failed for {learner_id}: {outcome.get('message')}")

        return {
            "adaptation_needed": outcome.get("status") == "ok",
            "trigger": "goal_change",
            "regeneration_type": "full",
            "reason": f"Target role changed to {payload.get('new_target_role', 'unknown')}",
            "bypass_debounce": True,  # §1.3 always bypasses
            "regeneration_status": outcome.get("status"),
            "roadmap_id": outcome.get("roadmap_id"),
        }

    async def _handle_failure_pattern(
        self,
        learner_id: str,
        event_type: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        §1.2: Fails assessments → insert remedial missions first.
        Only triggers full regeneration if 3+ consecutive failures.
        """
        # Check debounce (§2)
        if await self._is_in_debounce_window(learner_id):
            return {
                "adaptation_needed": False,
                "reason": "In debounce window (24h minimum between regenerations)"
            }
        
        # Count consecutive failures
        consecutive_failures = await self._count_consecutive_failures(learner_id)
        
        if consecutive_failures >= FAILURE_THRESHOLD:
            logger.info(f"Failure threshold reached for learner {learner_id}: {consecutive_failures} consecutive")
            return {
                "adaptation_needed": True,
                "trigger": "failure_pattern",
                "regeneration_type": "targeted",  # Insert remedial, not full regen
                "reason": f"{consecutive_failures} consecutive mission failures",
                "consecutive_failures": consecutive_failures,
            }
        
        return {
            "adaptation_needed": False,
            "reason": f"Consecutive failures ({consecutive_failures}) below threshold ({FAILURE_THRESHOLD})"
        }

    async def _handle_fast_completion(
        self,
        learner_id: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        §1.1: Completes faster than expected → advance difficulty.
        Only triggers if 3+ consecutive missions completed in <50% estimated time.
        """
        # Check debounce (§2)
        if await self._is_in_debounce_window(learner_id):
            return {
                "adaptation_needed": False,
                "reason": "In debounce window (24h minimum between regenerations)"
            }
        
        # Check for fast completion pattern
        fast_streak = await self._count_fast_completions(learner_id)
        
        if fast_streak >= 3:
            logger.info(f"Fast completion pattern detected for learner {learner_id}: {fast_streak} missions")
            return {
                "adaptation_needed": True,
                "trigger": "fast_completion",
                "regeneration_type": "difficulty_advance",
                "reason": f"{fast_streak} missions completed significantly ahead of schedule",
                "fast_streak": fast_streak,
            }
        
        return {
            "adaptation_needed": False,
            "reason": f"Fast completion streak ({fast_streak}) below threshold (3)"
        }

    async def _handle_certificate_upload(
        self,
        learner_id: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        §1.4: Uploads certificate → update skill gaps.
        Does NOT trigger full regeneration — just skill gap recalculation.
        """
        logger.info(f"Certificate uploaded for learner {learner_id}")
        
        # Calculate skill gap with new certificate
        skill_gap = await self.calculate_skill_gap(learner_id)
        
        return {
            "adaptation_needed": True,
            "trigger": "certificate_upload",
            "regeneration_type": "skill_update",  # Not full regen
            "reason": "New certificate may close skill gaps",
            "skill_gap": skill_gap,
        }

    async def _is_in_debounce_window(self, learner_id: str) -> bool:
        """
        §2: No more than one full roadmap regeneration per learner per 24 hours.
        """
        last_regeneration = await queries.get_last_regeneration(learner_id)
        if not last_regeneration:
            return False
        
        last_time = datetime.fromisoformat(last_regeneration.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        
        return (now - last_time) < timedelta(hours=DEBOUNCE_WINDOW_HOURS)

    async def _count_consecutive_failures(self, learner_id: str) -> int:
        """Count consecutive failed/too_hard missions from most recent."""
        recent = await queries.get_recent_missions(learner_id, limit=10)
        count = 0
        for mission in recent:
            if mission.get("status") in ("failed", "too_hard"):
                count += 1
            else:
                break
        return count

    async def _count_fast_completions(self, learner_id: str) -> int:
        """
        Count consecutive missions completed in <50% estimated time.
        Requires time_spent_minutes to be logged.
        """
        recent = await queries.get_recent_missions(learner_id, limit=10)
        count = 0
        
        for mission in recent:
            if mission.get("status") != "completed":
                break
            
            time_spent = mission.get("time_spent_minutes")
            estimated = mission.get("estimated_minutes", 30)
            
            if time_spent and estimated > 0 and time_spent < (estimated * 0.5):
                count += 1
            else:
                break
        
        return count

    async def calculate_skill_gap(
        self,
        learner_id: str,
    ) -> Dict[str, Any]:
        """
        §4: Skill Gap Analysis Service.
        Calculate real-time gap between learner's current skills and target role requirements.
        """
        # Get learner profile
        profile = await queries.get_learner_profile(learner_id)
        learner = await queries.get_learner(learner_id)
        
        if not profile or not learner:
            return {"current_skills": [], "required_skills": [], "gaps": []}
        
        target_role = learner.get("target_role")
        if not target_role:
            return {"current_skills": [], "required_skills": [], "gaps": []}
        
        # Get baseline for target role
        baseline = await queries.get_skill_baseline(target_role)
        if not baseline:
            return {
                "current_skills": profile.get("skills", []),
                "required_skills": [],
                "gaps": [],
                "note": "No baseline found for target role"
            }
        
        current_skills = set(profile.get("skills", []))
        required_skills = set(baseline.get("required_skills", []))
        
        # Calculate gaps
        gaps = list(required_skills - current_skills)
        matched = list(required_skills & current_skills)
        
        return {
            "current_skills": list(current_skills),
            "required_skills": list(required_skills),
            "matched_skills": matched,
            "gaps": gaps,
            "gap_count": len(gaps),
            "match_count": len(matched),
            "completion_pct": int((len(matched) / len(required_skills) * 100)) if required_skills else 100,
        }

    async def get_adaptation_status(self, learner_id: str) -> Dict[str, Any]:
        """
        Get current adaptation status for a learner.
        Returns debounce status, recent events, and skill gap.
        """
        # Run all independent DB calls in parallel
        in_debounce, last_regeneration, recent_events, consecutive_failures, skill_gap = await asyncio.gather(
            self._is_in_debounce_window(learner_id),
            queries.get_last_regeneration(learner_id),
            queries.get_recent_events(learner_id, limit=10),
            self._count_consecutive_failures(learner_id),
            self.calculate_skill_gap(learner_id),
        )

        return {
            "in_debounce_window": in_debounce,
            "last_regeneration": last_regeneration,
            "consecutive_failures": consecutive_failures,
            "failure_threshold": FAILURE_THRESHOLD,
            "recent_events": recent_events,
            "skill_gap": skill_gap,
        }

    async def _check_delivery_triggers(
        self,
        learner_id: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        §6.1: Check if delivery metrics across consecutive sessions trigger a remedial mission.
        If any single metric falls below its threshold in 2 consecutive camera-enabled sessions,
        queue a targeted remedial mission for that metric.
        """
        # Get recent camera-enabled sessions with delivery metrics
        sessions = await queries.get_interview_history(learner_id, limit=10)
        camera_sessions = [
            s for s in sessions
            if s.get("camera_enabled") and s.get("delivery_metrics") and s.get("status") == "completed"
        ]

        if len(camera_sessions) < DELIVERY_CONSECUTIVE_SESSIONS:
            return {"adaptation_needed": False, "reason": "Not enough camera sessions for delivery trigger"}

        # Check the most recent N sessions for consecutive threshold violations
        recent = camera_sessions[:DELIVERY_CONSECUTIVE_SESSIONS]
        triggered_metrics = []

        for metric_name, threshold in DELIVERY_THRESHOLDS.items():
            violations = 0
            for session in recent:
                dm = session.get("delivery_metrics", {})
                value = dm.get(metric_name)
                if value is None:
                    break

                # For most metrics, below threshold is bad; for filler_word_rate, above is bad
                if metric_name == "filler_word_rate":
                    if value > threshold:
                        violations += 1
                elif metric_name == "words_per_minute":
                    if value < threshold:
                        violations += 1
                else:
                    if value < threshold:
                        violations += 1

            if violations >= DELIVERY_CONSECUTIVE_SESSIONS:
                triggered_metrics.append(metric_name)

        if triggered_metrics:
            logger.info(f"Delivery remedial triggers for {learner_id}: {triggered_metrics}")
            return {
                "adaptation_needed": True,
                "trigger": "delivery_metrics",
                "regeneration_type": "remedial_mission",
                "reason": f"Delivery metrics below threshold for {len(triggered_metrics)} metric(s) across {DELIVERY_CONSECUTIVE_SESSIONS} sessions",
                "triggered_metrics": triggered_metrics,
            }

        return {"adaptation_needed": False, "reason": "No delivery metric threshold violations"}
