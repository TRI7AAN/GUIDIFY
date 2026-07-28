"""
Resume Routes — api.md §2

Full implementation: Upload, parse, score, and retrieve resumes.

Endpoints:
    POST /resume/upload     — Multipart upload, async parsing via AI Gateway
    GET  /resume/{resume_id} — Get parsed resume + score by ID
    GET  /resume/current    — Get current resume analysis
    GET  /resume/history    — Get resume upload history
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException

from app.core.auth import get_current_learner_id
from app.core.exceptions import ResourceNotFoundError, AIServiceError
from app.db import queries
from app.models.schemas import (
    ResumeUploadResponse,
    ResumeResponse,
    ResumeParseResponse,
    ResumeScoreResponse,
)
from app.utils.file_parser import extract_text_from_file
from app.utils.helpers import save_uploaded_file, cleanup_temp_file

logger = logging.getLogger("guidify.api.resume")

router = APIRouter(tags=["Resume"])


@router.post("/resume/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    learner_id: str = Depends(get_current_learner_id),
):
    """
    Upload resume — Phase 1 full implementation.
    
    Flow:
    1. Save file to temp location with security validation
    2. Extract text from PDF/DOCX
    3. Store file metadata in Supabase Storage (via DB record)
    4. Parse resume via AI Gateway (resume.parse task)
    5. Score resume via AI Gateway (resume.score task)
    6. Store parsed data and score in resumes table
    7. Update learner_profiles with resume data and skills
    """
    # 1. Save uploaded file to temp location
    temp_path = None
    try:
        temp_path = await save_uploaded_file(file, directory="/tmp/guidify_resumes")
        
        # 2. Extract text from the uploaded file
        resume_text = extract_text_from_file(temp_path)
        if not resume_text or len(resume_text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Could not extract meaningful text from the uploaded file. Please ensure the resume is not image-based."
            )
        
        # 3. Get learner profile for context
        profile = await queries.get_learner_profile(learner_id)
        learner = await queries.get_learner(learner_id)
        
        target_role = learner.get("target_role", "Software Developer") if learner else "Software Developer"
        segment = learner.get("segment", "college") if learner else "college"
        current_skills = profile.get("skills", []) if profile else []
        
        # 4. Parse resume via AI Gateway
        from app.ai_gateway import AIGateway
        gateway = AIGateway()
        
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
            # Continue without parsed data — we can still store the upload
        
        # 5. Score resume via AI Gateway (only if parsing succeeded)
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
        
        # 6. Store in resumes table
        storage_path = f"resumes/{learner_id}/{file.filename}"
        resume_record = await queries.create_resume(learner_id, {
            "storage_path": storage_path,
            "file_name": file.filename or "resume",
            "file_size_bytes": len(resume_text),
            "mime_type": file.content_type or "",
            "parsed_data": parsed_data,
            "score": score_data.get("overall_score") if score_data else None,
            "gap_analysis": score_data,
            "is_current": True,
        })
        
        if not resume_record:
            raise HTTPException(status_code=500, detail="Failed to store resume record")
        
        # 7. Update learner_profiles with resume data and skills
        if profile and parsed_data:
            update_data = {}
            if parsed_data.get("technical_skills"):
                existing_skills = profile.get("skills", []) or []
                new_skills = list(set(existing_skills + parsed_data["technical_skills"]))
                update_data["skills"] = new_skills
            if parsed_data:
                update_data["resume_data"] = parsed_data
            if update_data:
                await queries.update_learner_profile(profile["id"], update_data)
        
        return ResumeUploadResponse(
            id=resume_record["id"],
            file_name=file.filename or "resume",
            storage_path=storage_path,
            status="uploaded",
            parsed_data=ResumeParseResponse(**parsed_data) if parsed_data else None,
            score=score_data.get("overall_score") if score_data else None,
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume upload failed for learner {learner_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Resume upload failed: {str(e)}")
    finally:
        # Clean up temp file
        if temp_path:
            cleanup_temp_file(temp_path)


@router.get("/resume/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: str,
    learner_id: str = Depends(get_current_learner_id),
):
    """Get a specific resume by ID."""
    resume = await queries.get_resume_by_id(resume_id, learner_id)
    if not resume:
        raise ResourceNotFoundError("Resume")
    
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
        created_at=resume.get("created_at"),
    )


@router.get("/resume/current", response_model=ResumeResponse)
async def get_current_resume(
    learner_id: str = Depends(get_current_learner_id),
):
    """Get the current (most recent active) resume analysis."""
    resume = await queries.get_current_resume(learner_id)
    if not resume:
        raise ResourceNotFoundError("Resume")
    
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
        created_at=resume.get("created_at"),
    )


@router.get("/resume/history")
async def get_resume_history(
    learner_id: str = Depends(get_current_learner_id),
):
    """Get resume upload history for the learner."""
    history = await queries.get_resume_history(learner_id)
    return {"resumes": history}
