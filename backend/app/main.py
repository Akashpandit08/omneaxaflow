"""
AiVideo — FastAPI application entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine
from app.models import Base  # noqa: F401 — ensure all models are registered


from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis
from prometheus_fastapi_instrumentator import Instrumentator

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hook."""
    # Create tables if they don't exist (migrations handle production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # Initialize Redis caching
    redis = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=False)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
    
    yield
    
    # Cleanup on shutdown
    await redis.close()


from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.openapi.utils import get_openapi

# Initialize Limiter
limiter = Limiter(key_func=get_remote_address)

# API Metadata for Swagger Docs
tags_metadata = [
    {"name": "Health", "description": "System status endpoints."},
    {"name": "Projects", "description": "Manage video projects and scripts."},
    {"name": "Videos", "description": "Video rendering pipeline and downloads."},
    {"name": "Avatars", "description": "Browse and search AI avatars."},
    {"name": "Voices", "description": "Browse and preview ElevenLabs voices."},
    {"name": "Subscriptions", "description": "Billing and usage tracking."},
]

app = FastAPI(
    title="AiVideo API",
    description="Enterprise-grade AI-powered video generation platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)

# Apply rate limiter globally
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="AiVideo API",
        version="1.0.0",
        description="Enterprise-grade AI-powered video generation platform.",
        routes=app.routes,
    )
    openapi_schema["info"]["x-logo"] = {
        "url": "https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png"
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Initialize Prometheus Metrics
Instrumentator().instrument(app).expose(app)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Static files (local dev fallback — production uses S3)
# ---------------------------------------------------------------------------
app.mount("/media", StaticFiles(directory="media"), name="media")

# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------
from app.api.v1.router import api_router
app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
