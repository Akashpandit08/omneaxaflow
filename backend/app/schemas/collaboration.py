from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


PermissionValue = Literal["view", "edit", "delete", "share"]
ResourceType = Literal["project", "video", "template", "comment"]


class CommentCreate(BaseModel):
    timestamp_seconds: int = Field(0, ge=0)
    content: str = Field(..., min_length=1, max_length=5000)


class CommentUpdate(BaseModel):
    timestamp_seconds: int | None = Field(None, ge=0)
    content: str | None = Field(None, min_length=1, max_length=5000)


class CommentOut(BaseModel):
    id: int
    video_id: int
    user_id: int
    workspace_id: int
    timestamp_seconds: int
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TemplateCreate(BaseModel):
    project_id: int
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    thumbnail_url: str | None = None
    is_shared: bool = False


class TemplateUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_shared: bool | None = None


class TemplateOut(BaseModel):
    id: int
    workspace_id: int
    creator_id: int
    name: str
    description: str | None
    project_snapshot_json: dict[str, Any]
    thumbnail_url: str | None
    is_shared: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TemplateListOut(BaseModel):
    items: list[TemplateOut]
    total: int
    page: int
    page_size: int


class PermissionCreate(BaseModel):
    resource_type: ResourceType
    resource_id: int
    user_id: int
    permission: PermissionValue


class PermissionOut(BaseModel):
    id: int
    resource_type: str
    resource_id: int
    user_id: int
    permission: str
    granted_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogOut(BaseModel):
    id: int
    workspace_id: int | None
    user_id: int | None
    action: str
    resource_type: str | None
    resource_id: int | None
    log_metadata: dict[str, Any] | None
    ip_address: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListOut(BaseModel):
    items: list[AuditLogOut]
    total: int
    page: int
    page_size: int


class MfaSetupOut(BaseModel):
    secret: str
    otp_uri: str
    qr_image: str


class MfaVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=32)


class MfaLoginRequest(BaseModel):
    email: str
    password: str
    code: str | None = None
    backup_code: str | None = None


class MfaRequiredOut(BaseModel):
    mfa_required: bool = True
    detail: str = "MFA code required"


class BackupCodesOut(BaseModel):
    backup_codes: list[str]
