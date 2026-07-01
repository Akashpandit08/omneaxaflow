from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.models.content import ImportJobStatus, TranslationStatus


# --- Brand Glossary Schemas ---
class BrandGlossaryCreate(BaseModel):
    term: str = Field(..., min_length=1, max_length=255)
    replacement: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class BrandGlossaryUpdate(BaseModel):
    term: Optional[str] = Field(None, min_length=1, max_length=255)
    replacement: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class BrandGlossaryOut(BaseModel):
    id: int
    workspace_id: int
    term: str
    replacement: str
    description: Optional[str]
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BrandGlossaryListOut(BaseModel):
    items: List[BrandGlossaryOut]
    total: int
    page: int
    page_size: int


# --- Import Job Schemas ---
# For upload we might use Form data or a separate schema, but let's have basic outs
class ImportJobOut(BaseModel):
    id: int
    workspace_id: int
    user_id: int
    project_id: Optional[int]
    file_name: str
    file_type: str
    file_url: str
    status: ImportJobStatus
    parsed_content: Optional[Any]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ImportJobListOut(BaseModel):
    items: List[ImportJobOut]
    total: int
    page: int
    page_size: int


# --- Video Translation Schemas ---
class TranslationCreate(BaseModel):
    target_language: str = Field(..., min_length=2, max_length=50)
    voice_id: Optional[int] = None


class TranslationOut(BaseModel):
    id: int
    video_id: int
    workspace_id: int
    source_language: str
    target_language: str
    translated_script: Optional[str]
    voice_id: Optional[int]
    status: TranslationStatus
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TranslationListOut(BaseModel):
    items: List[TranslationOut]
    total: int
    page: int
    page_size: int
