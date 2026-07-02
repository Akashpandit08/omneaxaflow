from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select

from app.core.deps import CurrentUser, DBSession
from app.models.advanced import SCORMPackage
from app.models.video import Video
from app.schemas.advanced import SCORMPackageCreate, SCORMPackageOut
from app.services.analytics import track_event
from app.services.storage import get_presigned_download_url

router = APIRouter()

@router.post("/videos/{id}/scorm", response_model=SCORMPackageOut)
async def create_scorm_package(
    id: int,
    request: Request,
    body: SCORMPackageCreate,
    current_user: CurrentUser,
    db: DBSession
):
    workspace = request.state.workspace
    video_result = await db.execute(select(Video).where(Video.id == id, Video.workspace_id == workspace.id))
    video = video_result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if not video.export_url:
        raise HTTPException(status_code=409, detail="Video must be completed before SCORM export")
    
    package = SCORMPackage(
        video_id=id,
        workspace_id=workspace.id,
        package_version=body.package_version,
        status="processing"
    )
    db.add(package)
    await db.commit()
    await db.refresh(package)
    
    from app.workers.celery_app import celery_app
    celery_app.send_task("app.workers.scorm_tasks.generate_scorm_package_task", args=[package.id])
    
    await track_event(db, workspace.id, "SCORM_EXPORT_STARTED")
    
    return package

@router.get("/scorm/{id}", response_model=SCORMPackageOut)
async def get_scorm_package(
    id: int,
    request: Request,
    current_user: CurrentUser,
    db: DBSession
):
    workspace = request.state.workspace
    result = await db.execute(select(SCORMPackage).where(SCORMPackage.id == id, SCORMPackage.workspace_id == workspace.id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="SCORM package not found")
    return package

@router.get("/scorm/{id}/download")
async def download_scorm_package(
    id: int,
    request: Request,
    current_user: CurrentUser,
    db: DBSession
):
    workspace = request.state.workspace
    result = await db.execute(select(SCORMPackage).where(SCORMPackage.id == id, SCORMPackage.workspace_id == workspace.id))
    package = result.scalar_one_or_none()
    if not package or not package.zip_url or package.status != "ready":
        raise HTTPException(status_code=404, detail="SCORM package or zip not ready")
        
    await track_event(db, workspace.id, "SCORM_EXPORT_DOWNLOADED")

    download_url = package.zip_url
    if not download_url.startswith("http"):
        download_url, expires_in = get_presigned_download_url(download_url)
        return {"download_url": download_url, "expires_in": expires_in}

    return {"download_url": download_url}

@router.delete("/scorm/{id}", status_code=204)
async def delete_scorm_package(
    id: int,
    request: Request,
    current_user: CurrentUser,
    db: DBSession
):
    workspace = request.state.workspace
    result = await db.execute(select(SCORMPackage).where(SCORMPackage.id == id, SCORMPackage.workspace_id == workspace.id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="SCORM package not found")
        
    await db.delete(package)
    await db.commit()
    return None
