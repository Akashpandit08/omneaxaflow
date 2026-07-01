import pytest
from app.services.analytics import track_event, track_event_sync
from app.models.analytics import AnalyticsEvent, WorkspaceAnalyticsDaily
from unittest.mock import AsyncMock, MagicMock

@pytest.mark.asyncio
async def test_track_event():
    db_mock = AsyncMock()
    
    # Mock for daily rollup
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    db_mock.execute.return_value = result_mock
    
    await track_event(db=db_mock, workspace_id=1, event_type="render.started")
    
    # Assert add was called for event and daily
    assert db_mock.add.call_count == 2
    assert db_mock.commit.call_count == 1
