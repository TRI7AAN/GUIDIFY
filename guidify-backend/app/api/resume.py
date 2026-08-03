"""
Resume Routes — api.md §2

Full implementation: Upload, parse, score, and retrieve resumes.

Endpoints:
    POST /resume/upload      — Multipart upload; stores file and returns immediately
                               with status "processing". Parsing + scoring run
                               asynchronously in the background (api.md §2).
    GET  /resume/current     — Get current resume analysis
    GET  /resume/history     — Get resume upload history
    GET  /resume/{resume_id} — Get parsed resume + score by ID
"""

import asyncio
import logging

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Request

from app.core.auth import get_current_learner_id
from app.core.exceptions import ResourceNotFoundError, AIServiceError
from app.core.rate_limit import limiter
from app.db import queries
from app.ai_gateway.gateway import gateway
from app.models.schemas import (
    ResumeUploadResponse,
    ResumeResponse,
    ResumeParseResponse,
    ResumeScoreResponse,
    JDMatchRequest,
    JDMatchResponse,
)
from app.utils.file_parser import extract_text_from_file
from app.utils.helpers import save_uploaded_file, cleanup_temp_file

logger = logging.getLogger("guidify.api.resume")

router = APIRouter(tags=["Resume"])

# Keep references to background AI tasks so they aren't garbage-collected mid-run
_background_tasks: set = set()


@router.post("/resume/upload", response_model=ResumeUploadResponse)
@limiter.limit("5/hour")
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Upload resume — returns immediately; AI parsing/scoring runs async (api.md §2).

    Flow:
    1. Save file to temp location with security validation
    2. Extract text from PDF/DOCX
    3. Store file metadata in resumes table (status: processing)
    4. Kick off background task that parses + scores via AI Gateway
    5. Return { id, status: "processing" } — client polls GET /resume/{id}
    """
    temp_path = None
    try:
        temp_path = await save_uploaded_file(file, directory="/tmp/guidify_resumes")

        resume_text = extract_text_from_file(temp_path)
        if not resume_text or len(resume_text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Could not extract meaningful text from the uploaded file. Please ensure the resume is not image-based."
            )

        profile = await queries.get_learner_profile(learner_id)
        learner = await queries.get_learner(learner_id)

        target_role = learner.get("target_role", "Software Developer") if learner else "Software Developer"
        segment = learner.get("segment", "college") if learner else "college"
        current_skills = profile.get("skills", []) if profile else []

        storage_path = f"resumes/{learner_id}/{file.filename}"
        resume_record = await queries.create_resume(learner_id, {
            "storage_path": storage_path,
            "file_name": file.filename or "resume",
            "file_size_bytes": len(resume_text),
            "mime_type": file.content_type or "",
            "is_current": True,
        })

        if not resume_record:
            raise HTTPException(status_code=500, detail="Failed to store resume record")

        task = asyncio.create_task(
            _process_resume_async(
                resume_id=resume_record["id"],
                learner_id=learner_id,
                resume_text=resume_text,
                target_role=target_role,
                segment=segment,
                current_skills=current_skills,
            )
        )
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)

        return ResumeUploadResponse(
            id=resume_record["id"],
            file_name=file.filename or "resume",
            storage_path=storage_path,
            status="processing",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume upload failed for learner {learner_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Resume upload failed: {str(e)}")
    finally:
        if temp_path:
            cleanup_temp_file(temp_path)


async def _process_resume_async(
    resume_id: str,
    learner_id: str,
    resume_text: str,
    target_role: str,
    segment: str,
    current_skills: list,
) -> None:
    """Parse + score a resume in the background, then persist the results."""
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
        except AIServiceError as e:
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
            except AIServiceError as e:
                logger.warning(f"Resume scoring failed for learner {learner_id}: {e}")

        await queries.update_resume(resume_id, learner_id, {
            "parsed_data": parsed_data,
            "score": score_data.get("overall_score") if score_data else None,
            "gap_analysis": score_data,
        })

        profile = await queries.get_learner_profile(learner_id)
        if profile and parsed_data:
            update_data = {}
            if parsed_data.get("technical_skills"):
                existing_skills = profile.get("skills", []) or []
                update_data["skills"] = list(set(existing_skills + parsed_data["technical_skills"]))
            update_data["resume_data"] = parsed_data
            if update_data:
                await queries.update_learner_profile(profile["id"], update_data)
    except Exception as e:
        logger.error(f"Background resume processing failed for learner {learner_id}: {e}")


@router.get("/resume/current", response_model=ResumeResponse)
async def get_current_resume(
    learner_id: str = Depends(get_current_learner_id),
):
    """Get the current (most recent active) resume analysis."""
    resume = await queries.get_current_resume(learner_id)
    if not resume:
        raise ResourceNotFoundError("Resume")
    return _build_resume_response(resume)


@router.get("/resume/history")
async def get_resume_history(
    learner_id: str = Depends(get_current_learner_id),
):
    """Get resume upload history for the learner."""
    history = await queries.get_resume_history(learner_id)
    return {"resumes": history}


@router.get("/resume/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: str,
    learner_id: str = Depends(get_current_learner_id),
):
    """Get a specific resume by ID."""
    resume = await queries.get_resume_by_id(resume_id, learner_id)
    if not resume:
        raise ResourceNotFoundError("Resume")
    return _build_resume_response(resume)


def _build_resume_response(resume: dict) -> ResumeResponse:
    """Build a ResumeResponse with derived processing status."""
    parsed_data = None
    if resume.get("parsed_data"):
        try:
            parsed_data = ResumeParseResponse(**resume["parsed_data"])
        except Exception:
            pass

    gap_analysis = None
    if resume.get("gap_analysis"):
        try:
            gap_analysis = ResumeScoreResponse(**resume["gap_analysis"])
        except Exception:
            pass

    return ResumeResponse(
        id=resume["id"],
        file_name=resume.get("file_name", ""),
        storage_path=resume.get("storage_path", ""),
        parsed_data=parsed_data,
        score=resume.get("score"),
        gap_analysis=gap_analysis,
        is_current=resume.get("is_current", False),
        status="completed" if parsed_data else "processing",
        created_at=resume.get("created_at"),
    )


@router.post("/resume/match-jd", response_model=JDMatchResponse)
async def match_resume_to_jd(
    request: JDMatchRequest,
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Compare the user's current resume against a job description.

    Returns match score, resume change suggestions, course recommendations,
    and alternative job suggestions.
    """
    # Load current resume
    resume = await queries.get_current_resume(learner_id)
    if not resume or not resume.get("parsed_data"):
        raise HTTPException(
            status_code=400,
            detail="No analyzed resume found. Please upload and analyze a resume first.",
        )

    # Get learner context
    learner = await queries.get_learner(learner_id)
    target_role = learner.get("target_role", "Software Developer") if learner else "Software Developer"
    segment = learner.get("segment", "college") if learner else "college"

    # Call AI Gateway
    try:
        result = await gateway.generate(
            task_type="resume.jd_match",
            context={
                "parsed_resume": resume["parsed_data"],
                "job_title": request.job_title,
                "company": request.company or "Not specified",
                "job_description": request.job_description,
                "target_role": target_role,
                "segment": segment,
            },
            response_model=JDMatchResponse,
        )
        return JDMatchResponse(**result)
    except Exception as e:
        logger.error(f"JD match failed for learner {learner_id}: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")
