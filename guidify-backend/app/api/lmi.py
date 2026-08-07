"""
LMI Routes — labour market intelligence

Restored from the original `app/routes/lmi_routes.py` (dropped during the
routes -> api refactor). Exposes skills-demand trend data backed by
`lmi_service`.
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.middleware.auth import get_current_user
from app.services.lmi_service import lmi_service

logger = logging.getLogger("guidify.api.lmi")

router = APIRouter(tags=["LMI"])


@router.get("/lmi/skills-trend")
async def get_skills_trend(
    skill: str,
    period: str = "current",
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Get market demand trend for a specific skill."""
    return lmi_service.get_skills_trend(skill, period)
