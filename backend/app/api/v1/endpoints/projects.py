"""
Project CRUD endpoints.
"""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DBSession
from app.models.project import Project, ProjectStatus
from app.schemas.project import ProjectCreate, ProjectListOut, ProjectOut, ProjectUpdate

router = APIRouter()


@router.get("", response_model=ProjectListOut)
async def list_projects(
    current_user: CurrentUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
):
    offset = (page - 1) * page_size

    total_result = await db.execute(
        select(func.count()).where(Project.owner_id == current_user.id)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(Project)
        .where(Project.owner_id == current_user.id)
        .order_by(Project.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return ProjectListOut(items=list(items), total=total, page=page, page_size=page_size)


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(body: ProjectCreate, current_user: CurrentUser, db: DBSession):
    project = Project(
        owner_id=current_user.id,
        title=body.title,
        description=body.description,
        script=body.script,
        scenes=[s.model_dump() for s in body.scenes] if body.scenes else None,
        avatar_id=body.avatar_id,
        voice_id=body.voice_id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: int, current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: int, body: ProjectUpdate, current_user: CurrentUser, db: DBSession
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = body.model_dump(exclude_unset=True)
    if "scenes" in update_data and update_data["scenes"]:
        update_data["scenes"] = [
            s.model_dump() if hasattr(s, "model_dump") else s
            for s in update_data["scenes"]
        ]

    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: int, current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from app.services.storage import delete_object
    from app.models.video import Video
    from starlette.concurrency import run_in_threadpool
    
    # Fetch all videos for this project to delete their S3 objects
    videos_result = await db.execute(select(Video).where(Video.project_id == project.id))
    videos = videos_result.scalars().all()
    
    for video in videos:
        if video.video_s3_key:
            await run_in_threadpool(delete_object, video.video_s3_key)
        if video.audio_s3_key:
            await run_in_threadpool(delete_object, video.audio_s3_key)

    await db.delete(project)
    await db.commit()
