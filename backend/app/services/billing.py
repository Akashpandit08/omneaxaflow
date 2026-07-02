import hmac
import hashlib
import httpx
from typing import Dict, Any

from app.core.config import settings

def get_cashfree_headers() -> Dict[str, str]:
    return {
        "x-client-id": settings.CASHFREE_APP_ID,
        "x-client-secret": settings.CASHFREE_SECRET_KEY,
        "x-api-version": settings.CASHFREE_API_VERSION,
        "Content-Type": "application/json"
    }

def get_cashfree_base_url() -> str:
    if settings.CASHFREE_ENV == "production":
        return "https://api.cashfree.com/pg"
    return "https://sandbox.cashfree.com/pg"

def create_cashfree_order(
    order_id: str,
    amount_cents: int,
    customer_id: str,
    customer_email: str,
    customer_phone: str = "9999999999"
) -> Dict[str, Any]:
    """Create a Cashfree payment order and return the details."""
    url = f"{get_cashfree_base_url()}/orders"
    headers = get_cashfree_headers()
    
    amount_inr = round(amount_cents / 100.0, 2)
    
    payload = {
        "order_id": order_id,
        "order_amount": amount_inr,
        "order_currency": "INR",
        "customer_details": {
            "customer_id": customer_id,
            "customer_email": customer_email,
            "customer_phone": customer_phone
        },
        "order_meta": {
            "return_url": f"{settings.NEXT_PUBLIC_API_URL.replace('8000', '3000')}/billing?order_id={order_id}"
        }
    }
    
    with httpx.Client() as client:
        response = client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()

def get_cashfree_order(order_id: str) -> Dict[str, Any]:
    """Fetch order details from Cashfree."""
    url = f"{get_cashfree_base_url()}/orders/{order_id}"
    headers = get_cashfree_headers()
    
    with httpx.Client() as client:
        response = client.get(url, headers=headers)
        response.raise_for_status()
        return response.json()

def verify_cashfree_webhook_signature(
    payload_body: str,
    signature: str,
    timestamp: str
) -> bool:
    """Verify the Cashfree webhook signature."""
    if not settings.CASHFREE_WEBHOOK_SECRET:
        return True # Fallback for development if secret not set
        
    signature_data = timestamp + payload_body
    computed_signature = hmac.new(
        settings.CASHFREE_WEBHOOK_SECRET.encode("utf-8"),
        signature_data.encode("utf-8"),
        hashlib.sha256
    ).digest()
    
    import base64
    encoded_signature = base64.b64encode(computed_signature).decode("utf-8")
    return hmac.compare_digest(encoded_signature, signature)
