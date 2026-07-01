from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Any
from datetime import datetime

# Voice Clone Schemas
class VoiceCloneBase(BaseModel):
    name: str
    provider: str

class VoiceCloneCreate(VoiceCloneBase):
    pass

class VoiceCloneUpdate(BaseModel):
    status: Optional[str] = None
    provider_voice_id: Optional[str] = None
    preview_url: Optional[str] = None

class VoiceCloneOut(VoiceCloneBase):
    id: int
    workspace_id: int
    user_id: int
    provider_voice_id: Optional[str] = None
    sample_audio_url: str
    preview_url: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Quiz Schemas
class QuizQuestionBase(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    timestamp_seconds: float
    points: int = 1

class QuizQuestionCreate(QuizQuestionBase):
    pass

class QuizQuestionOut(QuizQuestionBase):
    id: int
    quiz_id: int

    class Config:
        orm_mode = True

class QuizBase(BaseModel):
    title: str

class QuizCreate(QuizBase):
    questions: List[QuizQuestionCreate]

class QuizOut(QuizBase):
    id: int
    video_id: int
    workspace_id: int
    created_by: Optional[int] = None
    created_at: datetime
    questions: List[QuizQuestionOut] = []

    class Config:
        orm_mode = True

# SCORM Schemas
class SCORMPackageBase(BaseModel):
    package_version: str

class SCORMPackageCreate(SCORMPackageBase):
    pass

class SCORMPackageOut(SCORMPackageBase):
    id: int
    video_id: int
    workspace_id: int
    manifest_url: Optional[str] = None
    zip_url: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
