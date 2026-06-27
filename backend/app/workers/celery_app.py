"""
Celery application factory.
"""

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "aivideo",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.video_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    result_expires=86400,  # 24 hours
    # Beat schedule for periodic tasks
    beat_schedule={
        "reset-monthly-video-counts": {
            "task": "app.workers.video_tasks.reset_monthly_video_counts",
            "schedule": 3600.0,  # check every hour
        },
    },
)
