from fastapi import APIRouter

from app.api.v1.endpoints import auth, avatars, dashboard, projects, subscriptions, videos, voices, ai

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(videos.router, prefix="/videos", tags=["Videos"])
api_router.include_router(avatars.router, prefix="/avatars", tags=["Avatars"])
api_router.include_router(voices.router, prefix="/voices", tags=["Voices"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["Subscriptions"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Integration"])
