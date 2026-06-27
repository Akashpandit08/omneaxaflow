"""
AWS S3 storage service — upload, download, presigned URLs.
"""

import os
from typing import Tuple

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

_s3_client = None


def get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
    return _s3_client


def upload_file(local_path: str, s3_key: str, content_type: str = "application/octet-stream") -> str:
    """Upload a local file to S3 and return the S3 key."""
    client = get_s3_client()
    client.upload_file(
        local_path,
        settings.S3_BUCKET_NAME,
        s3_key,
        ExtraArgs={"ContentType": content_type},
    )
    return s3_key


def upload_bytes(data: bytes, s3_key: str, content_type: str = "application/octet-stream") -> str:
    """Upload raw bytes to S3."""
    client = get_s3_client()
    client.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=s3_key,
        Body=data,
        ContentType=content_type,
    )
    return s3_key


def get_presigned_download_url(s3_key: str) -> Tuple[str, int]:
    """Return a presigned download URL and its expiry in seconds."""
    client = get_s3_client()
    expiry = settings.S3_PRESIGNED_URL_EXPIRY
    url = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
        ExpiresIn=expiry,
    )
    return url, expiry


def get_presigned_upload_url(s3_key: str, content_type: str = "video/mp4") -> str:
    """Return a presigned PUT URL for direct client-side uploads."""
    client = get_s3_client()
    return client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.S3_BUCKET_NAME,
            "Key": s3_key,
            "ContentType": content_type,
        },
        ExpiresIn=300,  # 5 minutes
    )


def delete_object(s3_key: str) -> None:
    """Remove an object from S3."""
    client = get_s3_client()
    try:
        client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
    except ClientError:
        pass  # Best-effort deletion


def object_exists(s3_key: str) -> bool:
    """Check if an S3 object exists."""
    client = get_s3_client()
    try:
        client.head_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
        return True
    except ClientError:
        return False
