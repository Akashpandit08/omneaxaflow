import httpx
import hmac
import hashlib
from unittest.mock import MagicMock, patch
from app.services.webhook_dispatcher import _deliver_with_retry, dispatch_webhook_event
from app.models.webhook import Webhook

def test_signature_calculation():
    # We will just verify that _deliver_with_retry receives a properly signed header
    # by mocking _deliver_with_retry inside dispatch_webhook_event
    db_mock = MagicMock()
    webhook = Webhook(id=1, user_id=1, url="https://example.com/hook", secret="test_secret", event_types=["video.completed"], is_active=True)
    
    # Mock scalars().all() to return our webhook
    db_mock.execute.return_value.scalars.return_value.all.return_value = [webhook]
    
    with patch("app.services.webhook_dispatcher._deliver_with_retry") as mock_deliver:
        dispatch_webhook_event(db_mock, 1, "video.completed", {"status": "ok"})
        
        assert mock_deliver.called
        args, kwargs = mock_deliver.call_args
        client = args[0]
        url = args[1]
        content = args[2]
        headers = args[3]
        
        assert url == "https://example.com/hook"
        assert "X-OmneaxaFlow-Signature" in headers
        
        # Verify signature
        expected_sig = hmac.new(b"test_secret", content, hashlib.sha256).hexdigest()
        assert headers["X-OmneaxaFlow-Signature"] == f"sha256={expected_sig}"


def test_dispatcher_retry_logic():
    client = MagicMock(spec=httpx.Client)
    
    # Simulate a 500 error then 200 OK
    resp_500 = httpx.Response(500, request=httpx.Request("POST", "https://example.com"))
    resp_200 = httpx.Response(200, request=httpx.Request("POST", "https://example.com"))
    
    client.post.side_effect = [resp_500, resp_200]
    
    with patch("time.sleep") as mock_sleep:
        _deliver_with_retry(client, "https://example.com", b"{}", {})
        
        # Should have called post twice
        assert client.post.call_count == 2
        # Should have slept once for backoff
        assert mock_sleep.call_count == 1
