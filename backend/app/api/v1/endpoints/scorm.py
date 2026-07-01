from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import select

from app.core.deps import CurrentUser, DBSession
from app.models.advanced import SCORMPackage
from app.schemas.advanced import SCORMPackageCreate, SCORMPackageOut
from app.services.analytics import track_event

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
    if not package or not package.zip_url:
        raise HTTPException(status_code=404, detail="SCORM package or zip not ready")
        
    await track_event(db, workspace.id, "SCORM_EXPORT_DOWNLOADED")
    
    return {"download_url": package.zip_url}

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
