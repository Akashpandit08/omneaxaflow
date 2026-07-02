import logging
import os
import tempfile
from typing import Generator
from functools import lru_cache

import boto3

from app.core.config import settings
from .base import VoiceProvider

logger = logging.getLogger(__name__)

try:
    # import torch
    # from TTS.api import TTS
    # TTS_AVAILABLE = True
    TTS_AVAILABLE = False
    torch = None
    TTS = None
except ImportError as e:
    logger.warning(f"Could not load TTS dependencies: {e}")
    TTS_AVAILABLE = False
    torch = None
    TTS = None

@lru_cache(maxsize=1)
def get_xtts_model(model_name: str):
    if not (TTS_AVAILABLE and torch):
        return None, "cpu"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Loading XTTS model on {device}...")
    model = TTS(model_name).to(device)
    return model, device

class XTTSProvider(VoiceProvider):
    def __init__(self):
        self.model_name = getattr(settings, "XTTS_MODEL", "tts_models/multilingual/multi-dataset/xtts_v2")
        
        self.tts, self.device = get_xtts_model(self.model_name)
        if self.tts:
            logger.info(f"XTTS running on {self.device}")
            
        self.s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        ) if hasattr(settings, "AWS_ACCESS_KEY_ID") and settings.AWS_ACCESS_KEY_ID else None
        self.bucket = getattr(settings, "S3_BUCKET_NAME", None)

    @property
    def provider_name(self) -> str:
        return "xtts"

    def validate_credentials(self) -> bool:
        # XTTS is local, so it's always valid
        return True

    def clone_voice(self, name: str, file_path: str, description: str = "") -> str:
        """
        XTTS local voice cloning stores the reference audio file
        to be used for zero-shot TTS later.
        """
        if not os.path.exists(file_path):
            raise ValueError(f"Reference audio file not found: {file_path}")
            
        if not self.tts:
            raise RuntimeError("TTS model is not loaded. Cannot clone voice.")
            
        logger.info(f"XTTS cloned voice with reference audio: {file_path}")
        
        # Return a provider ID representing the local clone's reference file
        return f"xtts_clone_{os.path.abspath(file_path)}"

    def text_to_speech(self, voice_id: str, text: str) -> Generator[bytes, None, None]:
        if not self.tts:
            raise RuntimeError("TTS model is not loaded. Cannot generate speech.")
            
        # Parse the reference audio file from the voice_id
        if not voice_id.startswith("xtts_clone_"):
            raise ValueError("Invalid XTTS voice ID format.")
            
        reference_audio = voice_id.replace("xtts_clone_", "", 1)
        if not os.path.exists(reference_audio):
            raise ValueError(f"Reference audio file not found for voice ID: {reference_audio}")
            
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                temp_name = f.name
            
            # Generate speech
            self.tts.tts_to_file(
                text=text,
                speaker_wav=reference_audio,
                language="en",
                file_path=temp_name
            )
            
            # Yield chunks
            with open(temp_name, "rb") as f:
                while chunk := f.read(8192):
                    yield chunk
                    
        except Exception as e:
            logger.exception(f"XTTS TTS failed: {str(e)}")
            raise ValueError(f"XTTS TTS error: {str(e)}")
        finally:
            if 'temp_name' in locals() and os.path.exists(temp_name):
                os.remove(temp_name)

    def generate_preview(self, voice_id: str) -> str:
        if not self.s3:
            raise RuntimeError("S3 storage is not configured for voice preview uploads.")
            
        preview_text = "This is a preview of your custom voice clone running locally via XTTS."
        temp_name = None
        try:
            audio_chunks = self.text_to_speech(voice_id, preview_text)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                temp_name = f.name
                for chunk in audio_chunks:
                    f.write(chunk)
                f.flush()
                preview_key = f"previews/{os.path.basename(voice_id)}.wav"
                self.s3.upload_file(f.name, self.bucket, preview_key)
                return f"https://{self.bucket}.s3.amazonaws.com/{preview_key}"
        except Exception as e:
            raise RuntimeError(f"Error generating voice preview: {e}") from e
        finally:
            if temp_name and os.path.exists(temp_name):
                os.remove(temp_name)
