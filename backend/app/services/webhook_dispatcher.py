import hashlib
import hmac
import ipaddress
import json
import logging
import socket
import uuid
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse

import httpx
from sqlalchemy import select

from app.core.config import settings
from app.models.webhook import Webhook

logger = logging.getLogger(__name__)


def is_secure_url(url: str) -> bool:
    parsed = urlparse(url)
    if not settings.ALLOW_INSECURE_WEBHOOK_URLS:
        if parsed.scheme != "https":
            return False
    if not parsed.hostname:
        return False
    if parsed.username or parsed.password:
        return False

    try:
        ip = ipaddress.ip_address(parsed.hostname)
        if ip.is_private or ip.is_loopback or ip.is_multicast or ip.is_link_local or ip.is_unspecified:
            return False
        # Cloud metadata service check
        if str(ip) == "169.254.169.254":
            return False
    except ValueError:
        # Not an IP address, resolve via DNS
        try:
            addr_info = socket.getaddrinfo(parsed.hostname, parsed.port or 443, socket.AF_UNSPEC, socket.SOCK_STREAM)
            for res in addr_info:
                ip_str = res[4][0]
                ip = ipaddress.ip_address(ip_str)
                if ip.is_private or ip.is_loopback or ip.is_multicast or ip.is_link_local or ip.is_unspecified:
                    return False
                if str(ip) == "169.254.169.254":
                    return False
        except socket.gaierror:
            # Unresolvable hostname
            return False

    return True


def dispatch_webhook_event(db, user_id: int, event_type: str, payload: dict) -> None:
    # Find all active webhooks for this user that subscribe to event_type
    stmt = select(Webhook).where(
        Webhook.user_id == user_id,
        Webhook.is_active == True,
    )
    webhooks = db.execute(stmt).scalars().all()
    
    # Filter by event_type (since event_types is JSON list)
    matching_webhooks = [w for w in webhooks if event_type in w.event_types]

    if not matching_webhooks:
        return

    # Create transport to disable retries natively, we will handle them manually with backoff
    transport = httpx.HTTPTransport(retries=0)
    
    with httpx.Client(transport=transport, timeout=httpx.Timeout(10.0)) as client:
        for webhook in matching_webhooks:
            try:
                if not is_secure_url(webhook.url):
                    logger.warning(f"Skipping webhook {webhook.id}: Insecure or private URL")
                    continue

                event_id = f"evt_{uuid.uuid4().hex}"
                body = {
                    "id": event_id,
                    "event": event_type,
                    "created_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
                    "data": payload,
                }
                raw_body = json.dumps(body, separators=(",", ":")).encode("utf-8")

                signature = hmac.new(
                    webhook.secret.encode("utf-8"),
                    raw_body,
                    hashlib.sha256,
                ).hexdigest()

                headers = {
                    "X-RenderFlow-Signature": f"sha256={signature}",
                    "X-RenderFlow-Event": event_type,
                    "X-RenderFlow-Delivery": event_id,
                    "Content-Type": "application/json",
                    "User-Agent": "RenderFlow-Webhooks/1.0",
                }

                _deliver_with_retry(client, webhook.url, raw_body, headers)
            except Exception as e:
                # Catch all errors for individual webhooks so one doesn't break the rest
                logger.error(f"Failed to deliver webhook {webhook.id}: {str(e)}")


def _deliver_with_retry(client: httpx.Client, url: str, content: bytes, headers: dict[str, str]):
    import time
    max_attempts = 3
    
    for attempt in range(max_attempts):
        try:
            response = client.post(url, content=content, headers=headers)
            
            if response.status_code in (408, 429) or response.status_code >= 500:
                # Retryable status codes
                if attempt < max_attempts - 1:
                    retry_after = response.headers.get("Retry-After")
                    if retry_after and retry_after.isdigit():
                        sleep_time = min(int(retry_after), 30) # cap at 30s
                    else:
                        sleep_time = 2 ** attempt
                    time.sleep(sleep_time)
                    continue
                else:
                    response.raise_for_status()
            elif 400 <= response.status_code < 500:
                # Non-retryable client error
                logger.warning(f"Webhook delivery failed with {response.status_code}")
                return
            else:
                # Success (2xx) or redirects (3xx handled by client.post if configured, but default is no redirect)
                # Webhook spec usually considers 2xx as success
                if 200 <= response.status_code < 300:
                    return
                
        except (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout) as e:
            if attempt < max_attempts - 1:
                time.sleep(2 ** attempt)
                continue
            raise e
