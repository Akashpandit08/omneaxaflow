import logging
import os
import tempfile
from typing import Generator

from app.core.config import settings
from app.services.storage import upload_file
from app.services.tts import polly_tts_sync
from .base import VoiceProvider

logger = logging.getLogger(__name__)


class PollyProvider(VoiceProvider):
    @property
    def provider_name(self) -> str:
        return "polly"

    def validate_credentials(self) -> bool:
        return bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY)

    def clone_voice(self, name: str, file_path: str, description: str = "") -> str:
        raise ValueError("Amazon Polly does not support custom voice cloning.")

    def text_to_speech(self, voice_id: str, text: str) -> Generator[bytes, None, None]:
        audio = polly_tts_sync(text, voice_id or settings.POLLY_DEFAULT_VOICE_ID)
        yield audio

    def generate_preview(self, voice_id: str) -> str:
        preview_text = "This is a preview of an Amazon Polly voice."
        temp_name = None
        try:
            audio_bytes = polly_tts_sync(preview_text, voice_id or settings.POLLY_DEFAULT_VOICE_ID)
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                temp_name = f.name
                f.write(audio_bytes)
                f.flush()
            preview_key = f"previews/polly-{voice_id or settings.POLLY_DEFAULT_VOICE_ID}.mp3"
            upload_file(temp_name, preview_key, "audio/mpeg")
            return f"https://{settings.S3_BUCKET_NAME}.s3.amazonaws.com/{preview_key}"
        except Exception as e:
            raise RuntimeError(f"Error generating Polly preview: {e}") from e
        finally:
            if temp_name and os.path.exists(temp_name):
                os.remove(temp_name)
