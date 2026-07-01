"""
Video render and export endpoints.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, CurrentUserAnyAuth, DBSession, CurrentWorkspace, RequireRole, user_has_permission
from app.main import limiter
from app.models.project import Project, ProjectStatus
from app.models.subscription import Subscription
from app.models.video import Video, VideoStatus
from app.schemas.video import (
    RenderRequest,
    VideoDownloadOut,
    VideoListOut,
    VideoOut,
    VideoStatusOut,
)
from app.services.storage import get_presigned_download_url
from app.workers.video_tasks import render_video_task

router = APIRouter()


@router.get("", response_model=VideoListOut)
async def list_videos(
    current_user: CurrentUser,
    workspace: CurrentWorkspace,
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by project title or description"),
):
    query = select(Video).join(Project).where(Video.workspace_id == workspace.id)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (Project.title.ilike(search_term)) |
            (Project.description.ilike(search_term))
        )

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Video.created_at.desc())
        .options(selectinload(Video.project))
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return VideoListOut(items=list(items), total=total, page=page, page_size=page_size)


async def _check_subscription_quota(user_id: int, db: DBSession):
    sub_result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .options(selectinload(Subscription.plan))
    )
    subscription = sub_result.scalar_one_or_none()
    if subscription and subscription.videos_used_this_period >= subscription.plan.monthly_video_limit:
        raise HTTPException(
            status_code=402,
            detail=f"Monthly video limit ({subscription.plan.monthly_video_limit}) reached. Upgrade your plan.",
        )

@router.post(
    "/render", 
    response_model=VideoOut, 
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue video rendering task",
    description="Validates a project script and dispatches a Celery task to the AI background worker to generate voices, animate avatars, and render the final MP4.",
    dependencies=[RequireRole(["owner", "admin", "member"])]
)
@limiter.limit("10/minute")
async def render_video(request: Request, body: RenderRequest, current_user: CurrentUserAnyAuth, workspace: CurrentWorkspace, db: DBSession):
    # Fetch project and verify ownership
    proj_result = await db.execute(
        select(Project).where(
            Project.id == body.project_id, Project.workspace_id == workspace.id
        )
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    has_scenes = (
        isinstance(project.scenes, list)
        and any((scene.get("script") or scene.get("text") or "").strip() for scene in project.scenes if isinstance(scene, dict))
    )
    if not has_scenes and not project.script:
        raise HTTPException(status_code=400, detail="Project has no script to render")

    await _check_subscription_quota(current_user.id, db)

    # Create video record
    video = Video(project_id=project.id, workspace_id=workspace.id, status=VideoStatus.queued, progress_percent=0)
    db.add(video)
    project.status = ProjectStatus.rendering
    await db.commit()
    await db.refresh(video)

    # Dispatch Celery task
    task = render_video_task.delay(video.id, project.id)
    video.task_id = task.id
    await db.commit()
    await db.refresh(video)

    from app.services.analytics import track_event
    await track_event(db, workspace.id, "render.started", user_id=current_user.id, project_id=project.id, video_id=video.id)

    return video


@router.post(
    "/{video_id}/retry", 
    response_model=VideoOut, 
    status_code=status.HTTP_202_ACCEPTED,
    summary="Retry a failed video render",
    description="Resets the video's status back to queued and requeues the Celery rendering task.",
    dependencies=[RequireRole(["owner", "admin", "member"])]
)
@limiter.limit("10/minute")
async def retry_video(request: Request, video_id: int, current_user: CurrentUser, workspace: CurrentWorkspace, db: DBSession):
    result = await db.execute(
        select(Video)
        .where(Video.id == video_id, Video.workspace_id == workspace.id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    role = getattr(request.state, "workspace_role", None)
    if not await user_has_permission(db, current_user, workspace.id, "video", video.id, "edit", role):
        raise HTTPException(status_code=403, detail="Insufficient permission")
        
    if video.status not in (VideoStatus.failed, VideoStatus.completed):
        raise HTTPException(status_code=400, detail="Can only retry failed or completed videos")

    # Fetch project
    proj_result = await db.execute(select(Project).where(Project.id == video.project_id))
    project = proj_result.scalar_one_or_none()
    
    await _check_subscription_quota(current_user.id, db)

    video.status = VideoStatus.queued
    video.progress_percent = 0
    video.error_message = None
    project.status = ProjectStatus.rendering
    await db.commit()

    # Dispatch Celery task
    task = render_video_task.delay(video.id, project.id)
    video.task_id = task.id
    await db.commit()
    await db.refresh(video)

    return video


@router.get(
    "/{video_id}/status", 
    response_model=VideoStatusOut,
    summary="Get video rendering status",
    description="Poll this endpoint to receive the current background worker progress percent and status of a specific video."
)
async def get_video_status(video_id: int, request: Request, current_user: CurrentUserAnyAuth, workspace: CurrentWorkspace, db: DBSession):
    result = await db.execute(
        select(Video)
        .where(Video.id == video_id, Video.workspace_id == workspace.id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    role = getattr(request.state, "workspace_role", None)
    if not await user_has_permission(db, current_user, workspace.id, "video", video.id, "view", role):
        raise HTTPException(status_code=403, detail="Insufficient permission")

    return VideoStatusOut(
        video_id=video.id,
        status=video.status,
        progress_percent=video.progress_percent,
        error_message=video.error_message,
    )


@router.get("/{video_id}/download", response_model=VideoDownloadOut)
async def get_download_url(video_id: int, request: Request, current_user: CurrentUserAnyAuth, workspace: CurrentWorkspace, db: DBSession):
    result = await db.execute(
        select(Video)
        .where(Video.id == video_id, Video.workspace_id == workspace.id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    role = getattr(request.state, "workspace_role", None)
    if not await user_has_permission(db, current_user, workspace.id, "video", video.id, "view", role):
        raise HTTPException(status_code=403, detail="Insufficient permission")
    if video.status != VideoStatus.completed:
        raise HTTPException(status_code=400, detail="Video is not ready yet")
    if not video.video_s3_key:
        raise HTTPException(status_code=500, detail="Video file not found in storage")

    from app.services.analytics import track_event
    await track_event(db, workspace.id, "video.downloaded", user_id=current_user.id, project_id=video.project_id, video_id=video.id)

    url, expiry = get_presigned_download_url(video.video_s3_key)
    return VideoDownloadOut(download_url=url, expires_in=expiry)


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[RequireRole(["owner", "admin"])])
async def delete_video(video_id: int, request: Request, current_user: CurrentUser, workspace: CurrentWorkspace, db: DBSession):
    result = await db.execute(
        select(Video)
        .where(Video.id == video_id, Video.workspace_id == workspace.id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    role = getattr(request.state, "workspace_role", None)
    if not await user_has_permission(db, current_user, workspace.id, "video", video.id, "delete", role):
        raise HTTPException(status_code=403, detail="Insufficient permission")

    from app.services.storage import delete_object
    from starlette.concurrency import run_in_threadpool

    if video.video_s3_key:
        await run_in_threadpool(delete_object, video.video_s3_key)
    if video.audio_s3_key:
        await run_in_threadpool(delete_object, video.audio_s3_key)

    await db.delete(video)
    await db.commit()
