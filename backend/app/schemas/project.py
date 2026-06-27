from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.models.project import ProjectStatus


class SceneItem(BaseModel):
    id: str
    text: str
    duration: Optional[int] = 5  # seconds
    transition: Optional[str] = "fade"


class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    script: Optional[str] = None
    scenes: Optional[List[SceneItem]] = None
    avatar_id: Optional[int] = None
    voice_id: Optional[int] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    script: Optional[str] = None
    scenes: Optional[List[SceneItem]] = None
    avatar_id: Optional[int] = None
    voice_id: Optional[int] = None


class ScriptPatch(BaseModel):
    """Lightweight body for PATCH /projects/{id}/script — auto-save hot path."""

    script: str


class ProjectOut(BaseModel):
    id: int
    owner_id: int
    title: str
    description: Optional[str]
    script: Optional[str]
    scenes: Optional[Any]
    avatar_id: Optional[int]
    voice_id: Optional[int]
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListOut(BaseModel):
    items: List[ProjectOut]
    total: int
    page: int
    page_size: int
