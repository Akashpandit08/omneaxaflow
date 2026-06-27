from datetime import datetime, UTC
import json
from typing import List

from fastapi import APIRouter, HTTPException, Request, Header, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import CurrentUser, DBSession
from app.models.subscription import Subscription
from app.models.plan import Plan
from app.models.billing_history import BillingHistory
from app.schemas.subscription import SubscriptionOut, PlanOut, BillingHistoryOut, CheckoutRequest, CheckoutResponse
from app.services.billing import create_subscription, verify_webhook_signature

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
        # Default fallback logic or raise error
        raise HTTPException(status_code=404, detail="No subscription found")
    return sub


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(body: CheckoutRequest, current_user: CurrentUser, db: DBSession):
    # Fetch Plan
    plan_result = await db.execute(select(Plan).where(Plan.id == body.plan_id))
    plan = plan_result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if not plan.razorpay_plan_id:
        raise HTTPException(status_code=400, detail="This plan cannot be purchased via Razorpay")

    # Fetch User's current sub
    sub_result = await db.execute(select(Subscription).where(Subscription.user_id == current_user.id))
    sub = sub_result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription record missing")
    
    # We ideally create a customer if they don't have one, but for this demo, 
    # we assume razorpay_customer_id is either there or we need to generate it
    # We will just assume create_subscription doesn't explicitly need customer_id if we rely on checkout links,
    # OR we use the service to create a customer.
    from app.services.billing import create_customer
    if not sub.razorpay_customer_id:
        try:
            customer_id = create_customer(current_user.full_name, current_user.email)
            sub.razorpay_customer_id = customer_id
            await db.commit()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    try:
        rp_sub = create_subscription(sub.razorpay_customer_id, plan.razorpay_plan_id)
        return CheckoutResponse(
            subscription_id=rp_sub["id"],
            key_id=settings.RAZORPAY_KEY_ID
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Razorpay subscription: {str(e)}")


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
async def razorpay_webhook(
    request: Request, 
    db: DBSession,
    x_razorpay_signature: str = Header(None)
):
    if not x_razorpay_signature:
        raise HTTPException(status_code=400, detail="Missing signature")
        
    payload_body = await request.body()
    try:
        is_valid = verify_webhook_signature(payload_body.decode('utf-8'), x_razorpay_signature)
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception:
        raise HTTPException(status_code=400, detail="Signature verification failed")
        
    payload = json.loads(payload_body)
    event = payload.get("event")
    
    if event in ["subscription.charged", "subscription.authenticated"]:
        sub_entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
        sub_id = sub_entity.get("id")
        plan_id_str = sub_entity.get("plan_id")
        
        # Find local subscription by razorpay_subscription_id
        result = await db.execute(select(Subscription).where(Subscription.razorpay_subscription_id == sub_id))
        sub = result.scalar_one_or_none()
        
        if not sub:
            # Maybe it's a new subscription that we didn't track yet
            pass
        else:
            sub.status = "active"
            sub.videos_used_this_period = 0
            # update expiry
            current_end = sub_entity.get("current_end")
            if current_end:
                sub.current_period_end = datetime.fromtimestamp(current_end, UTC)
            
            # create billing history record
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            amount = payment_entity.get("amount", 0)
            payment_id = payment_entity.get("id")
            
            history = BillingHistory(
                subscription_id=sub.id,
                amount_cents=amount,
                status="paid",
                date=datetime.now(UTC),
                razorpay_payment_id=payment_id
            )
            db.add(history)
            await db.commit()
            
    elif event in ["subscription.cancelled", "subscription.halted"]:
        sub_entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
        sub_id = sub_entity.get("id")
        
        result = await db.execute(select(Subscription).where(Subscription.razorpay_subscription_id == sub_id))
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = "canceled" if event == "subscription.cancelled" else "past_due"
            await db.commit()
            
    return {"status": "ok"}
