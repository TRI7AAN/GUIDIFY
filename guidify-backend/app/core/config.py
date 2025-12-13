"""
Core Configuration Module

Centralized configuration management using Pydantic Settings.
All environment variables are validated and typed here.
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_KEY: str
    
    # Google AI Configuration
    GOOGLE_API_KEY: str
    
    # Redis Configuration (optional)
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS Configuration
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS string into list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    ENVIRONMENT: str = "development"  # development, staging, production
    
    # Application Metadata
    APP_NAME: str = "GUIDIFY API"
    APP_VERSION: str = "3.0.0"
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    MAX_REQUESTS_PER_MINUTE: int = 60
    
    # Logging
    LOG_LEVEL: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    LOG_FORMAT: str = "json"  # json or text
    
    # AI Service Configuration
    AI_TIMEOUT_SECONDS: int = 30
    AI_MAX_RETRIES: int = 3
    
    # Feature Flags
    ENABLE_SENTRY: bool = False
    SENTRY_DSN: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Dependency injection function for FastAPI"""
    return settings
