import logging
from sqlalchemy.orm import Session
from celery.utils.log import get_task_logger

from app.workers.celery_app import celery_app
from app.core.config import settings
from app.models.content import VideoTranslation, TranslationStatus
from app.models.video import Video
from app.services.translation_service import TranslationService
from app.services.glossary_service import GlossaryService
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

logger = get_task_logger(__name__)

def _get_sync_db() -> Session:
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = create_engine(sync_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()

@celery_app.task(bind=True, max_retries=3)
def translate_video_task(self, translation_id: int):
    db = _get_sync_db()
    try:
        logger.info(f"Processing translation {translation_id}")
        translation = db.query(VideoTranslation).filter(VideoTranslation.id == translation_id).first()
        if not translation:
            logger.error(f"Translation {translation_id} not found")
            return

        translation.status = TranslationStatus.processing
        db.commit()

        video = db.query(Video).filter(Video.id == translation.video_id).first()
        if not video:
            raise ValueError("Associated video not found")

        # 1. Get original script (assuming it's stored in project or video itself)
        # Assuming project script is used
        project = video.project
        original_script = project.script if project else ""
        if not original_script:
            raise ValueError("No script found to translate")

        # 2. Get glossary rules and apply them to the script before translation
        glossaries = GlossaryService.get_glossary_for_workspace(db, translation.workspace_id)
        prepared_script = GlossaryService.apply_glossary_rules(original_script, glossaries)

        # 3. Translate using TranslationService
        translator = TranslationService()
        translated_script = translator.translate_text(
            prepared_script, 
            target_language=translation.target_language,
            source_language=translation.source_language if translation.source_language else None
        )

        translation.translated_script = translated_script
        translation.status = TranslationStatus.completed
        db.commit()
        logger.info(f"Successfully processed translation {translation_id}")

        # Note: In a complete workflow, we would now queue a task to render the translated video,
        # perhaps by creating a new video record or updating an existing one, 
        # and calling `render_video_task`.

    except Exception as exc:
        logger.error(f"Translation Task failed with exception: {exc}")
        translation = db.query(VideoTranslation).filter(VideoTranslation.id == translation_id).first()
        if translation:
            translation.status = TranslationStatus.failed
            translation.error_message = str(exc)
            db.commit()
        self.retry(exc=exc, countdown=2 ** self.request.retries)
    finally:
        db.close()
