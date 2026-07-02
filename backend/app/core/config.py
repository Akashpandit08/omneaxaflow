"""
Application configuration — reads from environment variables via pydantic-settings.
"""

from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # General
    APP_ENV: str = "development"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    ENABLE_MOCK_SERVICES: bool = False
    SECRET_KEY: str = "change-me"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    ALLOW_INSECURE_WEBHOOK_URLS: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://aivideo:aivideo_secret@db:5432/aivideo"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/2"

    # JWT
    JWT_SECRET_KEY: str = "jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "aivideo-media"
    S3_PRESIGNED_URL_EXPIRY: int = 3600
    STORAGE_PROVIDER: str = "s3"
    LOCAL_STORAGE_PATH: str = "/app/media"

    # CloudFront CDN
    CLOUDFRONT_DOMAIN: Optional[str] = None
    CLOUDFRONT_KEY_PAIR_ID: Optional[str] = None
    CLOUDFRONT_PRIVATE_KEY: Optional[str] = None

    # Cashfree
    CASHFREE_APP_ID: str = ""
    CASHFREE_SECRET_KEY: str = ""
    CASHFREE_WEBHOOK_SECRET: str = ""
    CASHFREE_API_VERSION: str = "2023-08-01"
    CASHFREE_ENV: str = "sandbox"  # sandbox or production
    CASHFREE_PRO_PLAN_ID: str = ""
    CASHFREE_BUSINESS_PLAN_ID: str = ""

    # ElevenLabs
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_MODEL_ID: str = "eleven_multilingual_v2"
    ENABLE_ELEVENLABS_TTS: bool = False

    # Cartesia TTS / hosted voice cloning
    CARTESIA_API_KEY: str = ""
    CARTESIA_API_VERSION: str = "2024-11-13"
    CARTESIA_MODEL_ID: str = "sonic-2"
    CARTESIA_DEFAULT_VOICE_ID: str = ""
    CARTESIA_DEFAULT_LANGUAGE: str = "en"

    # Amazon Polly TTS
    POLLY_DEFAULT_VOICE_ID: str = "Joanna"
    POLLY_ENGINE: str = "neural"
    
    # XTTS Settings
    XTTS_MODEL: str = "xtts_v2"
    VOICE_DEFAULT_PROVIDER: str = "cartesia"

    # SendGrid
    SENDGRID_API_KEY: Optional[str] = None
    SENDGRID_FROM_EMAIL: str = "noreply@omneaxaflow.app"

    # Frontend
    NEXT_PUBLIC_API_URL: str = "http://localhost:8000"

    # AI Providers
    OPENAI_API_KEY: str = ""  # Optional, not used by default
    GEMINI_API_KEY: str = ""
    CLAUDE_API_KEY: str = ""
    PRIMARY_PROVIDER: str = "gemini"  # Primary AI provider: gemini | openai | claude
    AUTO_FAILOVER: bool = True

    # Avatar Animation (D-ID)
    DID_API_KEY: str = ""

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_flag(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "development", "dev"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "production", "prod"}:
                return False
        return value

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production" or self.ENVIRONMENT.lower() == "production"

    def require_mock_enabled(self, feature: str) -> None:
        if not self.ENABLE_MOCK_SERVICES:
            raise RuntimeError(
                f"{feature} mock behavior is disabled. Set ENABLE_MOCK_SERVICES=true only for development."
            )

    def require_s3_configured(self) -> None:
        missing = [
            name
            for name, value in {
                "AWS_ACCESS_KEY_ID": self.AWS_ACCESS_KEY_ID,
                "AWS_SECRET_ACCESS_KEY": self.AWS_SECRET_ACCESS_KEY,
                "S3_BUCKET_NAME": self.S3_BUCKET_NAME,
            }.items()
            if not value
        ]
        if missing:
            raise RuntimeError(f"S3 storage is not configured. Missing: {', '.join(missing)}")

settings = Settings()
