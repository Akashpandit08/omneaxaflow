import hmac
import hashlib
import razorpay
from typing import Optional, Dict, Any

from app.core.config import settings

def get_razorpay_client() -> razorpay.Client:
    """Initialize and return the Razorpay client."""
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    return client

def create_customer(name: str, email: str) -> str:
    """Create a Razorpay customer and return the customer ID."""
    client = get_razorpay_client()
    customer = client.customer.create({
        "name": name,
        "email": email
    })
    return customer["id"]

def create_subscription(customer_id: str, plan_id: str) -> Dict[str, Any]:
    """Create a Razorpay subscription and return the details."""
    client = get_razorpay_client()
    subscription = client.subscription.create({
        "plan_id": plan_id,
        "customer_id": customer_id,
        "total_count": 12, # E.g., 12 months/billing cycles
        "customer_notify": 1
    })
    return subscription

def cancel_subscription(subscription_id: str, cancel_at_cycle_end: bool = False) -> Dict[str, Any]:
    """Cancel a Razorpay subscription."""
    client = get_razorpay_client()
    return client.subscription.cancel(subscription_id, {"cancel_at_cycle_end": 1 if cancel_at_cycle_end else 0})

def verify_webhook_signature(payload_body: str, signature: str) -> bool:
    """Verify the Razorpay webhook signature."""
    secret = settings.RAZORPAY_WEBHOOK_SECRET
    expected_signature = hmac.new(
        bytes(secret, 'utf-8'),
        msg=bytes(payload_body, 'utf-8'),
        digestmod=hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_signature, signature)
