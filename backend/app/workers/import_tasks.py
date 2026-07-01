import os
import tempfile
import urllib.request
from typing import Any, Dict
from sqlalchemy.orm import Session
from celery.utils.log import get_task_logger

from app.workers.celery_app import celery_app
from app.core.config import settings
from app.models.content import ImportJob, ImportJobStatus
from app.models.project import Project, ProjectStatus
from app.services.import_service import ImportService
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

logger = get_task_logger(__name__)

def _get_sync_db() -> Session:
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = create_engine(sync_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()

@celery_app.task(bind=True, max_retries=3)
def process_import_task(self, import_job_id: int):
    db = _get_sync_db()
    try:
        logger.info(f"Processing import job {import_job_id}")
        job = db.query(ImportJob).filter(ImportJob.id == import_job_id).first()
        if not job:
            logger.error(f"Import job {import_job_id} not found")
            return

        job.status = ImportJobStatus.processing
        db.commit()

        # Download file to temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(job.file_name)[1]) as temp_file:
            # If the file_url is local for testing, we might need a workaround, but for production it's S3 HTTP URL
            try:
                # Basic download. In a real app, use boto3 if it's an s3:// URL or requests if http://
                if job.file_url.startswith("http"):
                    urllib.request.urlretrieve(job.file_url, temp_file.name)
                else:
                    # Assume it's a local path for testing
                    import shutil
                    shutil.copy(job.file_url, temp_file.name)
            except Exception as e:
                logger.error(f"Could not download file from {job.file_url}: {e}")
                raise ValueError(f"File download failed: {e}")

            temp_path = temp_file.name

        try:
            # Parse the file
            parsed_content = ImportService.parse_file(temp_path, job.file_type)
            job.parsed_content = parsed_content
            
            # Create a Project automatically
            new_project = Project(
                title=parsed_content.get("title", f"Imported: {job.file_name}"),
                description="Imported automatically from file.",
                scenes=parsed_content.get("scenes", []),
                status=ProjectStatus.draft,
                owner_id=job.user_id,
                workspace_id=job.workspace_id
            )
            db.add(new_project)
            db.commit()
            db.refresh(new_project)

            job.project_id = new_project.id
            job.status = ImportJobStatus.completed
            db.commit()
            logger.info(f"Successfully processed import job {import_job_id}, created project {new_project.id}")

        except Exception as e:
            logger.error(f"Parsing failed for job {import_job_id}: {e}")
            job.status = ImportJobStatus.failed
            job.error_message = str(e)
            db.commit()
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except Exception as exc:
        logger.error(f"Task failed with exception: {exc}")
        job = db.query(ImportJob).filter(ImportJob.id == import_job_id).first()
        if job:
            job.status = ImportJobStatus.failed
            job.error_message = str(exc)
            db.commit()
        self.retry(exc=exc, countdown=2 ** self.request.retries)
    finally:
        db.close()
