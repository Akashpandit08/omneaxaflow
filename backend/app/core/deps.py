"""
FastAPI dependency injection — current user, DB session, etc.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status, Request
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
    request: Request,
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
                
                request.state.api_key_workspace_id = db_api_key.workspace_id
                return user
        raise HTTPException(status_code=401, detail="Invalid or revoked API Key")

    # 2. Try JWT token
    if token:
        return await get_current_user(token=token, db=db)

    raise HTTPException(status_code=401, detail="Not authenticated")


CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentUserAnyAuth = Annotated[User, Depends(get_current_user_any_auth)]
DBSession = Annotated[AsyncSession, Depends(get_db)]

from fastapi import Header
from app.models.workspace import Workspace, WorkspaceMember

async def get_current_workspace(
    request: Request,
    user: CurrentUserAnyAuth,
    db: DBSession,
    x_workspace_id: str | None = Header(None, alias="X-Workspace-ID"),
) -> Workspace:
    workspace_id = None
    
    # 1. If API key was used, it dictates the workspace
    if hasattr(request.state, "api_key_workspace_id") and request.state.api_key_workspace_id:
        workspace_id = request.state.api_key_workspace_id
        if x_workspace_id and str(x_workspace_id) != str(workspace_id):
            raise HTTPException(status_code=403, detail="API key cannot be used for a different workspace")
    
    # 2. Otherwise use the header
    elif x_workspace_id:
        workspace_id = int(x_workspace_id)
        
    if not workspace_id:
        raise HTTPException(status_code=400, detail="X-Workspace-ID header is required")

    # Fetch workspace and check membership
    stmt = (
        select(Workspace)
        .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
        .where(
            Workspace.id == workspace_id,
            WorkspaceMember.user_id == user.id,
            WorkspaceMember.status == "active"
        )
    )
    result = await db.execute(stmt)
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(status_code=403, detail="Not an active member of this workspace")
        
    request.state.workspace = workspace
    
    # Also fetch the member role so we can use it in RequireRole
    member_stmt = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id
    )
    member_result = await db.execute(member_stmt)
    member = member_result.scalar_one_or_none()
    request.state.workspace_role = member.role if member else None

    if hasattr(request.state, "api_key_workspace_id") and request.state.api_key_workspace_id:
        try:
            from app.services.analytics import track_event
            # This is called often. Consider moving to background task or Redis for scale.
            await track_event(db, workspace.id, "api.request", user_id=user.id)
        except Exception as e:
            logger.error(f"Failed to track api_request: {e}")

    return workspace


CurrentWorkspace = Annotated[Workspace, Depends(get_current_workspace)]


def RequireRole(allowed_roles: list[str]):
    async def role_checker(request: Request, workspace: CurrentWorkspace):
        role = getattr(request.state, "workspace_role", None)
        if not role or role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(allowed_roles)}"
            )
        return role
    return Depends(role_checker)


def _resource_model(resource_type: str):
    from app.models.collaboration import Comment, Template
    from app.models.project import Project
    from app.models.video import Video

    return {
        "project": Project,
        "video": Video,
        "template": Template,
        "comment": Comment,
    }.get(resource_type)


async def user_has_permission(
    db: AsyncSession,
    user: User,
    workspace_id: int,
    resource_type: str,
    resource_id: int,
    permission: str,
    role: str | None = None,
) -> bool:
    if role in {"owner", "admin"}:
        return True

    model = _resource_model(resource_type)
    if model is None:
        return False

    resource = await db.get(model, resource_id)
    if not resource or getattr(resource, "workspace_id", None) != workspace_id:
        return False

    owner_id = getattr(resource, "owner_id", None) or getattr(resource, "creator_id", None) or getattr(resource, "user_id", None)
    if owner_id == user.id:
        return True

    from app.models.collaboration import ContentPermission

    result = await db.execute(
        select(ContentPermission).where(
            ContentPermission.resource_type == resource_type,
            ContentPermission.resource_id == resource_id,
            ContentPermission.user_id == user.id,
            ContentPermission.permission.in_([permission, "share"] if permission == "view" else [permission]),
        )
    )
    return result.scalar_one_or_none() is not None


def RequirePermission(resource_type: str, permission: str, id_param: str = "id"):
    async def permission_checker(
        request: Request,
        user: CurrentUserAnyAuth,
        workspace: CurrentWorkspace,
        db: DBSession,
    ):
        resource_id = request.path_params.get(id_param)
        if resource_id is None:
            raise HTTPException(status_code=400, detail=f"Missing path parameter: {id_param}")
        role = getattr(request.state, "workspace_role", None)
        allowed = await user_has_permission(
            db,
            user,
            workspace.id,
            resource_type,
            int(resource_id),
            permission,
            role,
        )
        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission")
        return True

    return Depends(permission_checker)
