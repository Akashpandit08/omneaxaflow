from fastapi import APIRouter, File, UploadFile, Form, HTTPException, status
from sqlalchemy import select
from typing import Optional

from app.core.deps import CurrentWorkspace, DBSession, RequireRole
from app.models.branding import WorkspaceBranding
from app.services.storage import upload_bytes
from pathlib import Path
from starlette.concurrency import run_in_threadpool

router = APIRouter()

ALLOWED_UPLOAD_TYPES = {"image/jpeg", "image/png", "image/vnd.microsoft.icon", "image/x-icon"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
BRANDING_MEDIA_DIR = Path("/app/media/branding")
UPLOAD_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/vnd.microsoft.icon": ".ico",
    "image/x-icon": ".ico"
}

@router.get("", dependencies=[RequireRole(["owner", "admin", "member", "editor", "viewer"])])
async def get_branding(workspace: CurrentWorkspace, db: DBSession):
    stmt = select(WorkspaceBranding).where(WorkspaceBranding.workspace_id == workspace.id)
    result = await db.execute(stmt)
    branding = result.scalar_one_or_none()
    
    if not branding:
        return {
            "workspace_id": workspace.id,
            "company_name": None,
            "logo_s3_key": None,
            "favicon_s3_key": None,
            "primary_color": None,
            "secondary_color": None,
            "accent_color": None,
            "support_email": None,
            "custom_domain": None,
            "domain_verified": False,
            "hide_renderflow_branding": False,
            "email_from_name": None
        }
    
    return {
        "workspace_id": branding.workspace_id,
        "company_name": branding.company_name,
        "logo_s3_key": branding.logo_s3_key,
        "favicon_s3_key": branding.favicon_s3_key,
        "primary_color": branding.primary_color,
        "secondary_color": branding.secondary_color,
        "accent_color": branding.accent_color,
        "support_email": branding.support_email,
        "custom_domain": branding.custom_domain,
        "domain_verified": branding.domain_verified_at is not None,
        "hide_renderflow_branding": branding.hide_renderflow_branding,
        "email_from_name": branding.email_from_name
    }

@router.post("", dependencies=[RequireRole(["owner", "admin"])])
async def update_branding(
    workspace: CurrentWorkspace,
    db: DBSession,
    company_name: Optional[str] = Form(None),
    primary_color: Optional[str] = Form(None),
    secondary_color: Optional[str] = Form(None),
    accent_color: Optional[str] = Form(None),
    support_email: Optional[str] = Form(None),
    email_from_name: Optional[str] = Form(None),
    hide_renderflow_branding: bool = Form(False),
    custom_domain: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None),
    favicon: Optional[UploadFile] = File(None)
):
    # Enforce plan limits
    if hide_renderflow_branding and workspace.plan == "free":
        raise HTTPException(status_code=403, detail="Removing OmneaxaFlow branding requires a Pro or Business plan")
        
    if (custom_domain or email_from_name) and workspace.plan not in ["business"]:
        raise HTTPException(status_code=403, detail="Custom domain and white-labeled emails require a Business plan")

    stmt = select(WorkspaceBranding).where(WorkspaceBranding.workspace_id == workspace.id)
    result = await db.execute(stmt)
    branding = result.scalar_one_or_none()
    
    if not branding:
        branding = WorkspaceBranding(workspace_id=workspace.id)
        db.add(branding)
        
    branding.company_name = company_name
    branding.primary_color = primary_color
    branding.secondary_color = secondary_color
    branding.accent_color = accent_color
    branding.support_email = support_email
    
    if workspace.plan == "business":
        branding.email_from_name = email_from_name
        
        if custom_domain is not None:
            if branding.custom_domain != custom_domain:
                branding.custom_domain = custom_domain if custom_domain.strip() else None
                branding.domain_verified_at = None # Reset verification on change
                branding.domain_verification_token_hash = None
    
    if workspace.plan in ["pro", "business"]:
        branding.hide_renderflow_branding = hide_renderflow_branding
        
    async def process_upload(file_obj: UploadFile, prefix: str):
        if file_obj.content_type not in ALLOWED_UPLOAD_TYPES:
            raise HTTPException(status_code=400, detail=f"{prefix.title()} must be a valid image file")
            
        image_bytes = await file_obj.read()
        if len(image_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail=f"{prefix.title()} must be 5MB or smaller")
            
        extension = UPLOAD_EXTENSIONS[file_obj.content_type]
        s3_key = f"branding/{workspace.id}_{prefix}{extension}"
        
        # We upload to S3 directly (we ignore local filesystem saving in production, but let's just upload to S3)
        await run_in_threadpool(upload_bytes, image_bytes, s3_key, file_obj.content_type)
        return s3_key
        
    if logo:
        branding.logo_s3_key = await process_upload(logo, "logo")
    
    if favicon:
        branding.favicon_s3_key = await process_upload(favicon, "favicon")
        
    await db.commit()
    await db.refresh(branding)
    
    return {
        "workspace_id": branding.workspace_id,
        "company_name": branding.company_name,
        "logo_s3_key": branding.logo_s3_key,
        "favicon_s3_key": branding.favicon_s3_key,
        "primary_color": branding.primary_color,
        "secondary_color": branding.secondary_color,
        "accent_color": branding.accent_color,
        "support_email": branding.support_email,
        "custom_domain": branding.custom_domain,
        "domain_verified": branding.domain_verified_at is not None,
        "hide_renderflow_branding": branding.hide_renderflow_branding,
        "email_from_name": branding.email_from_name
    }
