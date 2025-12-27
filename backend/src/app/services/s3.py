import io
from functools import lru_cache
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

from ..config import get_settings
from ..logging_config import get_logger

logger = get_logger(__name__)
settings = get_settings()


@lru_cache(maxsize=1)
def get_s3_client():
    return boto3.client("s3", region_name=settings.aws_region)


def upload_file_to_s3(
    file_content: bytes,
    bucket: str,
    key: str,
    content_type: str = "image/jpeg",
    cache_max_age: int = 31536000,  # 1 year default for immutable assets
) -> bool:
    if settings.use_local_storage:
        return _save_locally(file_content, key)

    try:
        s3_client = get_s3_client()
        s3_client.upload_fileobj(
            io.BytesIO(file_content),
            bucket,
            key,
            ExtraArgs={
                "ContentType": content_type,
                "CacheControl": f"public, max-age={cache_max_age}, immutable",
            },
        )
        logger.info(f"Uploaded {key} to {bucket} with cache-control")
        return True
    except ClientError as e:
        logger.error(f"Failed to upload {key} to {bucket}: {e}")
        return False


def download_file_from_s3(bucket: str, key: str) -> bytes | None:
    if settings.use_local_storage:
        return _read_locally(key)

    try:
        s3_client = get_s3_client()
        response = s3_client.get_object(Bucket=bucket, Key=key)
        return response["Body"].read()
    except ClientError as e:
        logger.error(f"Failed to download {key} from {bucket}: {e}")
        return None


def get_public_url(bucket: str, key: str) -> str:
    if settings.use_local_storage:
        return f"/uploads/{key}"

    return f"https://{bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"


def generate_presigned_url(
    bucket: str,
    key: str,
    expiration: int = 3600,
) -> str | None:
    if settings.use_local_storage:
        return f"/uploads/{key}"

    try:
        s3_client = get_s3_client()
        url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expiration,
        )
        return url
    except ClientError as e:
        logger.error(f"Failed to generate presigned URL for {key}: {e}")
        return None


def generate_presigned_download_url(
    bucket: str,
    key: str,
    filename: str,
    expiration: int = 3600,
) -> str | None:
    if settings.use_local_storage:
        return f"/uploads/{key}"

    try:
        s3_client = get_s3_client()
        url = s3_client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": bucket,
                "Key": key,
                "ResponseContentDisposition": f'attachment; filename="{filename}"',
            },
            ExpiresIn=expiration,
        )
        return url
    except ClientError as e:
        logger.error(f"Failed to generate presigned download URL for {key}: {e}")
        return None


def _save_locally(content: bytes, key: str) -> bool:
    try:
        path = Path(settings.local_storage_path) / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        logger.info(f"Saved locally: {path}")
        return True
    except Exception as e:
        logger.error(f"Failed to save locally {key}: {e}")
        return False


def _read_locally(key: str) -> bytes | None:
    try:
        path = Path(settings.local_storage_path) / key
        return path.read_bytes()
    except Exception as e:
        logger.error(f"Failed to read locally {key}: {e}")
        return None


def delete_file_from_s3(bucket: str, key: str) -> bool:
    if settings.use_local_storage:
        return _delete_locally(key)

    try:
        s3_client = get_s3_client()
        s3_client.delete_object(Bucket=bucket, Key=key)
        logger.info(f"Deleted {key} from {bucket}")
        return True
    except ClientError as e:
        logger.error(f"Failed to delete {key} from {bucket}: {e}")
        return False


def _delete_locally(key: str) -> bool:
    try:
        path = Path(settings.local_storage_path) / key
        if path.exists():
            path.unlink()
            logger.info(f"Deleted locally: {path}")
        return True
    except Exception as e:
        logger.error(f"Failed to delete locally {key}: {e}")
        return False
