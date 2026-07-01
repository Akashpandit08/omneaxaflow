import pytest
from app.core.security import generate_api_key, verify_password, API_KEY_LOOKUP_PREFIX_LENGTH
from app.core.deps import get_current_user_any_auth
from fastapi import HTTPException
from unittest.mock import AsyncMock, MagicMock, patch

@pytest.mark.asyncio
async def test_api_key_generation():
    full_key, key_prefix, key_hash = generate_api_key()
    assert full_key.startswith("rf_live_")
    assert len(key_prefix) == API_KEY_LOOKUP_PREFIX_LENGTH
    assert key_prefix == full_key[:API_KEY_LOOKUP_PREFIX_LENGTH]
    assert verify_password(full_key, key_hash)

@pytest.mark.asyncio
async def test_api_key_auth_isolation():
    # Management endpoints (e.g. /api-keys, /webhooks) are protected by CurrentUser (JWT only).
    # Project/video endpoints use CurrentUserAnyAuth which allows API keys.
    db_mock = AsyncMock()
    
    class MockRequest:
        state = type('State', (), {'api_key_workspace_id': None})()

    request_mock = MockRequest()

    # Missing both token and API key
    with pytest.raises(HTTPException) as exc:
        await get_current_user_any_auth(request=request_mock, db=db_mock, token=None, api_key=None)
    assert exc.value.status_code == 401

    # Invalid API key
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    db_mock.execute.return_value = result_mock
    with pytest.raises(HTTPException) as exc:
        await get_current_user_any_auth(request=request_mock, db=db_mock, token=None, api_key="invalid_key")
    assert exc.value.status_code == 401

    # Valid API Key
    mock_api_key_record = MagicMock()
    mock_api_key_record.workspace_id = 1
    mock_api_key_record.key_hash = "mock_hash"
    mock_api_key_record.revoked_at = None
    mock_user = MagicMock()
    mock_api_key_record.user = mock_user
    
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = mock_api_key_record
    db_mock.execute.return_value = result_mock
    
    with patch("app.core.deps.verify_password", return_value=True):
        user = await get_current_user_any_auth(request=request_mock, db=db_mock, token=None, api_key="test-key")
        assert user == mock_user
        assert request_mock.state.api_key_workspace_id == 1
