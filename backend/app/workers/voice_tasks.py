import logging
from celery import shared_task
from app.models.advanced import VoiceClone
from app.services.voice.providers.factory import VoiceProviderFactory
from app.core.config import settings

logger = logging.getLogger(__name__)

def _get_sync_db():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = create_engine(sync_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    return Session()

@shared_task(name='app.workers.voice_tasks.train_voice_clone_task')
def train_voice_clone_task(clone_id: int):
    """Celery task to train voice clone asynchronously."""
    db = _get_sync_db()
    clone = db.query(VoiceClone).filter(VoiceClone.id == clone_id).first()
    
    if not clone:
        db.close()
        return

    logger.info("Task received")
    
    try:
        clone.status = "training"
        db.commit()

        # Init provider
        provider = VoiceProviderFactory.get(clone.provider)
        
        if not clone.sample_audio_url.startswith("/media/"):
            raise RuntimeError("Voice clone sample path is invalid.")
        relative_media_path = clone.sample_audio_url.removeprefix("/media/")
        local_file_path = f"{settings.LOCAL_STORAGE_PATH.rstrip('/')}/{relative_media_path}"
        
        logger.info("Uploading audio")
        
        # Train
        provider_voice_id = provider.clone_voice(
            name=clone.name,
            file_path=local_file_path,
            description=f"Cloned via AiVideo ({clone.provider})"
        )
        
        logger.info("Voice clone created")
        clone.provider_voice_id = provider_voice_id
        clone.provider_status = "ready"
        clone.provider_error = None
        
        # Generate preview
        preview_url = provider.generate_preview(provider_voice_id)
        if not preview_url:
            raise RuntimeError("Voice preview generation did not return a URL.")
        clone.preview_url = preview_url
        clone.status = "ready"
        logger.info("Database updated")
        db.commit()
    except Exception as e:
        logger.exception(f"Voice clone failed for {clone.provider}: {str(e)}")
        clone.status = "failed"
        clone.provider_status = "failed"
        clone.provider_error = str(e)
        db.commit()
    finally:
        db.close()
