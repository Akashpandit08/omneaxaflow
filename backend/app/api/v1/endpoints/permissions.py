from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.core.deps import CurrentUserAnyAuth, CurrentWorkspace, DBSession, user_has_permission
from app.models.collaboration import ContentPermission
from app.schemas.collaboration import PermissionCreate, PermissionOut
from app.services.audit import write_audit_log

router = APIRouter()


@router.post("", response_model=PermissionOut, status_code=status.HTTP_201_CREATED)
async def grant_permission(
    body: PermissionCreate,
    request: Request,
    current_user: CurrentUserAnyAuth,
    workspace: CurrentWorkspace,
    db: DBSession,
):
    role = getattr(request.state, "workspace_role", None)
    can_share = await user_has_permission(
        db, current_user, workspace.id, body.resource_type, body.resource_id, "share", role
    )
    if not can_share:
        raise HTTPException(status_code=403, detail="Share permission required")

    existing = await db.execute(
        select(ContentPermission).where(
            ContentPermission.resource_type == body.resource_type,
            ContentPermission.resource_id == body.resource_id,
            ContentPermission.user_id == body.user_id,
            ContentPermission.permission == body.permission,
        )
    )
    permission = existing.scalar_one_or_none()
    if permission:
        return permission

    permission = ContentPermission(
        resource_type=body.resource_type,
        resource_id=body.resource_id,
        user_id=body.user_id,
        permission=body.permission,
        granted_by=current_user.id,
    )
    db.add(permission)
    await write_audit_log(
        db,
        "CHANGE_PERMISSIONS",
        workspace_id=workspace.id,
        user_id=current_user.id,
        resource_type=body.resource_type,
        resource_id=body.resource_id,
        metadata={"permission": body.permission, "target_user_id": body.user_id},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(permission)
    return permission


@router.get("/{resource}", response_model=list[PermissionOut])
async def list_permissions(
    resource: str,
    request: Request,
    current_user: CurrentUserAnyAuth,
    workspace: CurrentWorkspace,
    db: DBSession,
):
    try:
        resource_type, raw_resource_id = resource.split(":", 1)
        resource_id = int(raw_resource_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Resource must be formatted as type:id") from exc

    role = getattr(request.state, "workspace_role", None)
    can_share = await user_has_permission(db, current_user, workspace.id, resource_type, resource_id, "share", role)
    if not can_share:
        raise HTTPException(status_code=403, detail="Share permission required")

    result = await db.execute(
        select(ContentPermission)
        .where(ContentPermission.resource_type == resource_type, ContentPermission.resource_id == resource_id)
        .order_by(ContentPermission.created_at.desc())
    )
    return list(result.scalars().all())


@router.delete("/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_permission(
    permission_id: int,
    request: Request,
    current_user: CurrentUserAnyAuth,
    workspace: CurrentWorkspace,
    db: DBSession,
):
    permission = await db.get(ContentPermission, permission_id)
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    role = getattr(request.state, "workspace_role", None)
    can_share = await user_has_permission(
        db,
        current_user,
        workspace.id,
        permission.resource_type,
        permission.resource_id,
        "share",
        role,
    )
    if not can_share:
        raise HTTPException(status_code=403, detail="Share permission required")

    await write_audit_log(
        db,
        "CHANGE_PERMISSIONS",
        workspace_id=workspace.id,
        user_id=current_user.id,
        resource_type=permission.resource_type,
        resource_id=permission.resource_id,
        metadata={"revoked_permission_id": permission.id},
        ip_address=request.client.host if request.client else None,
    )
    await db.delete(permission)
    await db.commit()
