from typing import List, Optional

from pydantic import BaseModel


class VoiceOut(BaseModel):
    id: int
    name: str
    provider: str
    language: str
    accent: Optional[str]
    gender: Optional[str]
    is_premium: bool

    model_config = {"from_attributes": True}


class VoiceListOut(BaseModel):
    items: List[VoiceOut]
    total: int


class VoicePreviewRequest(BaseModel):
    voice_id: int
    text: str


class VoicePreviewOut(BaseModel):
    audio_url: str
