"""
FastAPI dependency injection — current user, DB session, etc.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


from fastapi.security import APIKeyHeader
from app.models.api_key import ApiKey
from app.core.security import verify_password, API_KEY_LOOKUP_PREFIX_LENGTH
from datetime import UTC, datetime
from sqlalchemy.orm import joinedload
import logging

logger = logging.getLogger(__name__)

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_current_user_any_auth(
    db: AsyncSession = Depends(get_db),
    token: str | None = Depends(oauth2_scheme_optional),
    api_key: str | None = Depends(api_key_header),
) -> User:
    # 1. Try API Key
    if api_key:
        key_prefix = api_key[:API_KEY_LOOKUP_PREFIX_LENGTH]
        stmt = (
            select(ApiKey)
            .options(joinedload(ApiKey.user))
            .where(ApiKey.key_prefix == key_prefix, ApiKey.is_active == True)
        )
        result = await db.execute(stmt)
        db_api_key = result.scalar_one_or_none()
        
        if db_api_key and verify_password(api_key, db_api_key.key_hash):
            if db_api_key.revoked_at is None:
                user = db_api_key.user
                # Best effort last_used_at update
                try:
                    db_api_key.last_used_at = datetime.now(UTC)
                    await db.commit()
                except Exception as e:
                    logger.warning(f"Failed to update API key last_used_at: {e}")
                
                return user
        raise HTTPException(status_code=401, detail="Invalid or revoked API Key")

    # 2. Try JWT token
    if token:
        return await get_current_user(token=token, db=db)

    raise HTTPException(status_code=401, detail="Not authenticated")


CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentUserAnyAuth = Annotated[User, Depends(get_current_user_any_auth)]
DBSession = Annotated[AsyncSession, Depends(get_db)]
