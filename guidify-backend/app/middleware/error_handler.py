"""
Global Error Handler Middleware

Catches all exceptions and returns consistent error responses.
Integrates with logging system for error tracking.
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback

from app.core.exceptions import GUIDIFYException
from app.core.logger import logger, log_error


async def guidify_exception_handler(request: Request, exc: GUIDIFYException) -> JSONResponse:
    """
    Handle custom GUIDIFY exceptions
    
    Args:
        request: FastAPI request object
        exc: GUIDIFYException instance
        
    Returns:
        JSON response with error details
    """
    # Log the error
    log_error(exc, context={
        "path": request.url.path,
        "method": request.method,
        "error_code": exc.error_code
    })
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handle Pydantic validation errors
    
    Args:
        request: FastAPI request object
        exc: RequestValidationError instance
        
    Returns:
        JSON response with validation error details
    """
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " -> ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning(
        "Validation Error",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": errors
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {"errors": errors}
            }
        }
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    Handle HTTP exceptions
    
    Args:
        request: FastAPI request object
        exc: StarletteHTTPException instance
        
    Returns:
        JSON response with error details
    """
    logger.warning(
        "HTTP Exception",
        extra={
            "path": request.url.path,
            "method": request.method,
            "status_code": exc.status_code,
            "detail": exc.detail
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "details": {}
            }
        }
    )


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler for unhandled exceptions
    
    Args:
        request: FastAPI request object
        exc: Exception instance
        
    Returns:
        JSON response with generic error message
    """
    # Log full traceback
    log_error(exc, context={
        "path": request.url.path,
        "method": request.method,
        "traceback": traceback.format_exc()
    })
    
    # Return generic error message (don't expose internal details)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "details": {}
            }
        }
    )
