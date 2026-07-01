from datetime import datetime
from typing import List, Optional

from sqlalchemy import JSON, Boolean, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    backup_codes: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    projects: Mapped[List["Project"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    subscription: Mapped[Optional["Subscription"]] = relationship(back_populates="user", uselist=False)
    api_keys: Mapped[List["ApiKey"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    webhooks: Mapped[List["Webhook"]] = relationship(back_populates="user", cascade="all, delete-orphan")
