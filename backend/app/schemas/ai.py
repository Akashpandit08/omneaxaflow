from typing import Optional
from pydantic import BaseModel, Field


class ScriptGenerateRequest(BaseModel):
    topic: str = Field(..., description="The main topic of the script")
    tone: str = Field(..., description="Tone of the script (e.g., professional, friendly, casual, sales)")
    length: str = Field(..., description="Length of the script (e.g., short, medium, long)")
    targetAudience: str = Field(..., description="The target audience for the script")


class ScriptRewriteRequest(BaseModel):
    script: str = Field(..., description="The existing script text to rewrite")
    tone: str = Field(..., description="The desired tone of the rewritten script")


class ScriptTranslateRequest(BaseModel):
    script: str = Field(..., description="The existing script text to translate")
    language: str = Field(..., description="The target language")


class AIResponse(BaseModel):
    success: bool
    script: Optional[str] = None
    message: Optional[str] = None
    code: Optional[str] = None
