import os
import boto3
from app.db.session import SessionLocal
from app.models.advanced import SCORMPackage, Quiz
from app.models.project import Video
from app.services.scorm_service import SCORMService
from app.core.config import settings

def _get_sync_db():
    return SessionLocal()

def generate_scorm_package_task(package_id: int):
    """Celery task to generate SCORM package asynchronously."""
    db = _get_sync_db()
    package = db.query(SCORMPackage).filter(SCORMPackage.id == package_id).first()
    
    if not package:
        db.close()
        return

    try:
        package.status = "processing"
        db.commit()
        
        video = db.query(Video).filter(Video.id == package.video_id).first()
        quizzes = db.query(Quiz).filter(Quiz.video_id == package.video_id).all()
        
        service = SCORMService()
        
        # Build local zip
        zip_path = service.build_package(
            video_id=video.id,
            video_url=video.export_url or "mock_url.mp4",
            title=video.title,
            quizzes=[{"id": q.id, "title": q.title} for q in quizzes],
            version=package.package_version
        )
        
        # Upload to S3
        if hasattr(settings, "AWS_ACCESS_KEY_ID") and settings.AWS_ACCESS_KEY_ID:
            s3 = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "mock-bucket")
            s3_key = f"scorm/{package.workspace_id}/{package.id}.zip"
            s3.upload_file(zip_path, bucket, s3_key)
            package.zip_url = f"https://{bucket}.s3.amazonaws.com/{s3_key}"
        else:
            package.zip_url = f"mock-s3-url/scorm/{package.id}.zip"
            
        package.status = "ready"
        db.commit()
        
        # Cleanup temp file
        if os.path.exists(zip_path):
            os.remove(zip_path)
            
    except Exception as e:
        print(f"Failed to generate SCORM package {package_id}: {e}")
        package.status = "failed"
        db.commit()
    finally:
        db.close()
