from app.services.storage import get_presigned_download_url
from app.core.config import settings

def test_get_presigned_download_url_fallback():
    # If CloudFront is not fully configured, fallback to S3 URL
    # Assuming config doesn't have private key in tests
    url, expiry = get_presigned_download_url("test_key.mp4")
    assert "test_key.mp4" in url
    assert "amazonaws.com" in url or "s3" in url
    assert expiry == settings.S3_PRESIGNED_URL_EXPIRY
