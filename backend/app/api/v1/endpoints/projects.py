"""
Project CRUD endpoints.
"""

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import func, select

from app.core.deps import CurrentUserAnyAuth, DBSession, CurrentWorkspace, RequireRole, user_has_permission
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectListOut, ProjectOut, ProjectUpdate
from app.services.analytics import track_event

router = APIRouter()


@router.get("", response_model=ProjectListOut)
async def list_projects(
    current_user: CurrentUserAnyAuth,
    workspace: CurrentWorkspace,
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
):
    offset = (page - 1) * page_size

    total_result = await db.execute(
        select(func.count()).where(Project.workspace_id == workspace.id)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(Project)
        .where(Project.workspace_id == workspace.id)
        .order_by(Project.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return ProjectListOut(items=list(items), total=total, page=page, page_size=page_size)

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED, dependencies=[RequireRole(["owner", "admin", "member"])])
async def create_project(body: ProjectCreate, current_user: CurrentUserAnyAuth, workspace: CurrentWorkspace, db: DBSession):
    project = Project(
        owner_id=current_user.id,
        workspace_id=workspace.id,
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
    
    await track_event(db, workspace.id, "project.created", user_id=current_user.id, project_id=project.id)
    
    return project


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: int, request: Request, current_user: CurrentUserAnyAuth, workspace: CurrentWorkspace, db: DBSession):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.workspace_id == workspace.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    role = getattr(request.state, "workspace_role", None)
    if not await user_has_permission(db, current_user, workspace.id, "project", project.id, "view", role):
        raise HTTPException(status_code=403, detail="Insufficient permission")
    return project


@router.put("/{project_id}", response_model=ProjectOut, dependencies=[RequireRole(["owner", "admin", "member"])])
async def update_project(
    project_id: int, body: ProjectUpdate, request: Request, current_user: CurrentUserAnyAuth, workspace: CurrentWorkspace, db: DBSession
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.workspace_id == workspace.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    role = getattr(request.state, "workspace_role", None)
    if not await user_has_permission(db, current_user, workspace.id, "project", project.id, "edit", role):
        raise HTTPException(status_code=403, detail="Insufficient permission")

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


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[RequireRole(["owner", "admin"])])
async def delete_project(project_id: int, request: Request, current_user: CurrentUserAnyAuth, workspace: CurrentWorkspace, db: DBSession):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.workspace_id == workspace.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    role = getattr(request.state, "workspace_role", None)
    if not await user_has_permission(db, current_user, workspace.id, "project", project.id, "delete", role):
        raise HTTPException(status_code=403, detail="Insufficient permission")

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
