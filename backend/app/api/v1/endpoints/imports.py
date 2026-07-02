import os
import shutil
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, status
from sqlalchemy import select, func

from app.core.config import settings
from app.core.deps import CurrentUser, DBSession, CurrentWorkspace
from app.models.content import ImportJob, ImportJobStatus
from app.schemas.content import ImportJobOut, ImportJobListOut
from app.workers.import_tasks import process_import_task

router = APIRouter()

@router.post("/upload", response_model=ImportJobOut, status_code=status.HTTP_201_CREATED)
async def upload_import_file(
    db: DBSession,
    current_user: CurrentUser,
    workspace: CurrentWorkspace,
    file: UploadFile = File(...)
):
    """
    Upload a PPTX or PDF file for import.
    """
    allowed_types = [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-powerpoint",
        "application/pdf",
    ]
    filename = file.filename or ""
    if file.content_type not in allowed_types and not filename.lower().endswith((".pptx", ".ppt", ".pdf")):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PPTX and PDF are allowed.")

    upload_dir = os.path.join(settings.LOCAL_STORAGE_PATH, "imports", str(workspace.id))
    os.makedirs(upload_dir, exist_ok=True)
    safe_ext = os.path.splitext(filename)[1].lower()
    file_path = os.path.join(upload_dir, f"{current_user.id}_{uuid.uuid4()}{safe_ext}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = file_path 

    job = ImportJob(
        workspace_id=workspace.id,
        user_id=current_user.id,
        file_name=filename,
        file_type=file.content_type if file.content_type else "unknown",
        file_url=file_url,
        status=ImportJobStatus.uploaded
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    return job

@router.post("/{id}/process", response_model=ImportJobOut)
async def process_import(
    id: int,
    db: DBSession,
    current_user: CurrentUser,
    workspace: CurrentWorkspace
):
    """
    Trigger the background processing of an uploaded file.
    """
    job = db.execute(
        select(ImportJob).where(ImportJob.id == id, ImportJob.workspace_id == workspace.id)
    ).scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Import job not found")

    if job.status == ImportJobStatus.processing:
        raise HTTPException(status_code=400, detail="Job is already processing")

    job.status = ImportJobStatus.processing
    db.commit()

    # Trigger Celery task
    process_import_task.delay(job.id)

    db.refresh(job)
    return job

@router.get("/{id}", response_model=ImportJobOut)
async def get_import_job(
    id: int,
    db: DBSession,
    current_user: CurrentUser,
    workspace: CurrentWorkspace
):
    job = db.execute(
        select(ImportJob).where(ImportJob.id == id, ImportJob.workspace_id == workspace.id)
    ).scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Import job not found")

    return job

@router.get("", response_model=ImportJobListOut)
async def list_import_jobs(
    db: DBSession,
    current_user: CurrentUser,
    workspace: CurrentWorkspace,
    page: int = 1,
    page_size: int = 20
):
    query = select(ImportJob).where(ImportJob.workspace_id == workspace.id).order_by(ImportJob.created_at.desc())
    
    total = db.execute(select(func.count()).select_from(query.subquery())).scalar() or 0
    items = db.execute(query.offset((page - 1) * page_size).limit(page_size)).scalars().all()

    return ImportJobListOut(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_import_job(
    id: int,
    db: DBSession,
    current_user: CurrentUser,
    workspace: CurrentWorkspace
):
    job = db.execute(
        select(ImportJob).where(ImportJob.id == id, ImportJob.workspace_id == workspace.id)
    ).scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Import job not found")

    db.delete(job)
    db.commit()
    return None
