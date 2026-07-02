import logging
import os
from typing import Generator

from app.core.config import settings
from .base import VoiceProvider

logger = logging.getLogger(__name__)

class OpenAIProvider(VoiceProvider):
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")

    @property
    def provider_name(self) -> str:
        return "openai"

    def validate_credentials(self) -> bool:
        return bool(self.api_key)

    def clone_voice(self, name: str, file_path: str, description: str = "") -> str:
        if not self.validate_credentials():
            raise RuntimeError("OpenAI credentials missing")
            
        # OpenAI does not currently support custom voice cloning through their public API
        raise ValueError("Voice cloning unsupported by OpenAI provider")

    def text_to_speech(self, voice_id: str, text: str) -> Generator[bytes, None, None]:
        if not self.validate_credentials():
            raise RuntimeError("OpenAI credentials missing")
            
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key)
            
            response = client.audio.speech.create(
                model="tts-1",
                voice=voice_id,
                input=text
            )
            
            yield response.read()
        except Exception as e:
            logger.exception(f"OpenAI TTS failed: {str(e)}")
            raise ValueError(f"OpenAI TTS error: {str(e)}")

    def generate_preview(self, voice_id: str) -> str:
        raise ValueError("Preview unsupported by OpenAI provider")
