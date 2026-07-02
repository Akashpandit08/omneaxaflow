from fastapi import APIRouter, Query
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime, UTC, date, timedelta

from app.core.deps import CurrentWorkspace, DBSession, RequireRole
from app.models.analytics import AnalyticsEvent, WorkspaceAnalyticsDaily

router = APIRouter()

@router.get("/overview", dependencies=[RequireRole(["owner", "admin", "editor", "viewer"])])
async def get_analytics_overview(
    workspace: CurrentWorkspace,
    db: DBSession,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    if not start_date:
        start_date = (datetime.now(UTC) - timedelta(days=30)).date()
    if not end_date:
        end_date = datetime.now(UTC).date()
        
    stmt = (
        select(
            func.sum(WorkspaceAnalyticsDaily.projects_created).label("total_projects"),
            func.sum(WorkspaceAnalyticsDaily.renders_started).label("total_renders"),
            func.sum(WorkspaceAnalyticsDaily.renders_completed).label("completed_renders"),
            func.sum(WorkspaceAnalyticsDaily.renders_failed).label("failed_renders"),
            func.sum(WorkspaceAnalyticsDaily.downloads).label("total_downloads"),
            func.sum(WorkspaceAnalyticsDaily.api_requests).label("total_api_requests"),
            func.sum(WorkspaceAnalyticsDaily.webhooks_delivered).label("webhooks_delivered"),
            func.sum(WorkspaceAnalyticsDaily.webhooks_failed).label("webhooks_failed"),
        )
        .where(
            WorkspaceAnalyticsDaily.workspace_id == workspace.id,
            WorkspaceAnalyticsDaily.date >= start_date,
            WorkspaceAnalyticsDaily.date <= end_date
        )
    )
    result = await db.execute(stmt)
    row = result.fetchone()
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "metrics": {
            "projects_created": row.total_projects or 0,
            "renders_started": row.total_renders or 0,
            "renders_completed": row.completed_renders or 0,
            "renders_failed": row.failed_renders or 0,
            "downloads": row.total_downloads or 0,
            "api_requests": row.total_api_requests or 0,
            "webhooks_delivered": row.webhooks_delivered or 0,
            "webhooks_failed": row.webhooks_failed or 0,
        }
    }

@router.get("/daily", dependencies=[RequireRole(["owner", "admin", "editor", "viewer"])])
async def get_analytics_daily(
    workspace: CurrentWorkspace,
    db: DBSession,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    if not start_date:
        start_date = (datetime.now(UTC) - timedelta(days=30)).date()
    if not end_date:
        end_date = datetime.now(UTC).date()
        
    stmt = (
        select(WorkspaceAnalyticsDaily)
        .where(
            WorkspaceAnalyticsDaily.workspace_id == workspace.id,
            WorkspaceAnalyticsDaily.date >= start_date,
            WorkspaceAnalyticsDaily.date <= end_date
        )
        .order_by(WorkspaceAnalyticsDaily.date.asc())
    )
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    return [
        {
            "date": r.date,
            "projects_created": r.projects_created,
            "renders_started": r.renders_started,
            "renders_completed": r.renders_completed,
            "renders_failed": r.renders_failed,
            "api_requests": r.api_requests,
        } for r in records
    ]

@router.get("/events", dependencies=[RequireRole(["owner", "admin", "editor"])])
async def get_analytics_events(
    workspace: CurrentWorkspace,
    db: DBSession,
    event_type: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    stmt = select(AnalyticsEvent).where(AnalyticsEvent.workspace_id == workspace.id)
    if event_type:
        stmt = stmt.where(AnalyticsEvent.event_type == event_type)
        
    stmt = stmt.order_by(AnalyticsEvent.occurred_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    
    # Also get total count
    count_stmt = select(func.count()).select_from(AnalyticsEvent).where(AnalyticsEvent.workspace_id == workspace.id)
    if event_type:
        count_stmt = count_stmt.where(AnalyticsEvent.event_type == event_type)
    total = await db.scalar(count_stmt)
    
    events = []
    for e in result.scalars().all():
        events.append({
            "id": e.id,
            "event_type": e.event_type,
            "user_id": e.user_id,
            "project_id": e.project_id,
            "video_id": e.video_id,
            "occurred_at": e.occurred_at,
            "metadata": e.metadata
        })
        
    return {
        "items": events,
        "total": total,
        "limit": limit,
        "offset": offset
    }
