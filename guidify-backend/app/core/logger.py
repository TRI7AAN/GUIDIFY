"""
Structured Logging Configuration

Provides structured JSON logging for production and readable text logging for development.
Integrates with FastAPI and includes request tracking.
"""

import logging
import sys
import json
from datetime import datetime
from typing import Any, Dict
from pythonjsonlogger import jsonlogger
from app.core.config import settings


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter with additional fields"""
    
    def add_fields(self, log_record: Dict[str, Any], record: logging.LogRecord, message_dict: Dict[str, Any]) -> None:
        super().add_fields(log_record, record, message_dict)
        
        # Add timestamp
        log_record['timestamp'] = datetime.utcnow().isoformat()
        
        # Add log level
        log_record['level'] = record.levelname
        
        # Add logger name
        log_record['logger'] = record.name
        
        # Add application info
        log_record['app'] = settings.APP_NAME
        log_record['environment'] = settings.ENVIRONMENT


def setup_logging() -> logging.Logger:
    """
    Configure logging based on environment settings
    
    Returns:
        Configured logger instance
    """
    # Create logger
    logger = logging.getLogger("guidify")
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    
    # Remove existing handlers
    logger.handlers = []
    
    # Create handler
    handler = logging.StreamHandler(sys.stdout)
    
    # Set formatter based on configuration
    if settings.LOG_FORMAT == "json":
        formatter = CustomJsonFormatter(
            '%(timestamp)s %(level)s %(logger)s %(message)s'
        )
    else:
        # Text format for development
        formatter = logging.Formatter(
            fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    # Prevent propagation to root logger
    logger.propagate = False
    
    return logger


# Global logger instance
logger = setup_logging()


def log_request(method: str, path: str, status_code: int, duration_ms: float, request_id: str = None) -> None:
    """
    Log HTTP request details
    
    Args:
        method: HTTP method (GET, POST, etc.)
        path: Request path
        status_code: Response status code
        duration_ms: Request duration in milliseconds
        request_id: Optional request ID for tracing
    """
    logger.info(
        "HTTP Request",
        extra={
            "http_method": method,
            "http_path": path,
            "http_status": status_code,
            "duration_ms": duration_ms,
            "request_id": request_id
        }
    )


def log_error(error: Exception, context: Dict[str, Any] = None) -> None:
    """
    Log error with context
    
    Args:
        error: Exception object
        context: Additional context information
    """
    logger.error(
        f"Error: {str(error)}",
        extra={
            "error_type": type(error).__name__,
            "error_message": str(error),
            "context": context or {},
        },
        exc_info=True
    )


def log_ai_request(service: str, prompt_length: int, response_length: int, duration_ms: float) -> None:
    """
    Log AI service request
    
    Args:
        service: AI service name (e.g., "gemini")
        prompt_length: Length of prompt in characters
        response_length: Length of response in characters
        duration_ms: Request duration in milliseconds
    """
    logger.info(
        "AI Service Request",
        extra={
            "ai_service": service,
            "prompt_length": prompt_length,
            "response_length": response_length,
            "duration_ms": duration_ms
        }
    )


def get_logger(name: str) -> logging.Logger:
    """
    Get a child logger with the specified name
    
    Args:
        name: Logger name (typically module name)
        
    Returns:
        Configured logger instance
    """
    return logging.getLogger(f"guidify.{name}")
