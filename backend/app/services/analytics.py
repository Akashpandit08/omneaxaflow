import logging
from typing import Any, Dict, Optional
from datetime import datetime, UTC

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.analytics import AnalyticsEvent, WorkspaceAnalyticsDaily

logger = logging.getLogger(__name__)

async def track_event(
    db: AsyncSession,
    workspace_id: int,
    event_type: str,
    user_id: Optional[int] = None,
    project_id: Optional[int] = None,
    video_id: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Track an analytics event for a workspace asynchronously.
    """
    try:
        event = AnalyticsEvent(
            workspace_id=workspace_id,
            user_id=user_id,
            event_type=event_type,
            project_id=project_id,
            video_id=video_id,
            metadata=metadata or {},
            occurred_at=datetime.now(UTC),
        )
        db.add(event)
        
        # Also update daily rollups
        today = datetime.now(UTC).date()
        stmt = select(WorkspaceAnalyticsDaily).where(
            WorkspaceAnalyticsDaily.workspace_id == workspace_id,
            WorkspaceAnalyticsDaily.date == today
        )
        result = await db.execute(stmt)
        daily = result.scalar_one_or_none()
        
        if not daily:
            daily = WorkspaceAnalyticsDaily(
                workspace_id=workspace_id, date=today,
                projects_created=0, renders_started=0, renders_completed=0, renders_failed=0,
                downloads=0, api_requests=0, webhooks_delivered=0, webhooks_failed=0
            )
            db.add(daily)
            
        if event_type == "project.created":
            daily.projects_created += 1
        elif event_type == "render.started":
            daily.renders_started += 1
        elif event_type == "render.completed":
            daily.renders_completed += 1
        elif event_type == "render.failed":
            daily.renders_failed += 1
        elif event_type == "video.downloaded":
            daily.downloads += 1
        elif event_type == "api.request":
            daily.api_requests += 1
        elif event_type == "webhook.delivered":
            daily.webhooks_delivered += 1
        elif event_type == "webhook.failed":
            daily.webhooks_failed += 1
            
        await db.commit()
    except Exception as e:
        logger.error(f"Failed to track analytics event {event_type}: {e}")
        # Ensure we don't blow up the main request due to an analytics failure
        await db.rollback()

def track_event_sync(
    db: Any,
    workspace_id: int,
    event_type: str,
    user_id: Optional[int] = None,
    project_id: Optional[int] = None,
    video_id: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Track an analytics event for a workspace synchronously (for Celery tasks).
    """
    try:
        event = AnalyticsEvent(
            workspace_id=workspace_id,
            user_id=user_id,
            event_type=event_type,
            project_id=project_id,
            video_id=video_id,
            metadata=metadata or {},
            occurred_at=datetime.now(UTC),
        )
        db.add(event)
        
        # Also update daily rollups
        today = datetime.now(UTC).date()
        stmt = select(WorkspaceAnalyticsDaily).where(
            WorkspaceAnalyticsDaily.workspace_id == workspace_id,
            WorkspaceAnalyticsDaily.date == today
        )
        result = db.execute(stmt)
        daily = result.scalar_one_or_none()
        
        if not daily:
            daily = WorkspaceAnalyticsDaily(
                workspace_id=workspace_id, date=today,
                projects_created=0, renders_started=0, renders_completed=0, renders_failed=0,
                downloads=0, api_requests=0, webhooks_delivered=0, webhooks_failed=0
            )
            db.add(daily)
            
        if event_type == "project.created":
            daily.projects_created += 1
        elif event_type == "render.started":
            daily.renders_started += 1
        elif event_type == "render.completed":
            daily.renders_completed += 1
        elif event_type == "render.failed":
            daily.renders_failed += 1
        elif event_type == "video.downloaded":
            daily.downloads += 1
        elif event_type == "api.request":
            daily.api_requests += 1
        elif event_type == "webhook.delivered":
            daily.webhooks_delivered += 1
        elif event_type == "webhook.failed":
            daily.webhooks_failed += 1
            
        db.commit()
    except Exception as e:
        logger.error(f"Failed to sync track analytics event {event_type}: {e}")
        db.rollback()
