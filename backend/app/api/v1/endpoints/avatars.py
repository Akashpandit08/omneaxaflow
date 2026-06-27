"""
Avatar endpoints — list (with search, category, gender, style filters + pagination)
and single-avatar fetch.
"""

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DBSession
from app.models.avatar import Avatar
from app.schemas.avatar import AvatarListOut, AvatarOut

router = APIRouter()


from fastapi_cache.decorator import cache

@router.get("", response_model=AvatarListOut)
@cache(expire=3600)
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
    query = select(Avatar).where(Avatar.is_active == True)  # noqa: E712

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


@router.get("/{avatar_id}", response_model=AvatarOut)
async def get_avatar(
    avatar_id: int,
    current_user: CurrentUser,
    db: DBSession,
):
    result = await db.execute(
        select(Avatar).where(Avatar.id == avatar_id, Avatar.is_active == True)  # noqa: E712
    )
    avatar = result.scalar_one_or_none()
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    return avatar
