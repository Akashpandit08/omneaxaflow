from typing import List
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func

from app.core.deps import CurrentUser, DBSession, CurrentWorkspace
from app.models.content import VideoTranslation, TranslationStatus
from app.models.video import Video
from app.schemas.content import (
    TranslationCreate,
    TranslationOut,
    TranslationListOut
)
from app.workers.translation_tasks import translate_video_task

router = APIRouter()

@router.post("/videos/{id}/translate", response_model=TranslationOut, status_code=status.HTTP_201_CREATED)
async def create_translation(
    id: int,
    translation_in: TranslationCreate,
    db: DBSession,
    current_user: CurrentUser,
    workspace: CurrentWorkspace
):
    video = db.execute(
        select(Video).where(Video.id == id, Video.workspace_id == workspace.id)
    ).scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    translation = VideoTranslation(
        video_id=video.id,
        workspace_id=workspace.id,
        source_language="en", # typically inferred or stored, defaulting to en
        target_language=translation_in.target_language,
        voice_id=translation_in.voice_id,
        status=TranslationStatus.queued
    )
    db.add(translation)
    db.commit()
    db.refresh(translation)

    # Trigger Celery task
    translate_video_task.delay(translation.id)

    return translation

@router.get("/videos/{id}/translations", response_model=TranslationListOut)
async def list_video_translations(
    id: int,
    db: DBSession,
    current_user: CurrentUser,
    workspace: CurrentWorkspace,
    page: int = 1,
    page_size: int = 20
):
    video = db.execute(
        select(Video).where(Video.id == id, Video.workspace_id == workspace.id)
    ).scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    query = select(VideoTranslation).where(
        VideoTranslation.video_id == id, 
        VideoTranslation.workspace_id == workspace.id
    ).order_by(VideoTranslation.created_at.desc())
    
    total = db.execute(select(func.count()).select_from(query.subquery())).scalar() or 0
    items = db.execute(query.offset((page - 1) * page_size).limit(page_size)).scalars().all()

    return TranslationListOut(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )

@router.get("/translations/{id}", response_model=TranslationOut)
async def get_translation(
    id: int,
    db: DBSession,
    current_user: CurrentUser,
    workspace: CurrentWorkspace
):
    translation = db.execute(
        select(VideoTranslation).where(
            VideoTranslation.id == id, 
            VideoTranslation.workspace_id == workspace.id
        )
    ).scalar_one_or_none()

    if not translation:
        raise HTTPException(status_code=404, detail="Translation not found")

    return translation

@router.delete("/translations/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_translation(
    id: int,
    db: DBSession,
    current_user: CurrentUser,
    workspace: CurrentWorkspace
):
    translation = db.execute(
        select(VideoTranslation).where(
            VideoTranslation.id == id, 
            VideoTranslation.workspace_id == workspace.id
        )
    ).scalar_one_or_none()

    if not translation:
        raise HTTPException(status_code=404, detail="Translation not found")

    db.delete(translation)
    db.commit()
    return None
