"""
Interview Routes — api.md §5

Scaffolded for Phase 0. Full implementation in Phase 4.

Endpoints:
    POST /interview/session                        — Start a new session
    POST /interview/session/{session_id}/answer     — Submit an answer
    GET  /interview/session/{session_id}            — Get transcript + feedback
"""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_learner_id

router = APIRouter(tags=["Interview"])


@router.post("/interview/session")
async def start_interview_session(
    learner_id: str = Depends(get_current_learner_id),
):
    """Start interview session — Phase 4 implementation."""
    return {"error": {"code": "NOT_IMPLEMENTED", "message": "Interview bot available in Phase 4"}}


@router.post("/interview/session/{session_id}/answer")
async def submit_answer(
    session_id: str,
    learner_id: str = Depends(get_current_learner_id),
):
    """Submit interview answer — Phase 4 implementation."""
    return {"error": {"code": "NOT_IMPLEMENTED", "message": "Interview bot available in Phase 4"}}


@router.get("/interview/session/{session_id}")
async def get_interview_session(
    session_id: str,
    learner_id: str = Depends(get_current_learner_id),
):
    """Get interview transcript + feedback — Phase 4 implementation."""
    return {"error": {"code": "NOT_IMPLEMENTED", "message": "Interview bot available in Phase 4"}}
