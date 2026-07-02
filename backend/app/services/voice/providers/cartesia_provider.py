import logging
import os
import tempfile
from typing import Generator

import httpx

from app.core.config import settings
from app.services.storage import upload_file
from app.services.tts import cartesia_tts_sync
from .base import VoiceProvider

logger = logging.getLogger(__name__)


class CartesiaProvider(VoiceProvider):
    def __init__(self):
        self.api_key = settings.CARTESIA_API_KEY or os.getenv("CARTESIA_API_KEY", "")
        self.api_version = settings.CARTESIA_API_VERSION

    @property
    def provider_name(self) -> str:
        return "cartesia"

    def validate_credentials(self) -> bool:
        return bool(self.api_key)

    def _headers(self) -> dict[str, str]:
        return {
            "X-API-Key": self.api_key,
            "Cartesia-Version": self.api_version,
        }

    def clone_voice(self, name: str, file_path: str, description: str = "") -> str:
        if not self.validate_credentials():
            raise RuntimeError("Cartesia credentials missing. Set CARTESIA_API_KEY.")
        if not os.path.exists(file_path):
            raise ValueError(f"Reference audio file not found: {file_path}")

        try:
            with httpx.Client(timeout=120) as client:
                with open(file_path, "rb") as audio_file:
                    response = client.post(
                        "https://api.cartesia.ai/voices/clone",
                        headers=self._headers(),
                        data={
                            "name": name,
                            "description": description or "Cloned via AiVideo",
                            "enhance": "true",
                        },
                        files={"clip": (os.path.basename(file_path), audio_file, "audio/mpeg")},
                    )
            response.raise_for_status()
            data = response.json()
            voice_id = data.get("id") or data.get("voice_id")
            if not voice_id:
                raise RuntimeError(f"Cartesia clone response did not include a voice id: {data}")
            return voice_id
        except Exception as e:
            logger.exception(f"Cartesia clone failed: {str(e)}")
            raise RuntimeError(f"Cartesia clone failed: {e}") from e

    def text_to_speech(self, voice_id: str, text: str) -> Generator[bytes, None, None]:
        audio = cartesia_tts_sync(text, voice_id, settings.CARTESIA_DEFAULT_LANGUAGE)
        yield audio

    def generate_preview(self, voice_id: str) -> str:
        preview_text = "This is a preview of your custom Cartesia voice clone."
        temp_name = None
        try:
            audio_bytes = cartesia_tts_sync(preview_text, voice_id, settings.CARTESIA_DEFAULT_LANGUAGE)
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                temp_name = f.name
                f.write(audio_bytes)
                f.flush()
            preview_key = f"previews/cartesia-{voice_id}.mp3"
            upload_file(temp_name, preview_key, "audio/mpeg")
            return f"https://{settings.S3_BUCKET_NAME}.s3.amazonaws.com/{preview_key}"
        except Exception as e:
            raise RuntimeError(f"Error generating Cartesia preview: {e}") from e
        finally:
            if temp_name and os.path.exists(temp_name):
                os.remove(temp_name)
