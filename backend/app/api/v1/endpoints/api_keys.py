from datetime import UTC, datetime
from typing import List

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DBSession
from app.core.security import generate_api_key
from app.models.api_key import ApiKey
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreateOut, ApiKeyOut

router = APIRouter()


@router.post("", response_model=ApiKeyCreateOut, status_code=status.HTTP_201_CREATED)
async def create_api_key(body: ApiKeyCreate, current_user: CurrentUser, db: DBSession):
    full_key, key_prefix, key_hash = generate_api_key()

    api_key = ApiKey(
        user_id=current_user.id,
        name=body.name,
        key_prefix=key_prefix,
        key_hash=key_hash,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    # Convert to response model and manually inject full_key
    out = ApiKeyOut.model_validate(api_key)
    return ApiKeyCreateOut(**out.model_dump(), full_key=full_key)


@router.get("", response_model=List[ApiKeyOut])
async def list_api_keys(current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id, ApiKey.is_active == True)
        .order_by(ApiKey.created_at.desc())
    )
    return list(result.scalars().all())


@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(api_key_id: int, current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == api_key_id, ApiKey.user_id == current_user.id)
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API Key not found")

    api_key.is_active = False
    api_key.revoked_at = datetime.now(UTC)
    await db.commit()
