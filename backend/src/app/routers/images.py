import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import crud
from ..config import get_settings
from ..database import get_db
from ..schemas import ImageResponse, ImageUploadResponse
from ..services import s3
from ..services.image_processor import process_image

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Images"])
settings = get_settings()

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
}


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> ImageUploadResponse:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_CONTENT_TYPES)}",
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    original_filename = file.filename or "unknown"
    ext = Path(original_filename).suffix or ".jpg"
    unique_id = uuid.uuid4().hex[:12]
    raw_key = f"raw/{unique_id}{ext}"

    success = s3.upload_file_to_s3(
        content,
        settings.s3_bucket_raw,
        raw_key,
        content_type=file.content_type or "image/jpeg",
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to upload image to storage")

    image = crud.create_image(db, filename=original_filename, s3_key_raw=raw_key)

    result = process_image(raw_key)
    if result:
        processed_key, processed_url = result
        crud.update_image_processed(db, image.id, processed_url)
        url = processed_url
    else:
        crud.update_image_failed(db, image.id)
        url = s3.get_public_url(settings.s3_bucket_raw, raw_key)

    return ImageUploadResponse(
        id=image.id,
        filename=original_filename,
        url=url,
    )


@router.get("/images", response_model=list[ImageResponse])
async def get_images(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
) -> list[ImageResponse]:
    images = crud.get_images(db, skip=skip, limit=limit)
    return [
        ImageResponse.from_orm_with_url(img, img.s3_url_processed)
        for img in images
    ]
