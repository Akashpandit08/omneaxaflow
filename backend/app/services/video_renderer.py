"""
Video rendering service.

Composites the final video from pipeline artifacts:
  - Avatar animation clip (or text-only fallback)
  - Audio track
  - Script text overlay (subtitles)
  - Background + branding

Final output is H.264 MP4 at 1280×720 (or configurable resolution).
"""

import os
import subprocess
import textwrap
import uuid
from pathlib import Path
from typing import Callable, List, Optional

from app.core.config import settings
from app.services.avatar_animator import animate_avatar
from app.services.storage import upload_file
from app.services.tts import generate_tts_sync


MEDIA_DIR = Path("/app/media")
AVATAR_DIR = MEDIA_DIR / "avatars"
TMP_DIR = MEDIA_DIR / "tmp"


def render_video(
    script: str,
    audio_local_path: str,
    avatar_image_path: Optional[str] = None,
    avatar_animation_path: Optional[str] = None,
    output_path: Optional[str] = None,
    width: int = 1280,
    height: int = 720,
    fps: int = 30,
) -> str:
    """
    Render the final video from pipeline artifacts.

    Priority:
      1. avatar_animation_path — pre-rendered animated avatar clip (from avatar_animator)
      2. avatar_image_path — static avatar image (composited with text)
      3. text-only — gradient background with centered text

    Returns the local path to the rendered mp4.
    """
    if output_path is None:
        output_path = str(TMP_DIR / f"{uuid.uuid4()}.mp4")

    os.makedirs(TMP_DIR, exist_ok=True)

    if avatar_animation_path and os.path.exists(avatar_animation_path):
        _render_with_animated_avatar(
            script, audio_local_path, avatar_animation_path,
            output_path, width, height, fps,
        )
    elif avatar_image_path and os.path.exists(avatar_image_path):
        _render_with_avatar(
            script, audio_local_path, avatar_image_path,
            output_path, width, height, fps,
        )
    else:
        _render_text_only(
            script, audio_local_path, output_path, width, height, fps,
        )

    return output_path


def render_scenes(
    scenes: list[dict],
    project,
    audio_dir,
    video_dir,
    progress_callback: Optional[Callable[[int, int], None]] = None,
) -> str:
    """Render multiple scene clips and concatenate them into one MP4."""
    os.makedirs(audio_dir, exist_ok=True)
    os.makedirs(video_dir, exist_ok=True)

    clip_paths = []
    temp_paths = []
    output_path = None
    succeeded = False
    scene_count = len(scenes)

    try:
        for index, scene in enumerate(scenes, start=1):
            if progress_callback:
                progress_callback(index, scene_count)

            script = (scene.get("script") or scene.get("text") or "").strip()
            if not script:
                continue

            voice = scene.get("_voice") or project.voice
            voice_provider = voice.provider if voice else "gtts"
            provider_voice_id = voice.provider_voice_id if voice else None
            language = voice.language if voice else "en"

            audio_bytes = generate_tts_sync(
                text=script,
                voice_provider=voice_provider,
                provider_voice_id=provider_voice_id,
                language=language,
            )

            audio_path = str(Path(audio_dir) / f"scene_{index}_{uuid.uuid4().hex[:8]}.mp3")
            with open(audio_path, "wb") as f:
                f.write(audio_bytes)
            temp_paths.append(audio_path)

            avatar = scene.get("_avatar") or project.avatar
            avatar_animation_path = None
            avatar_path = get_local_avatar_path(avatar)

            if avatar_path:
                anim_result = animate_avatar(
                    avatar_image_path=avatar_path,
                    audio_path=audio_path,
                )
                avatar_animation_path = anim_result.video_path
                temp_paths.append(avatar_animation_path)

            clip_path = str(Path(video_dir) / f"scene_{index}_{uuid.uuid4().hex[:8]}.mp4")
            if avatar_animation_path and os.path.exists(avatar_animation_path):
                _render_with_animated_avatar(
                    script, audio_path, avatar_animation_path,
                    clip_path, 1280, 720, 30,
                )
            elif avatar_path and os.path.exists(avatar_path):
                _render_with_avatar(
                    script, audio_path, avatar_path,
                    clip_path, 1280, 720, 30,
                )
            else:
                _render_text_only(script, audio_path, clip_path, 1280, 720, 30)

            clip_paths.append(clip_path)
            temp_paths.append(clip_path)

        if not clip_paths:
            raise ValueError("No renderable scenes found")

        output_path = str(Path(video_dir) / f"scenes_{project.id}_{uuid.uuid4().hex[:8]}.mp4")
        concat_list_path = str(Path(video_dir) / f"concat_{uuid.uuid4().hex[:8]}.txt")
        with open(concat_list_path, "w", encoding="utf-8") as f:
            for clip_path in clip_paths:
                escaped = clip_path.replace("'", "'\\''")
                f.write(f"file '{escaped}'\n")
        temp_paths.append(concat_list_path)

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_list_path,
            "-c", "copy",
            output_path,
        ]
        _run_ffmpeg(cmd)
        succeeded = True
        return output_path
    finally:
        cleanup_paths = temp_paths if succeeded else [*temp_paths, output_path]
        for path in cleanup_paths:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except OSError:
                    pass


def _render_with_animated_avatar(
    script: str,
    audio_path: str,
    animation_path: str,
    output_path: str,
    width: int,
    height: int,
    fps: int,
) -> None:
    """
    Composite the animated avatar clip with a script text overlay.

    Layout: Avatar fills the left 60% of the frame, script text is
    overlaid as a semi-transparent lower-third subtitle bar.
    """
    wrapped = _wrap_text(script, max_chars_per_line=60)
    escaped_text = _escape_ffmpeg_text(wrapped)

    # Scale the animated avatar to fill the frame, then overlay subtitle bar
    filter_complex = (
        f"[0:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=0x1a1a2e[bg];"
        f"[bg]drawtext=text='{escaped_text}'"
        f":fontsize=22:fontcolor=white"
        f":x=(w-tw)/2:y=h-th-40"
        f":line_spacing=6"
        f":box=1:boxcolor=black@0.6:boxborderw=10[out]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", animation_path,
        "-i", audio_path,
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-shortest",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        output_path,
    ]
    _run_ffmpeg(cmd)


def get_local_avatar_path(avatar) -> Optional[str]:
    """Return the locally cached avatar image path, if present."""
    if not avatar or not avatar.thumbnail_url:
        return None

    suffix = Path(str(avatar.thumbnail_url)).suffix
    candidate_suffixes = [suffix] if suffix else []
    candidate_suffixes.extend(ext for ext in [".jpg", ".jpeg", ".png"] if ext not in candidate_suffixes)

    for ext in candidate_suffixes:
        local_avatar = AVATAR_DIR / f"{avatar.id}{ext}"
        if local_avatar.exists():
            return str(local_avatar)
    return None


def _render_with_avatar(
    script: str,
    audio_path: str,
    avatar_path: str,
    output_path: str,
    width: int,
    height: int,
    fps: int,
) -> None:
    """Render video with static avatar image on left side, script text on right side."""
    wrapped = _wrap_text(script, max_chars_per_line=40)
    escaped_text = _escape_ffmpeg_text(wrapped)

    avatar_filter = (
        f"[1:v]scale={width // 2}:-1[avatar];"
        f"[0:v][avatar]overlay=0:(H-h)/2[base];"
        f"[base]drawtext=text='{escaped_text}'"
        f":fontsize=24:fontcolor=white"
        f":x={width // 2 + 20}:y=60"
        f":line_spacing=8"
        f":box=1:boxcolor=black@0.5:boxborderw=8[out]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c=0x1a1a2e:s={width}x{height}:r={fps}",
        "-i", avatar_path,
        "-i", audio_path,
        "-filter_complex", avatar_filter,
        "-map", "[out]",
        "-map", "2:a",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-shortest",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        output_path,
    ]
    _run_ffmpeg(cmd)


def _render_text_only(
    script: str,
    audio_path: str,
    output_path: str,
    width: int,
    height: int,
    fps: int,
) -> None:
    """Render video with text only (no avatar) — gradient background + centered text."""
    wrapped = _wrap_text(script, max_chars_per_line=55)
    escaped_text = _escape_ffmpeg_text(wrapped)

    text_filter = (
        f"drawtext=text='{escaped_text}'"
        f":fontsize=28:fontcolor=white"
        f":x=(w-tw)/2:y=(h-th)/2"
        f":line_spacing=10"
        f":box=1:boxcolor=black@0.4:boxborderw=12"
    )

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c=0x0f3460:s={width}x{height}:r={fps}",
        "-i", audio_path,
        "-vf", text_filter,
        "-map", "0:v",
        "-map", "1:a",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-shortest",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        output_path,
    ]
    _run_ffmpeg(cmd)


def _wrap_text(text: str, max_chars_per_line: int = 50) -> str:
    """Wrap text to multiple lines for FFmpeg drawtext."""
    lines = textwrap.wrap(text, width=max_chars_per_line)
    return "\\n".join(lines[:12])  # cap at 12 lines


def _escape_ffmpeg_text(text: str) -> str:
    """Escape characters that break FFmpeg's drawtext filter."""
    return (
        text
        .replace("'", "\\'")
        .replace(":", "\\:")
        .replace("[", "\\[")
        .replace("]", "\\]")
    )


def _run_ffmpeg(cmd: List[str]) -> None:
    """Execute an FFmpeg command, raising on failure."""
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed:\n{result.stderr}")


def upload_rendered_video(local_path: str) -> str:
    """Upload rendered video to S3 and clean up local file. Returns S3 key."""
    s3_key = f"videos/{uuid.uuid4()}.mp4"
    try:
        upload_file(local_path, s3_key, "video/mp4")
    finally:
        if os.path.exists(local_path):
            os.unlink(local_path)
    return s3_key
