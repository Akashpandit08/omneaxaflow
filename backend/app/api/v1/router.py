from fastapi import APIRouter

from app.api.v1.endpoints import (
    ai,
    analytics,
    api_keys,
    audit_logs,
    auth,
    avatars,
    branding,
    comments,
    dashboard,
    permissions,
    projects,
    subscriptions,
    templates,
    videos,
    voices,
    webhooks,
    workspaces,
    imports,
    brand_glossary,
    translations,
    quizzes,
    scorm,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(videos.router, prefix="/videos", tags=["Videos"])
api_router.include_router(avatars.router, prefix="/avatars", tags=["Avatars"])
api_router.include_router(voices.router, prefix="/voices", tags=["Voices"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["Subscriptions"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Integration"])
api_router.include_router(api_keys.router, prefix="/api-keys", tags=["API Keys"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(branding.router, prefix="/branding", tags=["Branding"])
api_router.include_router(comments.router, tags=["Comments"])
api_router.include_router(templates.router, prefix="/templates", tags=["Templates"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["Permissions"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Logs"])
api_router.include_router(imports.router, prefix="/imports", tags=["Imports"])
api_router.include_router(brand_glossary.router, prefix="/brand-glossary", tags=["Brand Glossary"])
api_router.include_router(translations.router, tags=["Translations"])
api_router.include_router(quizzes.router, tags=["quizzes"])
api_router.include_router(scorm.router, tags=["scorm"])
