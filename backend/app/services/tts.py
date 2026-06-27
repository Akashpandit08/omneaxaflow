"""
Text-to-Speech service.
Supports:
  - ElevenLabs (premium, high quality)
  - gTTS (free fallback, Google TTS)

Provides both async (for FastAPI) and sync (for Celery) interfaces.
"""

import io
import os
import tempfile
import uuid
from typing import Optional

import httpx

from app.core.config import settings
from app.services.storage import upload_file


# ─── Sync Functions (for Celery workers) ──────────────────────────────────────


def elevenlabs_tts_sync(text: str, voice_id: str) -> bytes:
    """Call ElevenLabs API synchronously. Safe for Celery context."""
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": settings.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": settings.ELEVENLABS_MODEL_ID,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }
    with httpx.Client(timeout=60) as client:
        response = client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.content


def gtts_tts_sync(text: str, language: str = "en") -> bytes:
    """Use gTTS (Google TTS) synchronously. Safe for Celery context."""
    from gtts import gTTS

    tts = gTTS(text=text, lang=language, slow=False)
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    return buf.getvalue()


def generate_tts_sync(
    text: str,
    voice_provider: str = "gtts",
    provider_voice_id: Optional[str] = None,
    language: str = "en",
) -> bytes:
    """
    Generate TTS audio bytes synchronously.
    Returns raw MP3 bytes — caller handles file write / S3 upload.
    """
    if voice_provider == "elevenlabs" and settings.ELEVENLABS_API_KEY and provider_voice_id:
        return elevenlabs_tts_sync(text, provider_voice_id)
    return gtts_tts_sync(text, language)


# ─── Async Functions (for FastAPI endpoints) ──────────────────────────────────


async def _elevenlabs_tts(text: str, voice_id: str) -> bytes:
    """Call ElevenLabs API asynchronously."""
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": settings.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": settings.ELEVENLABS_MODEL_ID,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.content


async def _gtts_tts(text: str, language: str = "en") -> bytes:
    """Use gTTS as a free async fallback."""
    from gtts import gTTS

    tts = gTTS(text=text, lang=language, slow=False)
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    return buf.getvalue()


async def generate_tts(
    text: str,
    voice_provider: str,
    provider_voice_id: Optional[str],
    language: str = "en",
) -> str:
    """
    Generate TTS audio from text (async).
    Returns the S3 key of the uploaded audio file.
    """
    if voice_provider == "elevenlabs" and settings.ELEVENLABS_API_KEY and provider_voice_id:
        audio_bytes = await _elevenlabs_tts(text, provider_voice_id)
    else:
        audio_bytes = await _gtts_tts(text, language)

    # Save to temp file and upload to S3
    s3_key = f"audio/{uuid.uuid4()}.mp3"
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        upload_file(tmp_path, s3_key, "audio/mpeg")
    finally:
        os.unlink(tmp_path)

    return s3_key


async def generate_tts_preview(voice, text: str) -> str:
    """
    Generate a short TTS preview and return a presigned URL.
    """
    s3_key = await generate_tts(text, voice.provider, voice.provider_voice_id, voice.language)
    from app.services.storage import get_presigned_download_url

    url, _ = get_presigned_download_url(s3_key)
    return url
