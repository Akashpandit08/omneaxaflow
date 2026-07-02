from pathlib import Path
from starlette.concurrency import run_in_threadpool
from fastapi import APIRouter, HTTPException, Query, Request, UploadFile, File, Form
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DBSession, CurrentWorkspace
from app.models.voice import Voice
from app.schemas.voice import VoiceListOut, VoiceOut, VoicePreviewOut, VoicePreviewRequest
from app.services.tts import generate_tts_preview
from app.models.advanced import VoiceClone
from app.schemas.advanced import VoiceCloneCreate, VoiceCloneOut
from app.workers.voice_tasks import train_voice_clone_task
from app.services.analytics import track_event
from app.core.config import settings

router = APIRouter()


@router.get("", response_model=VoiceListOut)
async def list_voices(
    current_user: CurrentUser,
    db: DBSession,
    language: str | None = Query(None),
    gender: str | None = Query(None),
):
    query = select(Voice).where(Voice.is_active == True)  # noqa: E712
    if language:
        query = query.where(Voice.language == language)
    if gender:
        query = query.where(Voice.gender == gender)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(query.order_by(Voice.name))
    items = result.scalars().all()

    return VoiceListOut(items=list(items), total=total)


from fastapi import APIRouter, HTTPException, Query, Request, UploadFile, File, Form

from app.main import limiter

@router.post("/preview", response_model=VoicePreviewOut)
@limiter.limit("5/minute")
async def voice_preview(request: Request, body: VoicePreviewRequest, current_user: CurrentUser, db: DBSession):
    result = await db.execute(select(Voice).where(Voice.id == body.voice_id))
    voice = result.scalar_one_or_none()
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")

    # Limit preview text length
    preview_text = body.text[:200]
    audio_url = await generate_tts_preview(voice, preview_text)
    return VoicePreviewOut(audio_url=audio_url)

@router.post("/clone", response_model=VoiceCloneOut)
async def clone_voice(
    request: Request,
    current_user: CurrentUser,
    workspace: CurrentWorkspace,
    db: DBSession,
    name: str = Form(...),
    provider: str | None = Form(None),
    audio_file: UploadFile = File(...)
):
    selected_provider = (provider or settings.VOICE_DEFAULT_PROVIDER).lower().strip()
    if selected_provider == "elevenlabs" and not settings.ENABLE_ELEVENLABS_TTS:
        raise HTTPException(
            status_code=400,
            detail="ElevenLabs voice cloning is disabled. Use Cartesia for hosted cloning.",
        )
    if selected_provider == "polly":
        raise HTTPException(
            status_code=400,
            detail="Amazon Polly does not support custom voice cloning. Use Cartesia for hosted cloning.",
        )
    if selected_provider == "gtts":
        raise HTTPException(
            status_code=400,
            detail="gTTS does not support custom voice cloning. Use Cartesia for hosted cloning.",
        )
    if selected_provider == "cartesia" and not settings.CARTESIA_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="Cartesia voice cloning is not configured. Set CARTESIA_API_KEY.",
        )
    
    clone = VoiceClone(
        workspace_id=workspace.id,
        user_id=current_user.id,
        name=name,
        provider=selected_provider,
        sample_audio_url="",
        status="uploaded"
    )
    db.add(clone)
    await db.flush()
    
    # Save the file to disk
    VOICES_MEDIA_DIR = Path("/app/media/voices")
    await run_in_threadpool(VOICES_MEDIA_DIR.mkdir, parents=True, exist_ok=True)
    
    extension = ".mp3"
    if audio_file.filename and "." in audio_file.filename:
        extension = f".{audio_file.filename.split('.')[-1]}"
        
    local_path = VOICES_MEDIA_DIR / f"{clone.id}{extension}"
    audio_bytes = await audio_file.read()
    await run_in_threadpool(local_path.write_bytes, audio_bytes)
    
    clone.sample_audio_url = f"/media/voices/{clone.id}{extension}"
    await db.commit()
    await db.refresh(clone)
    
    # Trigger Celery task
    from app.workers.celery_app import celery_app
    celery_app.send_task("app.workers.voice_tasks.train_voice_clone_task", args=[clone.id])
    
    await track_event(db, workspace.id, "VOICE_CLONE_CREATED")
    
    return clone

@router.get("/clones", response_model=list[VoiceCloneOut])
async def list_voice_clones(
    request: Request,
    current_user: CurrentUser,
    workspace: CurrentWorkspace,
    db: DBSession
):
    result = await db.execute(select(VoiceClone).where(VoiceClone.workspace_id == workspace.id))
    return list(result.scalars().all())

@router.get("/clones/{id}", response_model=VoiceCloneOut)
async def get_voice_clone(
    id: int,
    request: Request,
    current_user: CurrentUser,
    workspace: CurrentWorkspace,
    db: DBSession
):
    result = await db.execute(select(VoiceClone).where(VoiceClone.id == id, VoiceClone.workspace_id == workspace.id))
    clone = result.scalar_one_or_none()
    if not clone:
        raise HTTPException(status_code=404, detail="Voice clone not found")
    return clone

@router.delete("/clones/{id}", status_code=204)
async def delete_voice_clone(
    id: int,
    request: Request,
    current_user: CurrentUser,
    workspace: CurrentWorkspace,
    db: DBSession
):
    result = await db.execute(select(VoiceClone).where(VoiceClone.id == id, VoiceClone.workspace_id == workspace.id))
    clone = result.scalar_one_or_none()
    if not clone:
        raise HTTPException(status_code=404, detail="Voice clone not found")
        
    await db.delete(clone)
    await db.commit()
    
    await track_event(db, workspace.id, "VOICE_CLONE_DELETED")
    return None

@router.post("/clones/{id}/retrain", response_model=VoiceCloneOut)
async def retrain_voice_clone(
    id: int,
    request: Request,
    current_user: CurrentUser,
    workspace: CurrentWorkspace,
    db: DBSession
):
    result = await db.execute(select(VoiceClone).where(VoiceClone.id == id, VoiceClone.workspace_id == workspace.id))
    clone = result.scalar_one_or_none()
    if not clone:
        raise HTTPException(status_code=404, detail="Voice clone not found")
        
    if clone.status != "failed":
        raise HTTPException(status_code=400, detail="Can only retrain failed voice clones")
        
    clone.status = "training"
    clone.provider_error = None
    await db.commit()
    await db.refresh(clone)
    
    # Trigger Celery task
    from app.workers.celery_app import celery_app
    celery_app.send_task("app.workers.voice_tasks.train_voice_clone_task", args=[clone.id])
    
    await track_event(db, workspace.id, "VOICE_CLONE_RETRAINED")
    return clone

@router.post("/clones/{id}/preview")
async def preview_voice_clone(
    id: int,
    request: Request,
    current_user: CurrentUser,
    workspace: CurrentWorkspace,
    db: DBSession
):
    result = await db.execute(select(VoiceClone).where(VoiceClone.id == id, VoiceClone.workspace_id == workspace.id))
    clone = result.scalar_one_or_none()
    if not clone:
        raise HTTPException(status_code=404, detail="Voice clone not found")
        
    if clone.status != "ready" or not clone.preview_url:
        raise HTTPException(status_code=400, detail="Preview not ready")
        
    await track_event(db, workspace.id, "VOICE_PREVIEW_GENERATED")
    return {"preview_url": clone.preview_url}
