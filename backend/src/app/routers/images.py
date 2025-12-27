import uuid
from pathlib import Path

from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from .. import crud
from ..config import get_settings
from ..database import get_db
from ..logging_config import get_logger
from ..models import User
from ..schemas import (
    FilterType,
    ImageFormat,
    ImageProcessingOptions,
    ImageResponse,
    ImageUploadResponse,
)
from ..services import s3
from ..services.auth import get_current_user, get_current_user_from_token
from ..services.image_processor import process_image

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["Images"])
settings = get_settings()

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
}


def _extract_processed_key(s3_url_processed: str) -> str:
    """Extract the S3 key from a processed URL (works for both local and S3 URLs)."""
    if s3_url_processed.startswith("/uploads/"):
        return s3_url_processed.replace("/uploads/", "")
    # For S3 URLs, extract everything after the bucket domain
    # URL format: https://{bucket}.s3.{region}.amazonaws.com/{key}
    if ".amazonaws.com/" in s3_url_processed:
        return s3_url_processed.split(".amazonaws.com/", 1)[1]
    # Fallback: return as-is
    return s3_url_processed


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
    current_user: User = Depends(get_current_user),
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

    image = crud.create_image(
        db, filename=original_filename, s3_key_raw=raw_key, user_id=current_user.id
    )

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
        crud.update_image_processed(db, image.id, processed_url, options.model_dump())
        url = processed_url
    else:
        crud.update_image_failed(db, image.id)
        url = s3.get_public_url(settings.s3_bucket_raw, raw_key)

    return ImageUploadResponse(
        id=image.id,
        user_index=image.user_index,
        filename=original_filename,
        url=url,
        options_applied=options,
    )


@router.post("/process/{image_id}", response_model=ImageUploadResponse)
async def reprocess_image(
    image_id: int,
    options: ImageProcessingOptions = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image = crud.get_image(db, image_id, user_id=current_user.id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    result = process_image(image.s3_key_raw, options=options)
    if result:
        processed_key, processed_url = result
        crud.update_image_processed(db, image.id, processed_url, options.model_dump())
        return ImageUploadResponse(
            id=image.id,
            user_index=image.user_index,
            filename=image.filename,
            url=processed_url,
            original_url=s3.get_public_url(settings.s3_bucket_raw, image.s3_key_raw),
            options_applied=options,
        )

    raise HTTPException(status_code=500, detail="Failed to process image")


@router.get("/images", response_model=list[ImageResponse])
async def get_images(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ImageResponse]:
    images = crud.get_images(db, user_id=current_user.id, skip=skip, limit=limit)
    return [
        ImageResponse.from_orm_with_url(
            img,
            img.s3_url_processed,
            original_url=s3.get_public_url(settings.s3_bucket_raw, img.s3_key_raw),
        )
        for img in images
    ]


@router.get("/images/favorites", response_model=list[ImageResponse])
async def get_favorite_images(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ImageResponse]:
    images = crud.get_favorite_images(db, user_id=current_user.id, skip=skip, limit=limit)
    return [
        ImageResponse.from_orm_with_url(
            img,
            img.s3_url_processed,
            original_url=s3.get_public_url(settings.s3_bucket_raw, img.s3_key_raw),
        )
        for img in images
    ]


@router.patch("/images/{image_id}/favorite", response_model=ImageResponse)
async def toggle_favorite(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image = crud.toggle_favorite(db, image_id, user_id=current_user.id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    return ImageResponse.from_orm_with_url(
        image,
        image.s3_url_processed,
        original_url=s3.get_public_url(settings.s3_bucket_raw, image.s3_key_raw),
    )


@router.get("/images/{image_id}", response_model=ImageResponse)
async def get_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image = crud.get_image(db, image_id, user_id=current_user.id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    return ImageResponse.from_orm_with_url(
        image,
        image.s3_url_processed,
        original_url=s3.get_public_url(settings.s3_bucket_raw, image.s3_key_raw),
    )


@router.delete("/images/{image_id}")
async def delete_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image = crud.get_image(db, image_id, user_id=current_user.id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    if image.s3_key_raw:
        s3.delete_file_from_s3(settings.s3_bucket_raw, image.s3_key_raw)
    if image.s3_url_processed:
        processed_key = _extract_processed_key(image.s3_url_processed)
        s3.delete_file_from_s3(settings.s3_bucket_processed, processed_key)

    crud.delete_image(db, image_id, user_id=current_user.id)
    return {"message": "Image deleted", "id": image_id}


@router.get("/images/{image_id}/download")
async def download_image(
    image_id: int,
    version: str = Query("original", pattern="^(original|edited)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    image = crud.get_image(db, image_id, user_id=current_user.id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Cache headers for immutable image assets (1 year)
    cache_headers = {"Cache-Control": "public, max-age=31536000, immutable"}

    if version == "edited" and image.s3_url_processed:
        # Download processed/edited version
        processed_key = _extract_processed_key(image.s3_url_processed)
        filename_base = Path(image.filename).stem
        filename_ext = Path(processed_key).suffix or ".jpg"
        download_filename = f"{filename_base}_edited{filename_ext}"

        if settings.use_local_storage:
            path = Path(settings.local_storage_path) / processed_key
            if not path.exists():
                raise HTTPException(status_code=404, detail="Processed file not found")
            return FileResponse(path, filename=download_filename, headers=cache_headers)

        url = s3.generate_presigned_download_url(
            settings.s3_bucket_processed,
            processed_key,
            download_filename
        )
    else:
        # Download original version
        if settings.use_local_storage:
            path = Path(settings.local_storage_path) / image.s3_key_raw
            if not path.exists():
                raise HTTPException(status_code=404, detail="File not found on server")
            return FileResponse(path, filename=image.filename, headers=cache_headers)

        url = s3.generate_presigned_download_url(
            settings.s3_bucket_raw,
            image.s3_key_raw,
            image.filename
        )

    if not url:
        raise HTTPException(status_code=500, detail="Failed to generate download URL")

    return RedirectResponse(url)

