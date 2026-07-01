"""
Avatar endpoints — list (with search, category, gender, style filters + pagination)
and single-avatar fetch.
"""

from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from starlette.concurrency import run_in_threadpool

from app.core.deps import CurrentUser, DBSession
from app.models.avatar import Avatar
from app.schemas.avatar import AvatarListOut, AvatarOut
from app.services.storage import upload_bytes

router = APIRouter()


ALLOWED_UPLOAD_TYPES = {"image/jpeg", "image/png"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
AVATAR_MEDIA_DIR = Path("/app/media/avatars")
UPLOAD_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
}

@router.get("", response_model=AvatarListOut)
async def list_avatars(
    current_user: CurrentUser,
    db: DBSession,
    # Search & filters
    search: str | None = Query(None, description="Case-insensitive name search"),
    gender: str | None = Query(None),
    style: str | None = Query(None),
    category: str | None = Query(None),
    # Pagination
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
):
    query = select(Avatar).where(
        Avatar.is_active == True,  # noqa: E712
        or_(Avatar.owner_id.is_(None), Avatar.owner_id == current_user.id),
    )

    if search:
        query = query.where(Avatar.name.ilike(f"%{search}%"))
    if gender:
        query = query.where(Avatar.gender == gender.lower())
    if style:
        query = query.where(Avatar.style == style.lower())
    if category:
        query = query.where(Avatar.category == category.lower())

    # Total count (before pagination)
    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar_one()

    # Paginated results — free avatars first, then premium
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Avatar.is_premium.asc(), Avatar.name.asc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return AvatarListOut(items=list(items), total=total, page=page, page_size=page_size)


@router.post("/upload", response_model=AvatarOut, status_code=status.HTTP_201_CREATED)
async def upload_avatar(
    current_user: CurrentUser,
    db: DBSession,
    file: UploadFile = File(...),
    name: str = Form(...),
):
    if file.content_type not in ALLOWED_UPLOAD_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar image must be a JPEG or PNG file",
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar image must be 5MB or smaller",
        )

    cleaned_name = name.strip()
    if not cleaned_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar name is required",
        )

    avatar = Avatar(
        name=cleaned_name,
        owner_id=current_user.id,
        is_custom=True,
        is_active=True,
        is_premium=False,
    )
    db.add(avatar)
    await db.flush()

    extension = UPLOAD_EXTENSIONS[file.content_type]
    s3_key = f"avatars/{avatar.id}{extension}"
    local_path = AVATAR_MEDIA_DIR / f"{avatar.id}{extension}"
    await run_in_threadpool(AVATAR_MEDIA_DIR.mkdir, parents=True, exist_ok=True)
    await run_in_threadpool(local_path.write_bytes, image_bytes)

    await run_in_threadpool(upload_bytes, image_bytes, s3_key, file.content_type)
    avatar.thumbnail_url = s3_key

    await db.commit()
    await db.refresh(avatar)
    return avatar


@router.get("/{avatar_id}", response_model=AvatarOut)
async def get_avatar(
    avatar_id: int,
    current_user: CurrentUser,
    db: DBSession,
):
    result = await db.execute(
        select(Avatar).where(
            Avatar.id == avatar_id,
            Avatar.is_active == True,  # noqa: E712
            or_(Avatar.owner_id.is_(None), Avatar.owner_id == current_user.id),
        )
    )
    avatar = result.scalar_one_or_none()
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    return avatar
