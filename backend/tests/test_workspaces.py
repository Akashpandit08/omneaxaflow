import pytest

# Testing workspaces endpoints
# Note: E2E tests are preferred in this case. Let's write some mock dependencies or unit tests.

# For now, let's test `RequireRole` logic in deps.py to ensure isolation.
from app.core.deps import RequireRole
from fastapi import HTTPException

@pytest.mark.asyncio
async def test_require_role():
    checker = RequireRole(["owner", "admin"])
    
    # Valid role
    class MockRequestValid:
        state = type('State', (), {'workspace_role': 'owner'})()
    
    res = await checker.dependency(request=MockRequestValid(), workspace=None)
    assert res == 'owner'
    
    # Invalid role
    class MockRequestInvalid:
        state = type('State', (), {'workspace_role': 'viewer'})()
    
    with pytest.raises(HTTPException) as exc:
        await checker.dependency(request=MockRequestInvalid(), workspace=None)
    assert exc.value.status_code == 403
    
    # Missing role
    class MockRequestMissing:
        state = type('State', (), {})()
        
    with pytest.raises(HTTPException) as exc:
        await checker.dependency(request=MockRequestMissing(), workspace=None)
    assert exc.value.status_code == 403
