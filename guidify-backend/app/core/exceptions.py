"""
Custom Exception Classes

Centralized exception definitions for the application.
All custom exceptions inherit from base GUIDIFYException.
"""

from typing import Any, Dict, Optional


class GUIDIFYException(Exception):
    """Base exception class for all GUIDIFY exceptions"""
    
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


# Authentication & Authorization Exceptions
class AuthenticationError(GUIDIFYException):
    """Raised when authentication fails"""
    def __init__(self, message: str = "Authentication failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=401, error_code="AUTH_FAILED", details=details)


class AuthorizationError(GUIDIFYException):
    """Raised when user lacks permission"""
    def __init__(self, message: str = "Insufficient permissions", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=403, error_code="FORBIDDEN", details=details)


class InvalidTokenError(GUIDIFYException):
    """Raised when token is invalid or expired"""
    def __init__(self, message: str = "Invalid or expired token", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=401, error_code="INVALID_TOKEN", details=details)


# Data Validation Exceptions
class ValidationError(GUIDIFYException):
    """Raised when input validation fails"""
    def __init__(self, message: str = "Validation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=422, error_code="VALIDATION_ERROR", details=details)


class ResourceNotFoundError(GUIDIFYException):
    """Raised when requested resource doesn't exist"""
    def __init__(self, resource: str = "Resource", details: Optional[Dict[str, Any]] = None):
        message = f"{resource} not found"
        super().__init__(message, status_code=404, error_code="NOT_FOUND", details=details)


class DuplicateResourceError(GUIDIFYException):
    """Raised when attempting to create duplicate resource"""
    def __init__(self, resource: str = "Resource", details: Optional[Dict[str, Any]] = None):
        message = f"{resource} already exists"
        super().__init__(message, status_code=409, error_code="DUPLICATE", details=details)


# External Service Exceptions
class ExternalServiceError(GUIDIFYException):
    """Raised when external service call fails"""
    def __init__(self, service: str, message: str = "Service unavailable", details: Optional[Dict[str, Any]] = None):
        full_message = f"{service}: {message}"
        super().__init__(full_message, status_code=503, error_code="SERVICE_UNAVAILABLE", details=details)


class AIServiceError(ExternalServiceError):
    """Raised when AI service (Gemini) fails"""
    def __init__(self, message: str = "AI service error", details: Optional[Dict[str, Any]] = None):
        super().__init__("AI Service", message, details)


class DatabaseError(ExternalServiceError):
    """Raised when database operation fails"""
    def __init__(self, message: str = "Database operation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__("Database", message, details)


# Rate Limiting
class RateLimitExceededError(GUIDIFYException):
    """Raised when rate limit is exceeded"""
    def __init__(self, message: str = "Rate limit exceeded", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=429, error_code="RATE_LIMIT_EXCEEDED", details=details)


# Business Logic Exceptions
class OnboardingIncompleteError(GUIDIFYException):
    """Raised when user hasn't completed onboarding"""
    def __init__(self, message: str = "Please complete onboarding first", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=403, error_code="ONBOARDING_REQUIRED", details=details)


class FileProcessingError(GUIDIFYException):
    """Raised when file upload/processing fails"""
    def __init__(self, message: str = "File processing failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, error_code="FILE_PROCESSING_ERROR", details=details)
