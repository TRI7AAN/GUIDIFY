"""
Core Configuration Module

Centralized configuration management using Pydantic Settings.
All environment variables are validated and typed here.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    model_config = SettingsConfigDict(
        # Don't load .env in production; deployments use environment variables.
        env_file=".env" if os.getenv("ENVIRONMENT") != "production" else None,
        case_sensitive=True,
        extra="ignore",
    )

    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_PUBLISHABLE_KEY: str             # Publishable key — client-facing ops (RLS enforced)

    # Service-role key — used ONLY by the background job worker to bypass RLS.
    # Never expose this to the frontend and never use it from request handlers.
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Google Gemini AI Configuration
    GOOGLE_API_KEY: str = ""

    # OpenRouter AI Configuration
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "nvidia/nemotron-3-super-120b-a12b:free"

    # AI Gateway Configuration — per techspec.md §3
    GEMINI_MODEL: str = "gemini-2.5-flash-lite"

    # Redis Configuration (optional)
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS Configuration
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS string into list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    # Server Configuration
    # Container services must bind all interfaces; exposure is controlled by the
    # deployment network/firewall rather than the application socket.
    HOST: str = "0.0.0.0"  # nosec B104
    PORT: int = 8000
    DEBUG: bool = False
    # MED-03 FIX: Default to 'production' — require explicit override for dev.
    # Prevents accidentally enabling docs/reload in a deployment that forgets to set this.
    ENVIRONMENT: str = "production"

    # Application Metadata
    APP_NAME: str = "GUIDIFY API"
    APP_VERSION: str = "3.0.0"

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    MAX_REQUESTS_PER_MINUTE: int = 60

    # Logging
    LOG_LEVEL: str = "INFO"   # DEBUG, INFO, WARNING, ERROR, CRITICAL
    LOG_FORMAT: str = "json"  # json or text

    # AI Service Configuration
    # Free OpenRouter models (nemotron-3-super) routinely take 30-90s per call,
    # so a 30s timeout made every AI task (roadmap, missions, interview) fail.
    AI_TIMEOUT_SECONDS: int = 90
    AI_MAX_RETRIES: int = 3

    # Feature Flags
    ENABLE_SENTRY: bool = False
    SENTRY_DSN: str = ""

# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Dependency injection function for FastAPI"""
    return settings
