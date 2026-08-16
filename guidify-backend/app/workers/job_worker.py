#!/usr/bin/env python3
"""
Background Job Worker for GUIDIFY

Processes jobs from the job_queue table.
Run as a separate process: python -m app.workers.job_worker

This worker:
1. Polls the job_queue table for pending jobs
2. Claims jobs atomically using the claim_next_job RPC
3. Processes them based on job_type
4. Marks jobs as completed or failed

F-04 FIX: The worker authenticates with the service-role key. The claim/complete
RPCs are service-role only (migration 018) and job_queue RLS requires service_role
to read/manage all jobs, so the previous anon publishable-key client could never
claim a job — it silently no-oped forever.

Requires SUPABASE_SERVICE_ROLE_KEY to be set. The worker exits with a clear
error otherwise rather than failing silently.

For production, consider running multiple workers or using Supabase Edge Functions.
"""

import asyncio
import logging
import signal
import sys
from typing import Any, Dict, Optional

from app.ai_gateway.gateway import gateway
from app.core.config import settings
from app.models.schemas import ResumeParseResponse, ResumeScoreResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("guidify.worker")

# Global flag for graceful shutdown
shutdown = False


def _create_service_client():
    """Create a Supabase client authenticated with the service-role key."""
    from supabase import create_client
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def signal_handler(signum, frame):
    global shutdown
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    shutdown = True


def _rpc(client, fn: str, params: Dict[str, Any]):
    """Run a synchronous RPC call via the service-role client."""
    return client.rpc(fn, params).execute()


def _update_resume(client, resume_id: str, data: Dict[str, Any]) -> None:
    client.table("resumes").update(data).eq("id", resume_id).execute()


def _get_learner_profile(client, learner_id: str) -> Optional[Dict[str, Any]]:
    response = (
        client.table("learner_profiles")
        .select("*")
        .eq("learner_id", learner_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def _update_learner_profile(client, profile_id: str, data: Dict[str, Any]) -> None:
    client.table("learner_profiles").update(data).eq("id", profile_id).execute()


async def process_resume_job(client, job: dict) -> bool:
    """Process a resume processing job."""
    payload = job.get("payload", {})
    resume_id = payload.get("resume_id")
    learner_id = payload.get("learner_id")
    resume_text = payload.get("resume_text")
    target_role = payload.get("target_role", "Software Developer")
    segment = payload.get("segment", "college")
    current_skills = payload.get("current_skills", [])

    if not all([resume_id, learner_id, resume_text]):
        logger.error(f"Invalid resume job payload: {payload}")
        return False

    try:
        parsed_data = None
        try:
            parse_result = await gateway.generate(
                task_type="resume.parse",
                context={"resume_text": resume_text},
                response_model=ResumeParseResponse,
            )
            parsed_data = parse_result
            logger.info(f"Resume parsed successfully for learner {learner_id}")
        except Exception as e:
            logger.warning(f"Resume parsing failed for learner {learner_id}: {e}")

        score_data = None
        if parsed_data:
            try:
                score_result = await gateway.generate(
                    task_type="resume.score",
                    context={
                        "target_role": target_role,
                        "segment": segment,
                        "current_skills": current_skills,
                        "parsed_resume": parsed_data,
                    },
                    response_model=ResumeScoreResponse,
                )
                score_data = score_result
                logger.info(f"Resume scored successfully for learner {learner_id}")
            except Exception as e:
                logger.warning(f"Resume scoring failed for learner {learner_id}: {e}")

        _update_resume(client, resume_id, {
            "parsed_data": parsed_data,
            "score": score_data.get("overall_score") if score_data else None,
            "gap_analysis": score_data,
        })

        profile = _get_learner_profile(client, learner_id)
        if profile and parsed_data:
            update_data = {}
            if parsed_data.get("technical_skills"):
                existing_skills = profile.get("skills", []) or []
                update_data["skills"] = list(set(existing_skills + parsed_data["technical_skills"]))
            update_data["resume_data"] = parsed_data
            if update_data:
                _update_learner_profile(client, profile["id"], update_data)

        return True
    except Exception as e:
        logger.error(f"Resume job processing failed: {e}")
        return False


async def process_job(client, job: dict) -> bool:
    """Route job to appropriate handler based on job_type."""
    job_type = job.get("job_type")

    if job_type == "resume_process":
        return await process_resume_job(client, job)
    else:
        logger.warning(f"Unknown job type: {job_type}")
        return False


async def worker_loop(client, poll_interval: int = 5):
    """Main worker loop - polls for jobs and processes them."""
    logger.info("Job worker started")

    while not shutdown:
        try:
            # Try to claim a job for each supported type
            for job_type in ["resume_process"]:
                try:
                    # Use the claim_next_job RPC for atomic claim
                    response = await asyncio.to_thread(
                        _rpc, client, "claim_next_job",
                        {"p_job_type": job_type, "p_worker_id": "worker-1"},
                    )

                    if response.data:
                        job = response.data
                        job_id = job.get("id")
                        logger.info(f"Claimed job {job_id} of type {job_type}")

                        # Process the job
                        success = await process_job(client, job)

                        # Mark job as completed or failed
                        await asyncio.to_thread(
                            _rpc, client, "complete_job",
                            {
                                "p_job_id": job_id,
                                "p_success": success,
                                "p_error_message": None if success else "Processing failed",
                            },
                        )

                        if success:
                            logger.info(f"Job {job_id} completed successfully")
                        else:
                            logger.warning(f"Job {job_id} failed")

                except Exception as e:
                    # No jobs available or RPC error - continue
                    logger.debug(f"Claim/poll error for {job_type}: {e}")

            # Wait before next poll
            await asyncio.sleep(poll_interval)

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Worker loop error: {e}")
            await asyncio.sleep(poll_interval)

    logger.info("Job worker stopped")


async def main():
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.error(
            "SUPABASE_SERVICE_ROLE_KEY is not set. The job worker requires it to "
            "claim jobs (claim_next_job is service-role only) and write results "
            "(job_queue RLS is service-role only). Exiting — jobs will remain pending."
        )
        return

    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    client = _create_service_client()

    # Run worker loop
    await worker_loop(client)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
