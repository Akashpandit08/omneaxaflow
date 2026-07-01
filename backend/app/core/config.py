"""
Application configuration — reads from environment variables via pydantic-settings.
"""

from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # General
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
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

    # SendGrid
    SENDGRID_API_KEY: Optional[str] = None
    SENDGRID_FROM_EMAIL: str = "noreply@omneaxaflow.app"

    # Frontend
    NEXT_PUBLIC_API_URL: str = "http://localhost:8000"

    # AI Providers
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    CLAUDE_API_KEY: str = ""
    PRIMARY_PROVIDER: str = "openai"
    AUTO_FAILOVER: bool = True

    # Avatar Animation (D-ID)
    DID_API_KEY: str = ""

settings = Settings()
