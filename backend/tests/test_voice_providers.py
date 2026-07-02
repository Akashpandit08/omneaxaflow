import pytest
from app.services.voice.providers.factory import VoiceProviderFactory
from app.services.voice.providers.elevenlabs_provider import ElevenLabsProvider
from app.services.voice.providers.xtts_provider import XTTSProvider
from app.services.voice.providers.openai_provider import OpenAIProvider

def test_elevenlabs_initialization():
    provider = VoiceProviderFactory.get("elevenlabs")
    assert isinstance(provider, ElevenLabsProvider)
    assert provider.provider_name == "elevenlabs"

def test_xtts_initialization():
    provider = VoiceProviderFactory.get("xtts")
    assert isinstance(provider, XTTSProvider)
    assert provider.provider_name == "xtts"

def test_openai_initialization():
    provider = VoiceProviderFactory.get("openai")
    assert isinstance(provider, OpenAIProvider)
    assert provider.provider_name == "openai"

def test_invalid_provider():
    with pytest.raises(ValueError, match="Unknown voice provider: invalid"):
        VoiceProviderFactory.get("invalid")
