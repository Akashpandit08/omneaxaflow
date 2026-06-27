import enum
from typing import Any, List, Optional

from sqlalchemy import JSON, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ProjectStatus(str, enum.Enum):
    draft = "draft"
    rendering = "rendering"
    completed = "completed"
    failed = "failed"


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    script: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scenes: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), default=ProjectStatus.draft, nullable=False
    )

    # FK stored as owner_id (the "owner" / creator)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    avatar_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("avatars.id", ondelete="SET NULL"), nullable=True
    )
    voice_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("voices.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    owner: Mapped["User"] = relationship(back_populates="projects")
    videos: Mapped[List["Video"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    avatar: Mapped[Optional["Avatar"]] = relationship(lazy="joined")
    voice: Mapped[Optional["Voice"]] = relationship(lazy="joined")

