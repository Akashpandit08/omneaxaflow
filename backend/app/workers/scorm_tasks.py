import os
from app.models.advanced import SCORMPackage, Quiz
from app.models.video import Video
from app.services.scorm_service import SCORMService
from app.services.storage import upload_file
from app.core.config import settings

def _get_sync_db():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = create_engine(sync_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    return Session()

def generate_scorm_package_task(package_id: int):
    """Celery task to generate SCORM package asynchronously."""
    db = _get_sync_db()
    zip_path = None
    package = db.query(SCORMPackage).filter(SCORMPackage.id == package_id).first()
    
    if not package:
        db.close()
        return

    try:
        package.status = "processing"
        db.commit()
        
        video = db.query(Video).filter(Video.id == package.video_id).first()
        quizzes = db.query(Quiz).filter(Quiz.video_id == package.video_id).all()
        
        if not video:
            raise RuntimeError("Video not found for SCORM package.")
        if not video.export_url:
            raise RuntimeError("SCORM export requires a completed video with export_url.")

        service = SCORMService()
        
        # Build local zip
        zip_path = service.build_package(
            video_id=video.id,
            video_url=video.export_url,
            title=video.title,
            quizzes=[{"id": q.id, "title": q.title} for q in quizzes],
            version=package.package_version
        )
        
        settings.require_s3_configured()
        s3_key = f"workspaces/{package.workspace_id}/scorm/{package.id}/package.zip"
        upload_file(zip_path, s3_key, content_type="application/zip")
        package.zip_url = s3_key
        package.status = "ready"
        db.commit()
        
    except Exception as e:
        print(f"Failed to generate SCORM package {package_id}: {e}")
        package.status = "failed"
        db.commit()
    finally:
        if zip_path and os.path.exists(zip_path):
            os.remove(zip_path)
        db.close()
