from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.video import VideoStatus


class RenderRequest(BaseModel):
    project_id: int


class VideoOut(BaseModel):
    id: int
    project_id: int
    project_title: Optional[str] = None
    task_id: Optional[str] = None
    status: VideoStatus
    progress_percent: int
    audio_s3_key: Optional[str] = None
    video_s3_key: Optional[str] = None
    duration_seconds: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VideoStatusOut(BaseModel):
    video_id: int
    status: VideoStatus
    progress_percent: int
    error_message: Optional[str] = None


class VideoDownloadOut(BaseModel):
    download_url: str
    expires_in: int  # seconds


class VideoListOut(BaseModel):
    items: list[VideoOut]
    total: int
    page: int
    page_size: int
