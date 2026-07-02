"""
Avatar animation service.

Provides avatar-to-video animation for the rendering pipeline.
When a real provider (like D-ID, HeyGen, or Synthesia) is configured,
this service calls their API to generate a talking-head video from
an avatar image + audio track.

Falls back to a local "pan & zoom" animation using FFmpeg for
development or when no provider is configured.
"""

import os
import subprocess
import uuid
from pathlib import Path
from typing import Optional

import httpx

from app.core.config import settings

MEDIA_TMP = Path("/app/media/tmp")


class AvatarAnimationResult:
    """Result of an avatar animation call."""

    def __init__(
        self,
        video_path: str,
        duration_seconds: Optional[float] = None,
        provider: str = "local",
    ):
        self.video_path = video_path
        self.duration_seconds = duration_seconds
        self.provider = provider


# ─── Provider Dispatch ────────────────────────────────────────────────────────


def animate_avatar(
    avatar_image_path: str,
    audio_path: str,
    output_dir: Optional[str] = None,
    width: int = 1280,
    height: int = 720,
    fps: int = 30,
) -> AvatarAnimationResult:
    """
    Generate a talking-head animation from an avatar image + audio track.

    Provider selection:
      1. D-ID API (if DID_API_KEY is set)
      2. Local FFmpeg "ken burns" animation (fallback)

    Returns an AvatarAnimationResult with the local path to the animated clip.
    """
    if output_dir is None:
        output_dir = str(MEDIA_TMP)
    os.makedirs(output_dir, exist_ok=True)

    output_path = os.path.join(output_dir, f"avatar_anim_{uuid.uuid4().hex[:8]}.mp4")

    # Try D-ID provider if configured
    did_key = getattr(settings, "DID_API_KEY", None)
    if did_key:
        return _animate_with_did(avatar_image_path, audio_path, output_path, did_key)

    # Fallback: local FFmpeg ken-burns animation
    return _animate_local(avatar_image_path, audio_path, output_path, width, height, fps)


# ─── D-ID Provider ───────────────────────────────────────────────────────────


def _animate_with_did(
    avatar_image_path: str,
    audio_path: str,
    output_path: str,
    api_key: str,
) -> AvatarAnimationResult:
    """
    Call D-ID's Talks API to generate a talking-head video.

    Workflow:
      1. Upload the avatar image → get a source URL
      2. Upload the audio → get an audio URL
      3. Create a talk → poll until complete
      4. Download the result video
    """
    base_url = "https://api.d-id.com"
    headers = {
        "Authorization": f"Basic {api_key}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=120) as client:
        # Upload avatar image
        with open(avatar_image_path, "rb") as f:
            img_resp = client.post(
                f"{base_url}/images",
                files={"image": ("avatar.jpg", f, "image/jpeg")},
                headers={"Authorization": f"Basic {api_key}"},
            )
            img_resp.raise_for_status()
            image_url = img_resp.json()["url"]

        # Upload audio
        with open(audio_path, "rb") as f:
            audio_resp = client.post(
                f"{base_url}/audios",
                files={"audio": ("audio.mp3", f, "audio/mpeg")},
                headers={"Authorization": f"Basic {api_key}"},
            )
            audio_resp.raise_for_status()
            audio_url = audio_resp.json()["url"]

        # Create talk
        talk_resp = client.post(
            f"{base_url}/talks",
            json={
                "source_url": image_url,
                "script": {
                    "type": "audio",
                    "audio_url": audio_url,
                },
                "config": {"stitch": True},
            },
            headers=headers,
        )
        talk_resp.raise_for_status()
        talk_id = talk_resp.json()["id"]

        # Poll until complete (max 5 min)
        import time

        for _ in range(60):
            status_resp = client.get(
                f"{base_url}/talks/{talk_id}",
                headers=headers,
            )
            status_resp.raise_for_status()
            data = status_resp.json()

            if data["status"] == "done":
                result_url = data["result_url"]
                break
            elif data["status"] == "error":
                raise RuntimeError(f"D-ID animation failed: {data.get('error', 'Unknown error')}")

            time.sleep(5)
        else:
            raise RuntimeError("D-ID animation timed out after 5 minutes")

        # Download result video
        video_resp = client.get(result_url)
        video_resp.raise_for_status()
        with open(output_path, "wb") as f:
            f.write(video_resp.content)

    duration = _get_video_duration(output_path)
    return AvatarAnimationResult(
        video_path=output_path,
        duration_seconds=duration,
        provider="d-id",
    )


# ─── Local FFmpeg Fallback ────────────────────────────────────────────────────


def _animate_local(
    avatar_image_path: str,
    audio_path: str,
    output_path: str,
    width: int = 1280,
    height: int = 720,
    fps: int = 30,
) -> AvatarAnimationResult:
    """
    Generate a local avatar animation using FFmpeg.

    Applies a slow ken-burns (pan & zoom) effect to the avatar image,
    synced to the audio duration, producing a natural-feeling clip.
    """
    # Get audio duration first
    duration = _get_audio_duration(audio_path)

    # Ken-burns filter: slow zoom-in from 110% → 130% with slight pan
    # This makes a static image feel alive
    filter_complex = (
        f"[0:v]scale={width * 2}:{height * 2},"
        f"zoompan=z='min(zoom+0.0005,1.3)'"
        f":x='iw/2-(iw/zoom/2)+sin(on/200)*20'"
        f":y='ih/2-(ih/zoom/2)+cos(on/300)*10'"
        f":d={int(duration * fps)}"
        f":s={width}x{height}"
        f":fps={fps}[v]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", avatar_image_path,
        "-i", audio_path,
        "-filter_complex", filter_complex,
        "-map", "[v]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-shortest",
        "-t", str(duration),
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg avatar animation failed:\n{result.stderr}")

    return AvatarAnimationResult(
        video_path=output_path,
        duration_seconds=duration,
        provider="local",
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _get_audio_duration(path: str) -> float:
    """Get audio file duration in seconds using ffprobe."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return 30.0  # fallback default
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 30.0


def _get_video_duration(path: str) -> Optional[float]:
    """Get video file duration in seconds using ffprobe."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return None
    try:
        return float(result.stdout.strip())
    except ValueError:
        return None
