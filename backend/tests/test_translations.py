import pytest
from unittest.mock import MagicMock
from app.services.translation_service import TranslationService

def test_mock_translation():
    # TranslationService falls back to mock if google cloud translate is disabled
    service = TranslationService()
    service.enabled = False
    
    text = "Hello world"
    result = service.translate_text(text, "es")
    
    assert result == "[es] Hello world"

def test_real_translation():
    service = TranslationService()
    service.enabled = True
    service.client = MagicMock()
    service.client.translate.return_value = {"translatedText": "Hola mundo"}
    
    result = service.translate_text("Hello world", "es")
    
    assert result == "Hola mundo"
    service.client.translate.assert_called_once_with("Hello world", target_language="es")
