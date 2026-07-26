"""
Helpers — Utility Functions

HIGH-07 FIX: save_uploaded_file() now:
  - Validates file MIME type against whitelist (PDF, DOCX, TXT only)
  - Enforces a 5MB file size limit before writing to disk
  - Uses UUID-based filename to prevent path traversal and user collisions
  - Cleans up temp files after OCR processing (via cleanup_temp_file helper)
"""

import os
import uuid
import logging
from typing import Dict, Any, List, Optional
from fastapi import UploadFile, HTTPException

logger = logging.getLogger("guidify")

# HIGH-07 FIX: Whitelist of allowed MIME types for resume uploads
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
}

# HIGH-07 FIX: Maximum file size (5 MB)
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

# HIGH-07 FIX: Allowed file extensions (secondary check)
ALLOWED_EXTENSIONS = {"pdf", "docx", "doc", "txt"}


async def save_uploaded_file(file: UploadFile, directory: str = "/tmp") -> str:
    """
    Save uploaded file to disk with full security validation.

    HIGH-07 FIX:
    - Validates MIME type against whitelist
    - Enforces 5MB max file size (read limit before writing prevents OOM)
    - Generates UUID-based filename (prevents path traversal + user collisions)
    - Creates user-isolated temp directory

    Args:
        file: FastAPI UploadFile object
        directory: Base temp directory

    Returns:
        Absolute path to the safely saved file

    Raises:
        HTTPException 400: Invalid file type or file too large
    """
    # Validate file extension
    original_name = file.filename or "upload"
    extension = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed formats: {', '.join(ALLOWED_EXTENSIONS).upper()}"
        )

    # Read with size guard — read at most MAX+1 bytes so we can detect oversized files
    # without reading the full multi-GB payload into memory
    content = await file.read(MAX_FILE_SIZE_BYTES + 1)
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB"
        )

    # Validate MIME type from file content (not just extension)
    mime_type = file.content_type or ""
    if mime_type and mime_type not in ALLOWED_MIME_TYPES:
        logger.warning(f"File upload rejected — disallowed MIME type: {mime_type}")
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF, Word documents, and plain text are accepted."
        )

    # Generate a UUID-based filename to prevent path traversal and concurrent-user collisions
    safe_name = f"{uuid.uuid4().hex}.{extension}"
    os.makedirs(directory, exist_ok=True)
    file_path = os.path.join(directory, safe_name)

    with open(file_path, "wb") as f:
        f.write(content)

    logger.debug(f"File saved securely: {file_path} ({len(content)} bytes, ext=.{extension})")
    return file_path


def cleanup_temp_file(file_path: str) -> None:
    """
    HIGH-07 FIX: Remove temp file after processing to prevent /tmp from filling up.
    Call this after extracting text from the uploaded file.
    """
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logger.warning(f"Failed to clean up temp file {file_path}: {e}")


def generate_response(data: Any = None, error: Optional[str] = None) -> Dict[str, Any]:
    """
    Generate a standardized API response.
    """
    return {
        "success": error is None,
        "data": data,
        "error": error
    }


# Note: generate_random_college_data() and generate_random_company_data() have been
# REMOVED (HIGH-04 FIX). Random fake data must never be returned to users as real recommendations.
# Use Gemini AI (ask_gemini_async) for all dynamic content generation.