import logging

logger = logging.getLogger(__name__)

import os
import tempfile

import boto3
from elevenlabs import ElevenLabs

from app.core.config import settings

class VoiceService:
    def __init__(self):
        self.elevenlabs_api_key = settings.ELEVENLABS_API_KEY or os.getenv("ELEVENLABS_API_KEY", "")
        self.elevenlabs_client = ElevenLabs(api_key=self.elevenlabs_api_key) if self.elevenlabs_api_key else None
        
        self.s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        ) if hasattr(settings, "AWS_ACCESS_KEY_ID") and settings.AWS_ACCESS_KEY_ID else None
        self.bucket = settings.S3_BUCKET_NAME

    def validate_audio(self, file_path: str):
        # Using pydub to check audio length
        try:
            from pydub import AudioSegment

            audio = AudioSegment.from_file(file_path)
            duration_seconds = len(audio) / 1000.0
            if duration_seconds < 30:
                raise ValueError("Audio must be at least 30 seconds.")
            if duration_seconds > 300:
                raise ValueError("Audio must be at most 5 minutes.")
            
            # Check file size (25MB)
            file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
            if file_size_mb > 25:
                raise ValueError("File size exceeds 25MB limit.")
                
            return True
        except Exception as e:
            raise ValueError(f"Invalid audio file: {str(e)}")

    def train_voice(self, name: str, file_path: str, provider: str = "elevenlabs") -> str:
        """Trains a voice clone and returns the provider_voice_id."""
        if provider == "elevenlabs":
            if not self.elevenlabs_client:
                raise RuntimeError("ElevenLabs voice cloning is not configured. Missing ELEVENLABS_API_KEY.")
            try:
                if hasattr(self.elevenlabs_client, "clone"):
                    voice = self.elevenlabs_client.clone(
                        name=name,
                        description="Cloned via AiVideo",
                        files=[file_path]
                    )
                elif hasattr(self.elevenlabs_client.voices, "clone"):
                    voice = self.elevenlabs_client.voices.clone(
                        name=name,
                        description="Cloned via AiVideo",
                        files=[file_path]
                    )
                elif hasattr(self.elevenlabs_client.voices, "add"):
                    voice = self.elevenlabs_client.voices.add(
                        name=name,
                        description="Cloned via AiVideo",
                        files=[file_path]
                    )
                else:
                    raise ValueError("Installed ElevenLabs SDK does not support voice cloning API")
                
                return voice.voice_id
            except Exception as e:
                logger.exception(f"ElevenLabs clone failed: {str(e)}")
                raise ValueError(f"SDK version mismatch or API error: {str(e)}")
        elif provider == "polly":
            raise ValueError("AWS Polly does not support custom voice cloning.")
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def generate_preview(self, provider_voice_id: str, provider: str = "elevenlabs") -> str:
        """Generates a short preview audio and returns its S3 URL."""
        preview_text = "This is a preview of your custom voice clone."
        if not self.elevenlabs_api_key:
            raise RuntimeError("ElevenLabs preview generation is not configured. Missing ELEVENLABS_API_KEY.")
        if not self.elevenlabs_client:
            raise RuntimeError("ElevenLabs preview generation is not configured. Missing ELEVENLABS_API_KEY.")
        if not self.s3:
            raise RuntimeError("S3 storage is not configured for voice preview uploads.")
            
        if provider != "elevenlabs":
            raise ValueError(f"Unsupported preview provider: {provider}")

        temp_name = None
        try:
            audio_chunks = self.elevenlabs_client.text_to_speech.convert(
                provider_voice_id,
                text=preview_text,
                model_id=settings.ELEVENLABS_MODEL_ID,
            )
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                temp_name = f.name
                for chunk in audio_chunks:
                    f.write(chunk)
                f.flush()
                preview_key = f"previews/{provider_voice_id}.mp3"
                self.s3.upload_file(f.name, self.bucket, preview_key)
                return f"https://{self.bucket}.s3.amazonaws.com/{preview_key}"
        except Exception as e:
            raise RuntimeError(f"Error generating voice preview: {e}") from e
        finally:
            if temp_name and os.path.exists(temp_name):
                os.remove(temp_name)
