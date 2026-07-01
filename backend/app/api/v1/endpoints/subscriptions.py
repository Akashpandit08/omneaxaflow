from datetime import datetime, UTC
import json
import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request, Header, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import CurrentUser, DBSession
from app.models.subscription import Subscription
from app.models.plan import Plan
from app.models.billing_history import BillingHistory
from app.schemas.subscription import SubscriptionOut, PlanOut, BillingHistoryOut, CheckoutRequest, CheckoutResponse
from app.services.billing import create_cashfree_order, get_cashfree_order, verify_cashfree_webhook_signature

router = APIRouter()

from fastapi_cache.decorator import cache

@router.get("/plans", response_model=List[PlanOut])
@cache(expire=86400) # Cache plans for 24 hours
async def list_plans(db: DBSession):
    result = await db.execute(select(Plan).order_by(Plan.price_cents))
    return result.scalars().all()


@router.get("/me", response_model=SubscriptionOut)
async def get_my_subscription(current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Subscription)
        .options(selectinload(Subscription.plan))
        .where(Subscription.user_id == current_user.id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found")
    return sub


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(body: CheckoutRequest, current_user: CurrentUser, db: DBSession):
    plan_result = await db.execute(select(Plan).where(Plan.id == body.plan_id))
    plan = plan_result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan.price_cents == 0:
        raise HTTPException(status_code=400, detail="Free plan cannot be checked out")

    sub_result = await db.execute(select(Subscription).where(Subscription.user_id == current_user.id))
    sub = sub_result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription record missing")
    
    order_id = f"order_{current_user.id}_{int(datetime.now(UTC).timestamp())}_{uuid.uuid4().hex[:4]}"
    
    try:
        cf_order = create_cashfree_order(
            order_id=order_id,
            amount_cents=plan.price_cents,
            customer_id=str(current_user.id),
            customer_email=current_user.email
        )
        
        # Track order state
        sub.cashfree_order_id = order_id
        # Also temporary map plan checkout interest
        sub.plan_id = plan.id
        await db.commit()
        
        return CheckoutResponse(
            payment_session_id=cf_order["payment_session_id"],
            order_id=order_id,
            cf_env=settings.CASHFREE_ENV
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Cashfree checkout order: {str(e)}")


@router.post("/verify-order", response_model=SubscriptionOut)
async def verify_order(order_id: str, current_user: CurrentUser, db: DBSession):
    # Verify order status directly from Cashfree API
    try:
        cf_order = get_cashfree_order(order_id)
        if cf_order.get("order_status") == "PAID":
            # Find local subscription
            result = await db.execute(select(Subscription).options(selectinload(Subscription.plan)).where(Subscription.cashfree_order_id == order_id))
            sub = result.scalar_one_or_none()
            if sub:
                sub.status = "active"
                sub.videos_used_this_period = 0
                
                # Check for existing billing history to prevent duplicates
                existing_hist = await db.execute(select(BillingHistory).where(BillingHistory.cashfree_payment_id == order_id))
                if not existing_hist.scalar_one_or_none():
                    # Create billing history log
                    amount_inr = cf_order.get("order_amount", 0)
                    history = BillingHistory(
                        subscription_id=sub.id,
                        amount_cents=int(amount_inr * 100),
                        status="paid",
                        date=datetime.now(UTC),
                        cashfree_payment_id=order_id
                    )
                    db.add(history)
                    await db.commit()
                    await db.refresh(sub)
                return sub
            raise HTTPException(status_code=404, detail="Subscription trace not found")
        else:
            raise HTTPException(status_code=400, detail=f"Order is not paid. Status: {cf_order.get('order_status')}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.get("/history", response_model=List[BillingHistoryOut])
async def get_billing_history(current_user: CurrentUser, db: DBSession):
    sub_result = await db.execute(select(Subscription).where(Subscription.user_id == current_user.id))
    sub = sub_result.scalar_one_or_none()
    if not sub:
        return []
        
    hist_result = await db.execute(
        select(BillingHistory)
        .where(BillingHistory.subscription_id == sub.id)
        .order_by(BillingHistory.date.desc())
    )
    return hist_result.scalars().all()


@router.post("/webhook")
async def cashfree_webhook(
    request: Request, 
    db: DBSession,
    x_webhook_signature: str = Header(None),
    x_webhook_timestamp: str = Header(None)
):
    if not x_webhook_signature or not x_webhook_timestamp:
        raise HTTPException(status_code=400, detail="Missing webhook headers")
        
    payload_body = await request.body()
    payload_str = payload_body.decode('utf-8')
    
    is_valid = verify_cashfree_webhook_signature(payload_str, x_webhook_signature, x_webhook_timestamp)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid signature")
        
    try:
        payload = json.loads(payload_str)
        data = payload.get("data", {})
        order = data.get("order", {})
        order_id = order.get("order_id")
        payment = data.get("payment", {})
        payment_status = payment.get("payment_status")
        
        if payment_status == "SUCCESS":
            result = await db.execute(select(Subscription).where(Subscription.cashfree_order_id == order_id))
            sub = result.scalar_one_or_none()
            if sub:
                sub.status = "active"
                sub.videos_used_this_period = 0
                
                existing_hist = await db.execute(select(BillingHistory).where(BillingHistory.cashfree_payment_id == order_id))
                if not existing_hist.scalar_one_or_none():
                    amount = order.get("order_amount", 0)
                    history = BillingHistory(
                        subscription_id=sub.id,
                        amount_cents=int(amount * 100),
                        status="paid",
                        date=datetime.now(UTC),
                        cashfree_payment_id=order_id
                    )
                    db.add(history)
                    await db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"status": "ok"}
