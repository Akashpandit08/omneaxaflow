from datetime import datetime

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.core.deps import CurrentUserAnyAuth, CurrentWorkspace, DBSession, RequireRole
from app.models.collaboration import AuditLog
from app.schemas.collaboration import AuditLogListOut

router = APIRouter()


@router.get("", response_model=AuditLogListOut, dependencies=[RequireRole(["owner", "admin"])])
async def list_audit_logs(
    current_user: CurrentUserAnyAuth,
    workspace: CurrentWorkspace,
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    user: int | None = None,
    action: str | None = None,
    resource: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
):
    query = select(AuditLog).where(AuditLog.workspace_id == workspace.id)
    if user:
        query = query.where(AuditLog.user_id == user)
    if action:
        query = query.where(AuditLog.action == action)
    if resource:
        query = query.where(AuditLog.resource_type == resource)
    if date_from:
        query = query.where(AuditLog.created_at >= date_from)
    if date_to:
        query = query.where(AuditLog.created_at <= date_to)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    result = await db.execute(
        query.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return AuditLogListOut(items=list(result.scalars().all()), total=total, page=page, page_size=page_size)
