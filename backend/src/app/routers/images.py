import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from .. import crud
from ..config import get_settings
from ..database import get_db
from ..schemas import (
    FilterType,
    ImageFormat,
    ImageProcessingOptions,
    ImageResponse,
    ImageUploadResponse,
)
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
    "image/avif",
}


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    width: int | None = Query(None, ge=1, le=4096),
    height: int | None = Query(None, ge=1, le=4096),
    preset: str | None = Query(None),
    maintain_aspect: bool = Query(True),
    crop_x: int | None = Query(None, ge=0),
    crop_y: int | None = Query(None, ge=0),
    crop_width: int | None = Query(None, ge=1),
    crop_height: int | None = Query(None, ge=1),
    rotate: int = Query(0, ge=0, le=360),
    flip_horizontal: bool = Query(False),
    flip_vertical: bool = Query(False),
    filter: FilterType = Query(FilterType.NONE),
    brightness: int = Query(0, ge=-100, le=100),
    contrast: int = Query(0, ge=-100, le=100),
    saturation: int = Query(0, ge=-100, le=100),
    format: ImageFormat = Query(ImageFormat.JPEG),
    quality: int = Query(85, ge=1, le=100),
    db: Session = Depends(get_db),
):
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

    options = ImageProcessingOptions(
        width=width,
        height=height,
        preset=preset or "medium",
        maintain_aspect=maintain_aspect,
        crop_x=crop_x,
        crop_y=crop_y,
        crop_width=crop_width,
        crop_height=crop_height,
        rotate=rotate,
        flip_horizontal=flip_horizontal,
        flip_vertical=flip_vertical,
        filter=filter,
        brightness=brightness,
        contrast=contrast,
        saturation=saturation,
        format=format,
        quality=quality,
    )

    result = process_image(raw_key, options=options)
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
        options_applied=options,
    )


@router.post("/process/{image_id}", response_model=ImageUploadResponse)
async def reprocess_image(
    image_id: int,
    options: ImageProcessingOptions = Body(...),
    db: Session = Depends(get_db),
):
    image = crud.get_image(db, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    result = process_image(image.s3_key_raw, options=options)
    if result:
        processed_key, processed_url = result
        crud.update_image_processed(db, image.id, processed_url)
        return ImageUploadResponse(
            id=image.id,
            filename=image.filename,
            url=processed_url,
            options_applied=options,
        )

    raise HTTPException(status_code=500, detail="Failed to process image")


@router.get("/images", response_model=list[ImageResponse])
async def get_images(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
) -> list[ImageResponse]:
    images = crud.get_images(db, skip=skip, limit=limit)
    return [ImageResponse.from_orm_with_url(img, img.s3_url_processed) for img in images]


@router.get("/images/{image_id}", response_model=ImageResponse)
async def get_image(
    image_id: int,
    db: Session = Depends(get_db),
):
    image = crud.get_image(db, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return ImageResponse.from_orm_with_url(image, image.s3_url_processed)


@router.delete("/images/{image_id}")
async def delete_image(
    image_id: int,
    db: Session = Depends(get_db),
):
    deleted = crud.delete_image(db, image_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"message": "Image deleted", "id": image_id}
