from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DBSession
from app.models.voice import Voice
from app.schemas.voice import VoiceListOut, VoiceOut, VoicePreviewOut, VoicePreviewRequest
from app.services.tts import generate_tts_preview

router = APIRouter()


from fastapi_cache.decorator import cache

@router.get("", response_model=VoiceListOut)
@cache(expire=3600)
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


from fastapi import APIRouter, HTTPException, Query, Request

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
