import io
import logging
from pathlib import Path

from PIL import Image as PILImage

from ..config import get_settings
from .s3 import download_file_from_s3, get_public_url, upload_file_to_s3

logger = logging.getLogger(__name__)
settings = get_settings()

PROCESSED_SIZES = {
    "thumbnail": (150, 150),
    "medium": (800, 800),
    "large": (1920, 1920),
}

DEFAULT_SIZE = "medium"


def process_image(
    raw_key: str,
    size: str = DEFAULT_SIZE,
) -> tuple[str, str] | None:
    raw_content = download_file_from_s3(settings.s3_bucket_raw, raw_key)
    if not raw_content:
        logger.error(f"Failed to download raw image: {raw_key}")
        return None

    try:
        img = PILImage.open(io.BytesIO(raw_content))

        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        max_size = PROCESSED_SIZES.get(size, PROCESSED_SIZES[DEFAULT_SIZE])
        img.thumbnail(max_size, PILImage.Resampling.LANCZOS)

        output_buffer = io.BytesIO()
        img.save(output_buffer, format="JPEG", quality=85, optimize=True)
        processed_content = output_buffer.getvalue()

        processed_key = _generate_processed_key(raw_key, size)

        success = upload_file_to_s3(
            processed_content,
            settings.s3_bucket_processed,
            processed_key,
            content_type="image/jpeg",
        )

        if success:
            url = get_public_url(settings.s3_bucket_processed, processed_key)
            return processed_key, url

        return None

    except Exception as e:
        logger.error(f"Failed to process image {raw_key}: {e}")
        return None


def _generate_processed_key(raw_key: str, size: str) -> str:
    path = Path(raw_key)
    stem = path.stem
    return f"processed/{size}/{stem}.jpg"
