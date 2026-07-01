import os
import uuid
import tempfile
import boto3
from pydub import AudioSegment
import elevenlabs
from app.core.config import settings

class VoiceService:
    def __init__(self):
        self.elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY", "")
        if self.elevenlabs_api_key:
            elevenlabs.set_api_key(self.elevenlabs_api_key)
        
        self.s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        ) if hasattr(settings, "AWS_ACCESS_KEY_ID") and settings.AWS_ACCESS_KEY_ID else None
        self.bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "mock-bucket")

    def validate_audio(self, file_path: str):
        # Using pydub to check audio length
        try:
            audio = AudioSegment.from_file(file_path)
            duration_seconds = len(audio) / 1000.0
            if duration_seconds < 30:
                raise ValueError("Audio must be at least 30 seconds.")
            if duration_seconds > 300:
                raise ValueError("Audio must be at most 5 minutes.")
            
            # Check file size (50MB)
            file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
            if file_size_mb > 50:
                raise ValueError("File size exceeds 50MB limit.")
                
            return True
        except Exception as e:
            raise ValueError(f"Invalid audio file: {str(e)}")

    def train_voice(self, name: str, file_path: str, provider: str = "elevenlabs") -> str:
        """Trains a voice clone and returns the provider_voice_id."""
        if provider == "elevenlabs":
            if not self.elevenlabs_api_key:
                # Mock return for development
                return f"mock_elevenlabs_id_{uuid.uuid4().hex[:8]}"
            try:
                # Actual elevenlabs implementation
                voice = elevenlabs.clone(
                    name=name,
                    description="Cloned via AiVideo",
                    files=[file_path]
                )
                return voice.voice_id
            except Exception as e:
                raise Exception(f"Failed to clone voice via ElevenLabs: {str(e)}")
        elif provider == "polly":
            # AWS Polly doesn't support direct few-shot voice cloning in the same way,
            # but we can mock this for the fallback.
            return f"mock_polly_id_{uuid.uuid4().hex[:8]}"
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def generate_preview(self, provider_voice_id: str, provider: str = "elevenlabs") -> str:
        """Generates a short preview audio and returns its S3 URL."""
        preview_text = "This is a preview of your custom voice clone."
        if not self.elevenlabs_api_key:
            return "https://mock-s3-bucket.s3.amazonaws.com/mock-preview.mp3"
            
        if provider == "elevenlabs":
            try:
                audio = elevenlabs.generate(text=preview_text, voice=provider_voice_id)
                # Save and upload
                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                    f.write(audio)
                    f.flush()
                    preview_key = f"previews/{provider_voice_id}.mp3"
                    if self.s3:
                        self.s3.upload_file(f.name, self.bucket, preview_key)
                        return f"https://{self.bucket}.s3.amazonaws.com/{preview_key}"
                    return f"mock-url/{preview_key}"
            except Exception as e:
                print(f"Error generating preview: {e}")
                return ""
        return ""
