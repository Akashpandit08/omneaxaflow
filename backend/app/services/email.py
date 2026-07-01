import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_video_ready_email(to_email: str, project_title: str) -> None:
    if not settings.SENDGRID_API_KEY:
        logger.debug("SENDGRID_API_KEY is unset; skipping video ready email")
        return

    try:
        from sendgrid.helpers.mail import Mail

        message = Mail(
            from_email=settings.SENDGRID_FROM_EMAIL,
            to_emails=to_email,
            subject=f"Your OmneaxaFlow video is ready: {project_title}",
            plain_text_content=(
                f"Your video for '{project_title}' has finished rendering and is ready to view."
            ),
        )
        _send(message)
    except Exception:
        logger.exception("Failed to send video ready email")


def send_video_failed_email(to_email: str, project_title: str, error_message: str) -> None:
    if not settings.SENDGRID_API_KEY:
        logger.debug("SENDGRID_API_KEY is unset; skipping video failed email")
        return

    try:
        from sendgrid.helpers.mail import Mail

        message = Mail(
            from_email=settings.SENDGRID_FROM_EMAIL,
            to_emails=to_email,
            subject=f"Your OmneaxaFlow video failed: {project_title}",
            plain_text_content=(
                f"Your video for '{project_title}' could not be rendered.\n\n"
                f"Error: {error_message}"
            ),
        )
        _send(message)
    except Exception:
        logger.exception("Failed to send video failed email")


def _send(message) -> None:
    try:
        import sendgrid

        sendgrid.SendGridAPIClient(settings.SENDGRID_API_KEY).send(message)
    except Exception:
        logger.exception("Failed to send SendGrid email")
