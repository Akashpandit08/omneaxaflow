import pytest
import os
from unittest.mock import MagicMock, patch
from app.services.voice_service import VoiceService

@pytest.fixture
def mock_settings():
    with patch("app.services.voice_service.settings") as mock:
        mock.ELEVENLABS_API_KEY = "test_key"
        mock.AWS_ACCESS_KEY_ID = "test_aws_key"
        mock.AWS_SECRET_ACCESS_KEY = "test_aws_secret"
        mock.AWS_REGION = "us-east-1"
        mock.S3_BUCKET_NAME = "test_bucket"
        yield mock

def test_train_voice_clone_exists(mock_settings):
    service = VoiceService()
    
    # Mock client.clone
    service.elevenlabs_client = MagicMock()
    service.elevenlabs_client.clone.return_value = MagicMock(voice_id="12345")
    
    # Remove other methods
    del service.elevenlabs_client.voices
    
    voice_id = service.train_voice("test_voice", "/path/to/audio.mp3")
    assert voice_id == "12345"
    service.elevenlabs_client.clone.assert_called_once()

def test_train_voice_voices_clone_exists(mock_settings):
    service = VoiceService()
    
    # Mock client.voices.clone
    service.elevenlabs_client = MagicMock()
    del service.elevenlabs_client.clone
    service.elevenlabs_client.voices.clone.return_value = MagicMock(voice_id="67890")
    
    voice_id = service.train_voice("test_voice", "/path/to/audio.mp3")
    assert voice_id == "67890"
    service.elevenlabs_client.voices.clone.assert_called_once()

def test_train_voice_voices_add_exists(mock_settings):
    service = VoiceService()
    
    # Mock client.voices.add
    service.elevenlabs_client = MagicMock()
    del service.elevenlabs_client.clone
    del service.elevenlabs_client.voices.clone
    service.elevenlabs_client.voices.add.return_value = MagicMock(voice_id="abcde")
    
    voice_id = service.train_voice("test_voice", "/path/to/audio.mp3")
    assert voice_id == "abcde"
    service.elevenlabs_client.voices.add.assert_called_once()

def test_train_voice_no_method_exists(mock_settings):
    service = VoiceService()
    
    service.elevenlabs_client = MagicMock()
    del service.elevenlabs_client.clone
    del service.elevenlabs_client.voices.clone
    del service.elevenlabs_client.voices.add
    
    with pytest.raises(ValueError, match="Installed ElevenLabs SDK does not support voice cloning API"):
        service.train_voice("test_voice", "/path/to/audio.mp3")

@patch.dict(os.environ, {"ELEVENLABS_API_KEY": ""}, clear=True)
def test_train_voice_missing_api_key(mock_settings):
    mock_settings.ELEVENLABS_API_KEY = None
    service = VoiceService()
    with pytest.raises(RuntimeError, match="Missing ELEVENLABS_API_KEY"):
        service.train_voice("test_voice", "/path/to/audio.mp3")

def test_train_voice_exception_handling(mock_settings):
    service = VoiceService()
    
    service.elevenlabs_client = MagicMock()
    service.elevenlabs_client.clone.side_effect = Exception("API Server Down")
    
    with pytest.raises(ValueError, match="SDK version mismatch or API error: API Server Down"):
        service.train_voice("test_voice", "/path/to/audio.mp3")
