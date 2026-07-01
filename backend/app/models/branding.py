from datetime import datetime

from sqlalchemy import String, DateTime, func, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class WorkspaceBranding(Base):
    __tablename__ = "workspace_branding"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo_s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    favicon_s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    primary_color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    secondary_color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    accent_color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    support_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    custom_domain: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True, index=True)
    domain_verification_token_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    domain_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    domain_last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    hide_renderflow_branding: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_from_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    workspace = relationship("Workspace", back_populates="branding")
