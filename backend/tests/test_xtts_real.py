import os
import sys
import tempfile
import pytest
from unittest.mock import patch, MagicMock

# Mock TTS.api and torch before importing xtts_provider
mock_tts_api = MagicMock()
mock_tts_class = MagicMock()
mock_tts_api.TTS = mock_tts_class
sys.modules['TTS'] = MagicMock()
sys.modules['TTS.api'] = mock_tts_api
sys.modules['torch'] = MagicMock()

from app.services.voice.providers.xtts_provider import XTTSProvider

@pytest.fixture
def mock_tts():
    mock_instance = mock_tts_class.return_value
    mock_instance.to.return_value = mock_instance
    
    # Simulate tts_to_file writing to a file
    def fake_tts_to_file(text, speaker_wav, language, file_path):
        with open(file_path, "w") as f:
            f.write("fake generated audio data")
            
    mock_instance.tts_to_file.side_effect = fake_tts_to_file
    yield mock_tts_class

@pytest.fixture
def mock_torch_cuda_available():
    with patch("app.services.voice.providers.xtts_provider.torch") as mock_torch:
        mock_torch.cuda.is_available.return_value = True
        yield mock_torch

@pytest.fixture
def mock_torch_cuda_unavailable():
    with patch("app.services.voice.providers.xtts_provider.torch") as mock_torch:
        mock_torch.cuda.is_available.return_value = False
        yield mock_torch

def test_xtts_gpu_mode(mock_tts, mock_torch_cuda_available):
    from app.services.voice.providers.xtts_provider import get_xtts_model
    get_xtts_model.cache_clear()
    provider = XTTSProvider()
    assert provider.device == "cuda"
    mock_tts.assert_called_once()
    mock_tts.reset_mock()

def test_xtts_cpu_mode(mock_tts, mock_torch_cuda_unavailable):
    from app.services.voice.providers.xtts_provider import get_xtts_model
    get_xtts_model.cache_clear()
    provider = XTTSProvider()
    assert provider.device == "cpu"
    mock_tts.assert_called_once()
    mock_tts.reset_mock()

def test_missing_reference_audio(mock_tts, mock_torch_cuda_unavailable):
    from app.services.voice.providers.xtts_provider import get_xtts_model
    get_xtts_model.cache_clear()
    provider = XTTSProvider()
    with pytest.raises(ValueError, match="Reference audio file not found"):
        provider.clone_voice("Test Voice", "/path/to/nonexistent/file.wav")

def test_generated_output_exists(mock_tts, mock_torch_cuda_unavailable):
    from app.services.voice.providers.xtts_provider import get_xtts_model
    get_xtts_model.cache_clear()
    provider = XTTSProvider()
    
    # Create a real temporary reference file
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(b"fake reference audio data")
        ref_path = f.name
        
    try:
        # Clone voice
        voice_id = provider.clone_voice("Test Voice", ref_path)
        assert voice_id == f"xtts_clone_{os.path.abspath(ref_path)}"
        
        # Generate TTS
        chunks = list(provider.text_to_speech(voice_id, "Hello world"))
        assert len(chunks) > 0
        assert b"fake generated audio data" in chunks[0]
        
    finally:
        if os.path.exists(ref_path):
            os.remove(ref_path)

def test_invalid_audio_id_format(mock_tts, mock_torch_cuda_unavailable):
    from app.services.voice.providers.xtts_provider import get_xtts_model
    get_xtts_model.cache_clear()
    provider = XTTSProvider()
    with pytest.raises(ValueError, match="Invalid XTTS voice ID format"):
        list(provider.text_to_speech("invalid_format_id", "Hello"))
