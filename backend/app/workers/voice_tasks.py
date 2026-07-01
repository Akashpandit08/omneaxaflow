import asyncio
from app.db.session import SessionLocal
from app.models.advanced import VoiceClone
from app.services.voice_service import VoiceService

def _get_sync_db():
    return SessionLocal()

def train_voice_clone_task(clone_id: int):
    """Celery task to train voice clone asynchronously."""
    db = _get_sync_db()
    clone = db.query(VoiceClone).filter(VoiceClone.id == clone_id).first()
    
    if not clone:
        db.close()
        return

    try:
        clone.status = "training"
        db.commit()

        # Init service
        service = VoiceService()
        
        # Download sample audio if needed, for mock we just pass the URL or mock file path
        # In a real scenario we download sample_audio_url to local temp
        
        # Train
        provider_voice_id = service.train_voice(
            name=clone.name,
            file_path="mock_audio.wav", # Should be downloaded path
            provider=clone.provider
        )
        
        clone.provider_voice_id = provider_voice_id
        
        # Generate preview
        preview_url = service.generate_preview(provider_voice_id, clone.provider)
        clone.preview_url = preview_url
        clone.status = "ready"
        db.commit()
    except Exception as e:
        print(f"Failed to train voice clone {clone_id}: {e}")
        clone.status = "failed"
        db.commit()
    finally:
        db.close()
