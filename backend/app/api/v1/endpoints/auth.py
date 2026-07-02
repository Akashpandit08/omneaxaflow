"""
Authentication endpoints: register, login, refresh, logout, MFA.
"""

import base64
import io
import secrets

import pyotp
import qrcode
from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DBSession
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.subscription import Subscription
from app.models.user import User
from app.models.plan import Plan, PlanTier
from app.schemas.auth import (
    LoginRequest,
    MfaRequiredResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from app.schemas.collaboration import BackupCodesOut, MfaSetupOut, MfaVerifyRequest
from app.services.audit import write_audit_log

router = APIRouter()


def _issue_tokens(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


def _generate_backup_codes() -> tuple[list[str], list[str]]:
    raw_codes = [secrets.token_hex(4).upper() for _ in range(10)]
    return raw_codes, [hash_password(code) for code in raw_codes]


def _verify_backup_code(user: User, code: str | None) -> bool:
    if not code or not user.backup_codes:
        return False
    normalized = code.strip().upper()
    for stored in user.backup_codes:
        if verify_password(normalized, stored):
            user.backup_codes = [item for item in user.backup_codes if item != stored]
            return True
    return False


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: DBSession):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        password=hash_password(body.password),
    )
    db.add(user)
    await db.flush()

    free_plan_result = await db.execute(select(Plan).where(Plan.tier == PlanTier.FREE))
    free_plan = free_plan_result.scalar_one_or_none()
    if not free_plan:
        free_plan = Plan(
            name="Free",
            tier=PlanTier.FREE,
            monthly_video_limit=5,
            max_video_duration_seconds=60,
            storage_gb=1,
            price_cents=0,
        )
        db.add(free_plan)
        await db.flush()

    sub = Subscription(user_id=user.id, plan_id=free_plan.id)
    db.add(sub)

    await db.commit()
    await db.refresh(user)

    return _issue_tokens(user)


@router.post("/login", response_model=TokenResponse | MfaRequiredResponse)
async def login(body: LoginRequest, request: Request, db: DBSession):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.mfa_enabled:
        totp_valid = bool(
            body.mfa_code
            and user.mfa_secret
            and pyotp.TOTP(user.mfa_secret).verify(body.mfa_code, valid_window=1)
        )
        backup_valid = _verify_backup_code(user, body.backup_code)
        if not totp_valid and not backup_valid:
            return MfaRequiredResponse()
        await db.commit()

    await write_audit_log(
        db,
        "LOGIN",
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
        commit=True,
    )
    return _issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: DBSession):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return _issue_tokens(user)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: CurrentUser):
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user: CurrentUser, request: Request, db: DBSession):
    await write_audit_log(
        db,
        "LOGOUT",
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        commit=True,
    )
    return


@router.post("/mfa/setup", response_model=MfaSetupOut)
async def setup_mfa(current_user: CurrentUser, db: DBSession):
    secret = pyotp.random_base32()
    current_user.mfa_secret = secret
    await db.commit()

    otp_uri = pyotp.TOTP(secret).provisioning_uri(name=current_user.email, issuer_name="AiVideo")
    image = qrcode.make(otp_uri)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    qr_image = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")
    return MfaSetupOut(secret=secret, otp_uri=otp_uri, qr_image=qr_image)


@router.post("/mfa/verify", response_model=BackupCodesOut)
async def verify_mfa(body: MfaVerifyRequest, request: Request, current_user: CurrentUser, db: DBSession):
    if not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA setup has not been started")
    if not pyotp.TOTP(current_user.mfa_secret).verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid MFA code")

    raw_codes, hashed_codes = _generate_backup_codes()
    current_user.mfa_enabled = True
    current_user.backup_codes = hashed_codes
    await write_audit_log(
        db,
        "ENABLE_MFA",
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return BackupCodesOut(backup_codes=raw_codes)


@router.post("/mfa/disable", status_code=status.HTTP_204_NO_CONTENT)
async def disable_mfa(body: MfaVerifyRequest, request: Request, current_user: CurrentUser, db: DBSession):
    if not current_user.mfa_enabled or not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA is not enabled")
    if not pyotp.TOTP(current_user.mfa_secret).verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid MFA code")

    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    current_user.backup_codes = None
    await write_audit_log(
        db,
        "DISABLE_MFA",
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()


@router.post("/mfa/backup-codes", response_model=BackupCodesOut)
async def regenerate_backup_codes(body: MfaVerifyRequest, current_user: CurrentUser, db: DBSession):
    if not current_user.mfa_enabled or not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA is not enabled")
    if not pyotp.TOTP(current_user.mfa_secret).verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid MFA code")

    raw_codes, hashed_codes = _generate_backup_codes()
    current_user.backup_codes = hashed_codes
    await db.commit()
    return BackupCodesOut(backup_codes=raw_codes)
