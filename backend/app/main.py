"""
AiVideo FastAPI application entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from prometheus_fastapi_instrumentator import Instrumentator
from redis import asyncio as aioredis
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine
from app.models import Base  # noqa: F401 - ensure all models are registered


import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hook."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Validate ElevenLabs Configuration
    if settings.ELEVENLABS_API_KEY:
        try:
            import elevenlabs
            from elevenlabs import ElevenLabs
            logger.info(f"ElevenLabs SDK version installed: {getattr(elevenlabs, '__version__', 'unknown')}")
            
            client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
            
            # Check available clone methods
            can_clone = False
            if hasattr(client, "clone"):
                can_clone = True
                logger.info("ElevenLabs cloning available via 'client.clone'")
            elif hasattr(client, "voices"):
                if hasattr(client.voices, "clone"):
                    can_clone = True
                    logger.info("ElevenLabs cloning available via 'client.voices.clone'")
                elif hasattr(client.voices, "add"):
                    can_clone = True
                    logger.info("ElevenLabs cloning available via 'client.voices.add'")
                else:
                    logger.warning(f"Available methods on client.voices: {dir(client.voices)}")
            else:
                logger.warning(f"Available methods on client: {dir(client)}")
                
            if not can_clone:
                logger.warning("ElevenLabs voice cloning API could not be detected. Cloning might fail!")
        except ImportError:
            logger.error("ElevenLabs SDK is not installed.")
        except Exception as e:
            logger.error(f"Error validating ElevenLabs SDK on startup: {e}")
    else:
        logger.warning("ELEVENLABS_API_KEY is not set. Voice generation features will be disabled.")


    redis = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=False)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")

    yield

    await redis.close()



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

Instrumentator().instrument(app).expose(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory="media"), name="media")
app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
