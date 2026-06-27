from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel

class PlanOut(BaseModel):
    id: int
    name: str
    tier: str
    monthly_video_limit: int
    max_video_duration_seconds: int
    storage_gb: int
    price_cents: int
    razorpay_plan_id: Optional[str] = None

    model_config = {"from_attributes": True}

class BillingHistoryOut(BaseModel):
    id: int
    amount_cents: int
    status: str
    date: datetime
    razorpay_payment_id: Optional[str] = None
    razorpay_invoice_id: Optional[str] = None
    invoice_url: Optional[str] = None

    model_config = {"from_attributes": True}

class SubscriptionOut(BaseModel):
    id: int
    status: str
    videos_used_this_period: int
    current_period_end: Optional[datetime] = None
    razorpay_subscription_id: Optional[str] = None
    plan: PlanOut

    model_config = {"from_attributes": True}

class CheckoutRequest(BaseModel):
    plan_id: int

class CheckoutResponse(BaseModel):
    subscription_id: str
    key_id: str
