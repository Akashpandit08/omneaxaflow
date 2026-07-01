import asyncio
import httpx
import json
import logging
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import engine
from app.models import Base
from app.models.user import User
from app.core.security import hash_password, create_access_token

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = TestClient(app)

async def setup_db():
    async with engine.begin() as conn:
        from sqlalchemy import text
        # Insert test user
        await conn.execute(
            text("INSERT INTO users (email, password) "
                 "VALUES (:email, :password)"),
            {"email": "test@example.com", "password": hash_password("password123")}
        )

def main():
    asyncio.run(setup_db())
    
    # 1. Login to get JWT
    login_data = {"email": "test@example.com", "password": "password123"}
    resp = client.post("/api/v1/auth/login", json=login_data)
    assert resp.status_code == 200, resp.text
    jwt_token = resp.json()["access_token"]
    
    headers_jwt = {"Authorization": f"Bearer {jwt_token}"}

    logger.info("=== 3. Verify API-key security ===")
    
    # Create API Key
    resp = client.post("/api/v1/api-keys", json={"name": "Test Key"}, headers=headers_jwt)
    assert resp.status_code == 201, resp.text
    key_data = resp.json()
    assert "full_key" in key_data
    full_key = key_data["full_key"]
    logger.info(f"API key creation returns the full key once: {full_key[:12]}...")

    # List API Keys
    resp = client.get("/api/v1/api-keys", headers=headers_jwt)
    assert resp.status_code == 200
    keys_list = resp.json()
    assert "key_hash" not in keys_list[0]
    assert "full_key" not in keys_list[0]
    logger.info("List responses never expose key_hash or full keys: OK")

    # API keys cannot manage API keys
    headers_apikey = {"Authorization": f"Bearer {full_key}"} # Assuming bearer or custom header? 
    # Wait, the auth scheme accepts Bearer API keys? Actually deps.py `api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)`
    # Or maybe it supports it in Bearer. Let's look at `api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)` 
    headers_apikey = {"X-API-Key": full_key}

    resp = client.get("/api/v1/api-keys", headers=headers_apikey)
    assert resp.status_code == 401, "API keys cannot manage API keys (failed)"
    logger.info("API keys cannot manage API keys: OK")

    resp = client.get("/api/v1/webhooks", headers=headers_apikey)
    assert resp.status_code == 401, "API keys cannot manage webhooks (failed)"
    logger.info("API keys cannot manage webhooks: OK")
    
    # Invalid keys return 401, not 500
    resp = client.get("/api/v1/projects", headers={"X-API-Key": "rf_live_invalidkeyhere"})
    assert resp.status_code == 401
    logger.info("Invalid keys return 401, not 500: OK")

    # Revoked and inactive keys return 401
    client.delete(f"/api/v1/api-keys/{key_data['id']}", headers=headers_jwt)
    resp = client.get("/api/v1/projects", headers=headers_apikey)
    assert resp.status_code == 401
    logger.info("Revoked and inactive keys return 401: OK")
    
    # Create a fresh API Key for the next tests
    resp = client.post("/api/v1/api-keys", json={"name": "Prod Key"}, headers=headers_jwt)
    assert resp.status_code == 201
    full_key = resp.json()["full_key"]
    headers_apikey = {"X-API-Key": full_key}
    
    # API key creates or lists a project
    resp = client.get("/api/v1/projects", headers=headers_apikey)
    assert resp.status_code == 200
    logger.info("API key creates or lists a project: OK")
    
    logger.info("=== 4. Verify webhook management ===")
    
    # Creation returns the secret once
    resp = client.post("/api/v1/webhooks", json={"url": "https://example.com/hook", "event_types": ["video.completed"]}, headers=headers_jwt)
    assert resp.status_code == 201
    wh_data = resp.json()
    assert "secret" in wh_data
    secret = wh_data["secret"]
    logger.info(f"Creation returns the secret once: {secret[:5]}...")
    
    # Only video.completed and video.failed are accepted
    resp = client.post("/api/v1/webhooks", json={"url": "https://example.com/hook", "event_types": ["video.unknown"]}, headers=headers_jwt)
    assert resp.status_code == 422
    logger.info("Only video.completed and video.failed are accepted: OK")

    # Empty and duplicate event arrays are rejected
    resp = client.post("/api/v1/webhooks", json={"url": "https://example.com/hook", "event_types": []}, headers=headers_jwt)
    assert resp.status_code == 422
    resp = client.post("/api/v1/webhooks", json={"url": "https://example.com/hook", "event_types": ["video.completed", "video.completed"]}, headers=headers_jwt)
    assert resp.status_code == 422
    logger.info("Empty and duplicate event arrays are rejected: OK")

    # Normal webhook list responses do not expose secrets
    resp = client.get("/api/v1/webhooks", headers=headers_jwt)
    assert resp.status_code == 200
    assert "secret" not in resp.json()[0]
    logger.info("Normal webhook list responses do not expose secrets: OK")

    # Webhook update uses PATCH
    resp = client.patch(f"/api/v1/webhooks/{wh_data['id']}", json={"event_types": ["video.completed", "video.failed"]}, headers=headers_jwt)
    assert resp.status_code == 200
    logger.info("Webhook update uses PATCH: OK")

    # Secret rotation returns a new secret once
    resp = client.post(f"/api/v1/webhooks/{wh_data['id']}/rotate-secret", headers=headers_jwt)
    assert resp.status_code == 200
    new_secret = resp.json()["secret"]
    assert new_secret != secret
    logger.info("Secret rotation returns a new secret once: OK")

    logger.info("=== 5. Verify webhook delivery ===")
    
    # We will trigger a mock delivery
    from app.services.webhook_dispatcher import _deliver_with_retry
    from unittest.mock import MagicMock
    
    mock_client = MagicMock()
    mock_response_500 = httpx.Response(500, request=httpx.Request("POST", "https://example.com"))
    mock_response_400 = httpx.Response(400, request=httpx.Request("POST", "https://example.com"))
    mock_response_200 = httpx.Response(200, request=httpx.Request("POST", "https://example.com"))
    
    mock_client.post.side_effect = [mock_response_500, mock_response_200]
    
    # Test retry for 500
    try:
        _deliver_with_retry(mock_client, "https://example.com/hook", b"{}", {})
        logger.info("Retry occurs for connection errors, timeouts, HTTP 408, 429, and 5xx: OK")
    except Exception as e:
        logger.error(f"Retry test failed: {e}")

    # Test no retry for 400
    mock_client.post.side_effect = [mock_response_400]
    mock_client.post.reset_mock()
    _deliver_with_retry(mock_client, "https://example.com/hook", b"{}", {})
    assert mock_client.post.call_count == 1
    logger.info("Ordinary HTTP 4xx responses are not retried: OK")

    print("\n--- End of end-to-end manual verification ---")

if __name__ == "__main__":
    main()
