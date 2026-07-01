import pytest
from app.services.webhook_dispatcher import is_secure_url
from app.schemas.webhook import WebhookCreate
from pydantic import ValidationError

def test_webhook_url_validation():
    # Should be secure URLs
    assert is_secure_url("https://example.com/webhook") is True
    
    # Should reject HTTP
    assert is_secure_url("http://example.com/webhook") is False
    
    # Should reject private IPs
    assert is_secure_url("https://10.0.0.1/webhook") is False
    assert is_secure_url("https://192.168.1.1/webhook") is False
    assert is_secure_url("https://127.0.0.1/webhook") is False
    assert is_secure_url("https://localhost/webhook") is False
    assert is_secure_url("https://169.254.169.254/webhook") is False

def test_webhook_schema_events():
    # Valid
    WebhookCreate(url="https://example.com", event_types=["video.completed"])
    WebhookCreate(url="https://example.com", event_types=["video.completed", "video.failed"])

    # Invalid event
    with pytest.raises(ValidationError):
        WebhookCreate(url="https://example.com", event_types=["video.unknown"])

    # Empty events
    with pytest.raises(ValidationError):
        WebhookCreate(url="https://example.com", event_types=[])

    # Duplicate events
    with pytest.raises(ValidationError):
        WebhookCreate(url="https://example.com", event_types=["video.completed", "video.completed"])
