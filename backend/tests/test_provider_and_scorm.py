import zipfile

import pytest

from app.services.ai.factory import AIProviderFactory
from app.services.ai.interfaces import ProviderError
from app.services.scorm_service import SCORMService
from app.services.voice_service import VoiceService


def test_ai_factory_rejects_mock_provider(monkeypatch):
    monkeypatch.setattr("app.services.ai.factory.settings.PRIMARY_PROVIDER", "mock")
    monkeypatch.setattr("app.services.ai.factory.settings.ENABLE_MOCK_SERVICES", False)

    with pytest.raises(ProviderError) as exc:
        AIProviderFactory.get_providers()

    assert exc.value.code == "MOCK_PROVIDER_REMOVED"


def test_ai_factory_requires_primary_provider_key(monkeypatch):
    monkeypatch.setattr("app.services.ai.factory.settings.PRIMARY_PROVIDER", "gemini")
    monkeypatch.setattr("app.services.ai.factory.settings.GEMINI_API_KEY", "")

    with pytest.raises(ProviderError) as exc:
        AIProviderFactory.get_providers()

    assert exc.value.code == "MISSING_API_KEY"


def test_scorm_package_contains_required_files():
    zip_path = SCORMService().build_package(
        video_id=123,
        video_url="https://cdn.example.com/video.mp4",
        title="Compliance Video",
        quizzes=[{"id": 1, "title": "Checkpoint"}],
        version="SCORM 1.2",
    )

    with zipfile.ZipFile(zip_path) as package:
        names = set(package.namelist())
        assert {"imsmanifest.xml", "index.html", "player.js", "scorm-api.js", "quiz-data.json"} <= names
        manifest = package.read("imsmanifest.xml").decode("utf-8")
        assert "ADL SCORM" in manifest
        assert "1.2" in manifest


def test_voice_service_requires_elevenlabs_key_for_clone(monkeypatch):
    monkeypatch.setattr("app.services.voice_service.settings.ELEVENLABS_API_KEY", "")
    service = VoiceService()

    with pytest.raises(RuntimeError, match="ELEVENLABS_API_KEY"):
        service.train_voice("Demo", "sample.wav", provider="elevenlabs")


def test_voice_service_rejects_unsupported_preview_provider(monkeypatch):
    monkeypatch.setattr("app.services.voice_service.settings.ELEVENLABS_API_KEY", "test-key")
    service = VoiceService()
    service.s3 = object()

    with pytest.raises(ValueError, match="Unsupported preview provider"):
        service.generate_preview("provider-voice-id", provider="polly")
