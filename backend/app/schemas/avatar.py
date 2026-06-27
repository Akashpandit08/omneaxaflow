from typing import List, Optional

from pydantic import BaseModel


class AvatarOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None
    preview_video_url: Optional[str] = None
    gender: Optional[str] = None
    style: Optional[str] = None
    category: Optional[str] = None
    is_premium: bool
    is_active: bool

    model_config = {"from_attributes": True}


class AvatarListOut(BaseModel):
    items: List[AvatarOut]
    total: int
    page: int
    page_size: int
