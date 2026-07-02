import logging
import os
import tempfile
from typing import Generator

import boto3
from elevenlabs import ElevenLabs

from app.core.config import settings
from .base import VoiceProvider

logger = logging.getLogger(__name__)

class ElevenLabsProvider(VoiceProvider):
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY or os.getenv("ELEVENLABS_API_KEY", "")
        self.client = ElevenLabs(api_key=self.api_key) if self.api_key else None
        
        self.s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        ) if hasattr(settings, "AWS_ACCESS_KEY_ID") and settings.AWS_ACCESS_KEY_ID else None
        self.bucket = settings.S3_BUCKET_NAME

    @property
    def provider_name(self) -> str:
        return "elevenlabs"

    def validate_credentials(self) -> bool:
        return bool(self.api_key and self.client)

    def clone_voice(self, name: str, file_path: str, description: str = "Cloned via AiVideo") -> str:
        if not self.validate_credentials():
            raise RuntimeError("ElevenLabs credentials missing")
            
        try:
            if hasattr(self.client, "clone"):
                voice = self.client.clone(
                    name=name,
                    description=description,
                    files=[file_path]
                )
            elif hasattr(self.client.voices, "clone"):
                voice = self.client.voices.clone(
                    name=name,
                    description=description,
                    files=[file_path]
                )
            elif hasattr(self.client.voices, "add"):
                voice = self.client.voices.add(
                    name=name,
                    description=description,
                    files=[file_path]
                )
            else:
                raise ValueError("Installed ElevenLabs SDK does not support voice cloning API")
            
            return voice.voice_id
        except Exception as e:
            logger.exception(f"ElevenLabs clone failed: {str(e)}")
            raise ValueError(f"SDK version mismatch or API error: {str(e)}")

    def text_to_speech(self, voice_id: str, text: str) -> Generator[bytes, None, None]:
        if not self.validate_credentials():
            raise RuntimeError("ElevenLabs credentials missing")
        return self.client.text_to_speech.convert(
            voice_id=voice_id,
            text=text,
            model_id=settings.ELEVENLABS_MODEL_ID,
        )

    def generate_preview(self, voice_id: str) -> str:
        if not self.s3:
            raise RuntimeError("S3 storage is not configured for voice preview uploads.")
            
        preview_text = "This is a preview of your custom voice clone."
        temp_name = None
        try:
            audio_chunks = self.text_to_speech(voice_id, preview_text)
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                temp_name = f.name
                for chunk in audio_chunks:
                    f.write(chunk)
                f.flush()
                preview_key = f"previews/{voice_id}.mp3"
                self.s3.upload_file(f.name, self.bucket, preview_key)
                return f"https://{self.bucket}.s3.amazonaws.com/{preview_key}"
        except Exception as e:
            raise RuntimeError(f"Error generating voice preview: {e}") from e
        finally:
            if temp_name and os.path.exists(temp_name):
                os.remove(temp_name)
