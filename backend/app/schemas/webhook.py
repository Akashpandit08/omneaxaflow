from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

ALLOWED_EVENTS = {"video.completed", "video.failed"}


class WebhookCreate(BaseModel):
    url: str
    event_types: list[str]
    is_active: bool = True

    @field_validator("event_types")
    @classmethod
    def validate_events(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("event_types cannot be empty")
        if len(v) != len(set(v)):
            raise ValueError("duplicate event types are not allowed")
        for event in v:
            if event not in ALLOWED_EVENTS:
                raise ValueError(f"unknown event type: {event}")
        return v


class WebhookUpdate(BaseModel):
    url: str | None = None
    event_types: list[str] | None = None
    is_active: bool | None = None

    @field_validator("event_types")
    @classmethod
    def validate_events(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        if not v:
            raise ValueError("event_types cannot be empty")
        if len(v) != len(set(v)):
            raise ValueError("duplicate event types are not allowed")
        for event in v:
            if event not in ALLOWED_EVENTS:
                raise ValueError(f"unknown event type: {event}")
        return v


class WebhookOut(BaseModel):
    id: int
    url: str
    event_types: list[str]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WebhookCreateOut(WebhookOut):
    secret: str


class WebhookRotateSecretOut(WebhookOut):
    secret: str
