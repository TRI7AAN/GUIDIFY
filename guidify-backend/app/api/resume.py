"""
Resume Routes — api.md §2

Scaffolded for Phase 0. Full implementation in Phase 1.

Endpoints:
    POST /resume/upload     — Multipart upload, async parsing
    GET  /resume/{resume_id} — Get parsed resume + score
    GET  /resume/current    — Get current resume analysis
"""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_learner_id

router = APIRouter(tags=["Resume"])


@router.post("/resume/upload")
async def upload_resume(
    learner_id: str = Depends(get_current_learner_id),
):
    """Upload resume — Phase 1 implementation."""
    # TODO Phase 1: Implement multipart upload → Supabase Storage → AI Gateway resume.parse
    return {"error": {"code": "NOT_IMPLEMENTED", "message": "Resume upload available in Phase 1"}}


@router.get("/resume/{resume_id}")
async def get_resume(
    resume_id: str,
    learner_id: str = Depends(get_current_learner_id),
):
    """Get parsed resume — Phase 1 implementation."""
    return {"error": {"code": "NOT_IMPLEMENTED", "message": "Resume retrieval available in Phase 1"}}


@router.get("/resume/current")
async def get_current_resume(
    learner_id: str = Depends(get_current_learner_id),
):
    """Get current resume analysis — Phase 1 implementation."""
    return {"error": {"code": "NOT_IMPLEMENTED", "message": "Resume analysis available in Phase 1"}}
