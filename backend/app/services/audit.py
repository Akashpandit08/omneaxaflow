from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collaboration import AuditLog


async def write_audit_log(
    db: AsyncSession,
    action: str,
    *,
    workspace_id: int | None = None,
    user_id: int | None = None,
    resource_type: str | None = None,
    resource_id: int | None = None,
    metadata: dict[str, Any] | None = None,
    ip_address: str | None = None,
    commit: bool = False,
) -> AuditLog:
    log = AuditLog(
        workspace_id=workspace_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        log_metadata=metadata,
        ip_address=ip_address,
    )
    db.add(log)
    if commit:
        await db.commit()
        await db.refresh(log)
    return log
