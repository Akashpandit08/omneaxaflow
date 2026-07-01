"""
Celery tasks for video rendering pipeline.

Full pipeline matching the user's workflow:
  Script → Voice Generation → Avatar Animation → Audio Generation → FFmpeg Rendering → Final MP4

Pipeline stages with progress tracking:
  Stage 1 (0–5%):    Fetch & validate project data
  Stage 2 (5–25%):   Voice generation (TTS via ElevenLabs or gTTS)
  Stage 3 (25–50%):  Avatar animation (D-ID API or local ken-burns)
  Stage 4 (50–55%):  Audio post-processing & S3 upload
  Stage 5 (55–85%):  FFmpeg final rendering (composite avatar + audio + text)
  Stage 6 (85–95%):  Upload final MP4 to S3
  Stage 7 (95–100%): Finalize DB records, clean up temp files
"""

import os
import uuid
from datetime import UTC, datetime
from pathlib import Path

from celery import Task
from celery.utils.log import get_task_logger
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.avatar import Avatar
from app.models.project import Project, ProjectStatus
from app.models.subscription import Subscription
from app.models.video import Video, VideoStatus
from app.models.voice import Voice
from app.services.avatar_animator import animate_avatar
from app.services.email import send_video_failed_email, send_video_ready_email
from app.services.storage import upload_file
from app.services.tts import generate_tts_sync
from app.services.video_renderer import (
    get_local_avatar_path,
    render_scenes,
    render_video,
    upload_rendered_video,
)
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)

MEDIA_TMP = Path("/app/media/tmp")


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _get_sync_db():
    """Create a synchronous SQLAlchemy session for Celery tasks."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = create_engine(sync_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    return Session()


def _update_progress(db, video: Video, percent: int, stage: str = ""):
    """Update progress in DB so the frontend can poll it."""
    video.progress_percent = percent
    db.commit()
    logger.info(f"  → [{percent:3d}%] {stage}")


class NonRetryableError(Exception):
    """Raised for errors that should NOT be retried (e.g. missing script)."""
    pass


# ─── Main Render Task ────────────────────────────────────────────────────────


@celery_app.task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    dont_autoretry_for=(NonRetryableError,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    name="app.workers.video_tasks.render_video_task",
    acks_late=True,
    track_started=True,
)
def render_video_task(self: Task, video_id: int, project_id: int) -> dict:
    """
    Full video rendering pipeline:

      Script → Voice Generation → Avatar Animation → Audio Upload → FFmpeg Render → S3 Upload → Done

    Each stage updates progress_percent in the DB for real-time frontend polling.
    On transient failures, retries up to 3× with exponential backoff (30s, 60s, 120s).
    On permanent failures (missing project, empty script), fails immediately.
    """
    db = _get_sync_db()
    audio_tmp = None
    avatar_anim_path = None
    video_output_path = None

    try:
        # ─────────────────────────────────────────────────────────────────
        # STAGE 1: Fetch & Validate (0–5%)
        # ─────────────────────────────────────────────────────────────────
        video = db.execute(select(Video).where(Video.id == video_id)).scalar_one_or_none()
        if not video:
            raise NonRetryableError(f"Video record {video_id} not found")

        video.status = VideoStatus.processing
        _update_progress(db, video, 0, "Starting pipeline")

        project = db.execute(
            select(Project)
            .where(Project.id == project_id)
            .options(
                selectinload(Project.avatar),
                selectinload(Project.voice),
                selectinload(Project.owner),
            )
        ).scalar_one_or_none()

        if not project:
            raise NonRetryableError(f"Project {project_id} not found")
        has_scenes = _has_renderable_scenes(project.scenes)
        if not has_scenes and (not project.script or not project.script.strip()):
            raise NonRetryableError("Project has no script — cannot render")

        logger.info(
            f"[Task {self.request.id}] ═══════════════════════════════════════"
        )
        logger.info(
            f"  Rendering video {video_id} for project {project_id}"
        )
        logger.info(
            f"  Attempt {self.request.retries + 1}/{self.max_retries + 1}"
        )
        logger.info(
            f"  Script length: {len(project.script or '')} chars"
        )
        logger.info(
            f"  Avatar: {'#' + str(project.avatar.id) if project.avatar else 'none'}"
        )
        logger.info(
            f"  Voice: {project.voice.provider + '/' + project.voice.name if project.voice else 'gtts/default'}"
        )
        logger.info(
            f"[Task {self.request.id}] ═══════════════════════════════════════"
        )

        _update_progress(db, video, 5, "Project validated")

        if has_scenes:
            scenes = _prepare_scenes(db, project.scenes)
            _update_progress(db, video, 25, f"Rendering {len(scenes)} scenes")

            def scene_progress(scene_index: int, scene_count: int) -> None:
                percent = 25 + int(((scene_index - 1) / scene_count) * 60)
                _update_progress(db, video, percent, f"Scene {scene_index}/{scene_count}")

            video_output_path = render_scenes(
                scenes,
                project,
                MEDIA_TMP,
                MEDIA_TMP,
                progress_callback=scene_progress,
            )

            duration_seconds = _get_duration(video_output_path)
            video.duration_seconds = int(duration_seconds) if duration_seconds else None

            logger.info(
                f"  Multi-scene video rendered: {video_output_path} "
                f"({duration_seconds:.1f}s)" if duration_seconds else f"  Multi-scene video rendered: {video_output_path}"
            )
            _update_progress(db, video, 85, "Video encoded")

            _update_progress(db, video, 88, "Uploading final video to S3")
            video_s3_key = upload_rendered_video(video_output_path)
            video_output_path = None

            video.video_s3_key = video_s3_key
            _update_progress(db, video, 95, f"Video uploaded → {video_s3_key}")

            video.status = VideoStatus.completed
            video.error_message = None
            project.status = ProjectStatus.completed

            sub = db.execute(
                select(Subscription).where(Subscription.user_id == project.owner_id)
            ).scalar_one_or_none()
            if sub:
                sub.videos_used_this_period += 1

            send_video_ready_email(project.owner.email, project.title)

            _update_progress(db, video, 100, "Pipeline complete ✓")
            db.commit()

            from app.services.analytics import track_event_sync
            track_event_sync(db, video.workspace_id, "render.completed", user_id=project.owner_id, project_id=project.id, video_id=video.id)

            logger.info(
                f"[Task {self.request.id}] ✓ Multi-scene pipeline complete for video {video_id} → {video_s3_key}"
            )
            return {
                "video_id": video_id,
                "s3_key": video_s3_key,
                "duration_seconds": video.duration_seconds,
                "status": "completed",
            }

        # ─────────────────────────────────────────────────────────────────
        # STAGE 2: Voice Generation — TTS (5–25%)
        # ─────────────────────────────────────────────────────────────────
        voice = project.voice
        voice_provider = voice.provider if voice else "gtts"
        provider_voice_id = voice.provider_voice_id if voice else None
        language = voice.language if voice else "en"

        _update_progress(db, video, 8, f"Generating voice via {voice_provider}")

        audio_bytes = generate_tts_sync(
            text=project.script,
            voice_provider=voice_provider,
            provider_voice_id=provider_voice_id,
            language=language,
        )

        # Write audio to temp file
        os.makedirs(MEDIA_TMP, exist_ok=True)
        audio_tmp = str(MEDIA_TMP / f"audio_{video_id}_{uuid.uuid4().hex[:8]}.mp3")
        with open(audio_tmp, "wb") as f:
            f.write(audio_bytes)

        logger.info(f"  Audio generated: {len(audio_bytes)} bytes → {audio_tmp}")
        _update_progress(db, video, 25, "Voice generated")

        # ─────────────────────────────────────────────────────────────────
        # STAGE 3: Avatar Animation (25–50%)
        # ─────────────────────────────────────────────────────────────────
        avatar_path = get_local_avatar_path(project.avatar)

        if avatar_path:
            _update_progress(db, video, 30, "Animating avatar")

            anim_result = animate_avatar(
                avatar_image_path=avatar_path,
                audio_path=audio_tmp,
            )
            avatar_anim_path = anim_result.video_path

            logger.info(
                f"  Avatar animated via {anim_result.provider} "
                f"({anim_result.duration_seconds:.1f}s) → {avatar_anim_path}"
            )
            _update_progress(db, video, 50, f"Avatar animated ({anim_result.provider})")
        else:
            logger.info("  No avatar selected — skipping animation stage")
            _update_progress(db, video, 50, "No avatar — skipping animation")

        # ─────────────────────────────────────────────────────────────────
        # STAGE 4: Audio Upload to S3 (50–55%)
        # ─────────────────────────────────────────────────────────────────
        _update_progress(db, video, 52, "Uploading audio to S3")

        audio_s3_key = f"audio/{uuid.uuid4()}.mp3"
        upload_file(audio_tmp, audio_s3_key, "audio/mpeg")
        video.audio_s3_key = audio_s3_key

        _update_progress(db, video, 55, f"Audio uploaded → {audio_s3_key}")

        # ─────────────────────────────────────────────────────────────────
        # STAGE 5: FFmpeg Final Rendering (55–85%)
        # ─────────────────────────────────────────────────────────────────
        _update_progress(db, video, 58, "Compositing final video")

        video_output_path = str(MEDIA_TMP / f"video_{video_id}_{uuid.uuid4().hex[:8]}.mp4")

        render_video(
            script=project.script,
            audio_local_path=audio_tmp,
            avatar_image_path=avatar_path,
            avatar_animation_path=avatar_anim_path,
            output_path=video_output_path,
        )

        # Get duration from rendered file
        duration_seconds = _get_duration(video_output_path)
        video.duration_seconds = int(duration_seconds) if duration_seconds else None

        logger.info(
            f"  Video rendered: {video_output_path} "
            f"({duration_seconds:.1f}s)" if duration_seconds else f"  Video rendered: {video_output_path}"
        )
        _update_progress(db, video, 85, "Video encoded")

        # ─────────────────────────────────────────────────────────────────
        # STAGE 6: Upload Final MP4 to S3 (85–95%)
        # ─────────────────────────────────────────────────────────────────
        _update_progress(db, video, 88, "Uploading final video to S3")

        video_s3_key = upload_rendered_video(video_output_path)
        video_output_path = None  # upload_rendered_video deletes the file

        video.video_s3_key = video_s3_key
        _update_progress(db, video, 95, f"Video uploaded → {video_s3_key}")

        # ─────────────────────────────────────────────────────────────────
        # STAGE 7: Finalize (95–100%)
        # ─────────────────────────────────────────────────────────────────
        video.status = VideoStatus.completed
        video.error_message = None
        project.status = ProjectStatus.completed

        # Increment subscription usage
        sub = db.execute(
            select(Subscription).where(Subscription.user_id == project.owner_id)
        ).scalar_one_or_none()
        if sub:
            sub.videos_used_this_period += 1

        send_video_ready_email(project.owner.email, project.title)

        try:
            from app.services.webhook_dispatcher import dispatch_webhook_event
            payload = {
                "project_id": project.id,
                "video_id": video.id,
                "title": project.title,
                "status": "completed"
            }
            dispatch_webhook_event(db, project.owner_id, "video.completed", payload)
        except Exception as e:
            logger.error(f"Failed to dispatch video.completed webhook: {e}")

        _update_progress(db, video, 100, "Pipeline complete ✓")
        db.commit()

        from app.services.analytics import track_event_sync
        track_event_sync(db, video.workspace_id, "render.completed", user_id=project.owner_id, project_id=project.id, video_id=video.id)

        logger.info(
            f"[Task {self.request.id}] ✓ Pipeline complete for video {video_id} → {video_s3_key}"
        )
        return {
            "video_id": video_id,
            "s3_key": video_s3_key,
            "duration_seconds": video.duration_seconds,
            "status": "completed",
        }

    except NonRetryableError as exc:
        logger.error(f"[Task {self.request.id}] ✗ Non-retryable error: {exc}")
        _mark_failed(db, video_id, project_id, str(exc))
        raise

    except Exception as exc:
        logger.error(
            f"[Task {self.request.id}] ✗ Pipeline failed for video {video_id} "
            f"(attempt {self.request.retries + 1}): {exc}",
            exc_info=True,
        )
        # On final retry, mark as permanently failed
        if self.request.retries >= self.max_retries:
            _mark_failed(db, video_id, project_id, str(exc))
        raise  # Celery autoretry handles the retry

    finally:
        # Clean up ALL temp files — even on failure
        for path in [audio_tmp, avatar_anim_path, video_output_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                    logger.debug(f"  Cleaned up temp file: {path}")
                except OSError:
                    pass
        db.close()


def _has_renderable_scenes(scenes) -> bool:
    if not isinstance(scenes, list):
        return False
    return any((scene.get("script") or scene.get("text") or "").strip() for scene in scenes if isinstance(scene, dict))


def _prepare_scenes(db, scenes) -> list[dict]:
    prepared = []
    for scene in scenes or []:
        if not isinstance(scene, dict):
            continue
        script = (scene.get("script") or scene.get("text") or "").strip()
        if not script:
            continue

        item = dict(scene)
        item["script"] = script

        avatar_id = item.get("avatar_id")
        if avatar_id:
            item["_avatar"] = db.get(Avatar, avatar_id)

        voice_id = item.get("voice_id")
        if voice_id:
            item["_voice"] = db.get(Voice, voice_id)

        prepared.append(item)

    if not prepared:
        raise NonRetryableError("Project has no renderable scenes")
    return prepared


def _mark_failed(db, video_id: int, project_id: int, error_msg: str):
    """Mark video and project as failed in DB."""
    try:
        video = db.execute(select(Video).where(Video.id == video_id)).scalar_one_or_none()
        if video:
            video.status = VideoStatus.failed
            video.error_message = error_msg[:500]
        project = db.execute(
            select(Project)
            .where(Project.id == project_id)
            .options(selectinload(Project.owner))
        ).scalar_one_or_none()
        if project:
            project.status = ProjectStatus.failed
            send_video_failed_email(project.owner.email, project.title, error_msg)

            try:
                from app.services.webhook_dispatcher import dispatch_webhook_event
                payload = {
                    "project_id": project.id,
                    "video_id": video_id,
                    "title": project.title,
                    "status": "failed",
                    "error": error_msg[:500]
                }
                dispatch_webhook_event(db, project.owner_id, "video.failed", payload)
            except Exception as e:
                logger.error(f"Failed to dispatch video.failed webhook: {e}")
                
            from app.services.analytics import track_event_sync
            track_event_sync(db, video.workspace_id, "render.failed", user_id=project.owner_id, project_id=project.id, video_id=video_id, metadata={"error": error_msg[:500]})

        db.commit()
    except Exception as inner_exc:
        logger.error(f"Failed to update error status: {inner_exc}")


def _get_duration(path: str) -> float:
    """Get media file duration in seconds using ffprobe."""
    import subprocess

    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return 0.0
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0


# ─── Periodic Task ────────────────────────────────────────────────────────────


@celery_app.task(name="app.workers.video_tasks.reset_monthly_video_counts")
def reset_monthly_video_counts():
    """
    Periodic task: reset videos_used_this_period for subscriptions
    whose billing period has rolled over.
    """
    db = _get_sync_db()
    try:
        now = datetime.now(UTC)
        subs = db.execute(select(Subscription)).scalars().all()
        reset_count = 0
        for sub in subs:
            if sub.current_period_end and sub.current_period_end < now:
                sub.videos_used_this_period = 0
                reset_count += 1
        db.commit()
        logger.info(f"Reset video counts for {reset_count} subscriptions")
    finally:
        db.close()
