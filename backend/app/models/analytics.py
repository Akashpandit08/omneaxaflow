from datetime import datetime, date

from sqlalchemy import String, DateTime, func, ForeignKey, JSON, Integer, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    video_id: Mapped[int | None] = mapped_column(ForeignKey("videos.id", ondelete="SET NULL"), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    workspace = relationship("Workspace")


class WorkspaceAnalyticsDaily(Base):
    __tablename__ = "workspace_analytics_daily"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    projects_created: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    renders_started: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    renders_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    renders_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    downloads: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    api_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    webhooks_delivered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    webhooks_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_render_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    workspace = relationship("Workspace")
