from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    mfa_code: str | None = None
    backup_code: str | None = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class MfaRequiredResponse(BaseModel):
    mfa_required: bool = True
    detail: str = "MFA code required"

class RefreshRequest(BaseModel):
    refresh_token: str

class UserOut(BaseModel):
    id: int
    email: str
    mfa_enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}
