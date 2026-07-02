from fastapi import APIRouter
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DBSession
from app.models.project import Project
from app.models.video import Video
from app.models.subscription import Subscription
from app.schemas.dashboard import DashboardStatsOut, VideoStatusCounts

router = APIRouter()

@router.get("/stats", response_model=DashboardStatsOut)
async def get_dashboard_stats(current_user: CurrentUser, db: DBSession):
    # 1. Total videos
    total_videos_query = select(func.count()).select_from(
        select(Video).join(Project).where(Project.owner_id == current_user.id).subquery()
    )
    total_videos = (await db.execute(total_videos_query)).scalar_one()

    # 2. Credits remaining
    sub_query = select(Subscription).where(Subscription.user_id == current_user.id).options(selectinload(Subscription.plan))
    subscription = (await db.execute(sub_query)).scalar_one_or_none()
    
    total_credits = 3 # default free tier
    used_credits = 0
    if subscription and subscription.plan:
        total_credits = subscription.plan.monthly_video_limit
        used_credits = subscription.videos_used_this_period
    
    credits_remaining = max(0, total_credits - used_credits)

    # 3. Video statuses
    status_query = (
        select(Video.status, func.count(Video.id))
        .join(Project)
        .where(Project.owner_id == current_user.id)
        .group_by(Video.status)
    )
    status_results = (await db.execute(status_query)).all()
    
    counts = {"queued": 0, "processing": 0, "completed": 0, "failed": 0}
    for status, count in status_results:
        # status could be enum or string depending on sqlalchemy mapping
        status_name = status.name if hasattr(status, 'name') else str(status)
        if status_name in counts:
            counts[status_name] = count

    return DashboardStatsOut(
        total_videos=total_videos,
        credits_remaining=credits_remaining,
        total_credits=total_credits,
        video_statuses=VideoStatusCounts(**counts)
    )
