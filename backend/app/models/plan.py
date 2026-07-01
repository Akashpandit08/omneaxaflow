from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

class PlanTier:
    FREE = "free"
    PRO = "pro"
    BUSINESS = "business"

class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    tier: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    monthly_video_limit: Mapped[int] = mapped_column(Integer, nullable=False)
    max_video_duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_gb: Mapped[int] = mapped_column(Integer, nullable=False)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    razorpay_plan_id: Mapped[str] = mapped_column(String(100), nullable=True)
    cashfree_plan_id: Mapped[str] = mapped_column(String(100), nullable=True)

    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="plan")
