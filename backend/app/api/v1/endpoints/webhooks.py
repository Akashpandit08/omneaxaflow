import secrets
from typing import List

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DBSession, CurrentWorkspace, RequireRole
from app.models.webhook import Webhook
from app.schemas.webhook import WebhookCreate, WebhookCreateOut, WebhookOut, WebhookUpdate, WebhookRotateSecretOut

router = APIRouter()


@router.post("", response_model=WebhookCreateOut, status_code=status.HTTP_201_CREATED, dependencies=[RequireRole(["owner", "admin"])])
async def create_webhook(body: WebhookCreate, current_user: CurrentUser, workspace: CurrentWorkspace, db: DBSession):
    secret = secrets.token_urlsafe(32)

    webhook = Webhook(
        user_id=current_user.id,
        workspace_id=workspace.id,
        url=body.url,
        secret=secret,
        event_types=body.event_types,
        is_active=body.is_active,
    )
    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)

    response = WebhookCreateOut.model_validate(webhook)
    response.secret = secret
    return response


@router.get("", response_model=List[WebhookOut], dependencies=[RequireRole(["owner", "admin"])])
async def list_webhooks(current_user: CurrentUser, workspace: CurrentWorkspace, db: DBSession):
    result = await db.execute(
        select(Webhook).where(Webhook.workspace_id == workspace.id).order_by(Webhook.created_at.desc())
    )
    return list(result.scalars().all())


@router.patch("/{webhook_id}", response_model=WebhookOut, dependencies=[RequireRole(["owner", "admin"])])
async def update_webhook(webhook_id: int, body: WebhookUpdate, current_user: CurrentUser, workspace: CurrentWorkspace, db: DBSession):
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.workspace_id == workspace.id)
    )
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(webhook, field, value)

    await db.commit()
    await db.refresh(webhook)
    return webhook


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[RequireRole(["owner", "admin"])])
async def delete_webhook(webhook_id: int, current_user: CurrentUser, workspace: CurrentWorkspace, db: DBSession):
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.workspace_id == workspace.id)
    )
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    await db.delete(webhook)
    await db.commit()


@router.post("/{webhook_id}/rotate-secret", response_model=WebhookRotateSecretOut, dependencies=[RequireRole(["owner", "admin"])])
async def rotate_webhook_secret(webhook_id: int, current_user: CurrentUser, workspace: CurrentWorkspace, db: DBSession):
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.workspace_id == workspace.id)
    )
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    new_secret = secrets.token_urlsafe(32)
    webhook.secret = new_secret
    await db.commit()
    await db.refresh(webhook)

    response = WebhookRotateSecretOut.model_validate(webhook)
    response.secret = new_secret
    return response
