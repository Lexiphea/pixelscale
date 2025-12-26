"""Share link router for public image sharing."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import crud
from ..config import get_settings
from ..database import get_db
from ..models import User
from ..schemas import ShareDuration, ShareLinkCreate, ShareLinkResponse, SharedImageResponse, ShareLinkListItem
from ..services.auth import get_current_user
from ..services import s3

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Share"])
settings = get_settings()


@router.post("/share", response_model=ShareLinkResponse)
def create_share_link(
    data: ShareLinkCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a shareable link for an image."""
    # Verify user owns the image
    image = crud.get_image(db, data.image_id, current_user.id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Create share link
    share_link = crud.create_share_link(db, data.image_id, data.duration.value)

    # Build share URL
    base_url = str(request.base_url).rstrip("/")
    share_url = f"{base_url}/api/s/{share_link.id}"

    return ShareLinkResponse(
        share_id=share_link.id,
        share_url=share_url,
        expires_at=share_link.expires_at,
    )


@router.get("/share/list", response_model=list[ShareLinkListItem])
def list_share_links(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all share links for the current user."""
    share_links = crud.get_share_links_by_user(db, current_user.id)
    base_url = str(request.base_url).rstrip("/")
    
    result = []
    for link in share_links:
        image = link.image
        # Get image URL for thumbnail
        if settings.use_local_storage:
            image_url = image.s3_url_processed or f"/uploads/{image.s3_key_raw}"
        else:
            image_url = s3.generate_presigned_url(
                settings.s3_bucket_processed,
                image.s3_url_processed or image.s3_key_raw,
                expiration=3600,
            )
        
        result.append(ShareLinkListItem(
            share_id=link.id,
            image_id=image.id,
            image_filename=image.filename,
            image_url=image_url,
            share_url=f"{base_url}/api/s/{link.id}",
            expires_at=link.expires_at,
            created_at=link.created_at,
            is_expired=link.is_expired(),
        ))
    
    return result


@router.get("/s/{share_id}", response_model=SharedImageResponse)
def get_shared_image(
    share_id: str,
    db: Session = Depends(get_db),
):
    """
    Public endpoint to access a shared image.
    No authentication required.
    """
    share_link = crud.get_share_link(db, share_id)

    if not share_link:
        raise HTTPException(status_code=404, detail="Share link not found")

    if share_link.is_expired():
        raise HTTPException(status_code=410, detail="Share link has expired")

    image = share_link.image
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Generate presigned URL for the image
    # Use processed image if available, otherwise raw
    s3_key = image.s3_url_processed or image.s3_key_raw
    
    # For local storage, s3_url_processed already contains the local path
    if settings.use_local_storage:
        image_url = s3_key if s3_key.startswith("/") else f"/uploads/{s3_key}"
    else:
        # For S3, generate presigned URL
        # Use a reasonable expiration (1 hour) for the presigned URL
        image_url = s3.generate_presigned_url(
            settings.s3_bucket_processed,
            s3_key,
            expiration=3600,
        )
        if not image_url:
            raise HTTPException(status_code=500, detail="Failed to generate image URL")

    return SharedImageResponse(
        image_url=image_url,
        filename=image.filename,
        expires_at=share_link.expires_at,
    )


@router.delete("/share/{share_id}")
def delete_share_link(
    share_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete/revoke a share link. Only the owner can delete."""
    success = crud.delete_share_link(db, share_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Share link not found")
    return {"message": "Share link deleted"}
