"""Share link router for public image sharing."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import crud
from ..config import get_settings
from ..database import get_db
from ..logging_config import get_logger
from ..models import User
from ..schemas import ShareDuration, ShareLinkCreate, ShareLinkResponse, SharedImageResponse, ShareLinkListItem
from ..services.auth import get_current_user
from ..services import s3

logger = get_logger(__name__)
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

    # Create share link with version
    share_link = crud.create_share_link(db, data.image_id, data.duration.value, data.version.value)

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
            # For S3, extract just the key from the full URL
            if image.s3_url_processed:
                s3_url = image.s3_url_processed
                logger.debug(f"[list_share_links] Processing s3_url_processed: {s3_url}")
                if s3_url.startswith("https://"):
                    parts = s3_url.split(".amazonaws.com/", 1)
                    s3_key = parts[1] if len(parts) == 2 else s3_url.split("/", 3)[-1]
                else:
                    s3_key = s3_url
                bucket = settings.s3_bucket_processed
            else:
                s3_key = image.s3_key_raw
                bucket = settings.s3_bucket_raw
            
            logger.debug(f"[list_share_links] Extracted S3 key: {s3_key}, bucket: {bucket}")
            
            image_url = s3.generate_presigned_url(
                bucket,
                s3_key,
                expiration=3600,
            )
            logger.debug(f"[list_share_links] Generated presigned URL: {image_url[:100] if image_url else 'None'}...")
        
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
    logger.debug(f"[get_shared_image] Fetching share link: {share_id}")
    share_link = crud.get_share_link(db, share_id)

    if not share_link:
        logger.debug(f"[get_shared_image] Share link not found: {share_id}")
        raise HTTPException(status_code=404, detail="Share link not found")

    if share_link.is_expired():
        logger.debug(f"[get_shared_image] Share link expired: {share_id}")
        raise HTTPException(status_code=410, detail="Share link has expired")

    image = share_link.image
    if not image:
        logger.debug(f"[get_shared_image] Image not found for share link: {share_id}")
        raise HTTPException(status_code=404, detail="Image not found")
    
    logger.debug(f"[get_shared_image] Found image id={image.id}, s3_key_raw={image.s3_key_raw}, s3_url_processed={image.s3_url_processed}")

    # Generate presigned URL for the image
    # Use processed image if available, otherwise raw
    
    # Determine which image version to share based on stored version
    use_edited = share_link.version == "edited"
    
    # For local storage
    if settings.use_local_storage:
        if use_edited and image.s3_url_edited:
            s3_key = image.s3_url_edited
        elif use_edited and image.s3_url_processed:
            s3_key = image.s3_url_processed
        else:
            s3_key = image.s3_key_raw
        image_url = s3_key if s3_key.startswith("/") else f"/uploads/{s3_key}"
    else:
        # For S3 - choose version based on share link setting
        if use_edited and image.s3_url_edited:
            # Use edited version (full quality edits)
            s3_url = image.s3_url_edited
            logger.debug(f"[get_shared_image] Using edited version: {s3_url}")
            if s3_url.startswith("https://"):
                parts = s3_url.split(".amazonaws.com/", 1)
                s3_key = parts[1] if len(parts) == 2 else s3_url.split("/", 3)[-1]
            else:
                s3_key = s3_url
            bucket = settings.s3_bucket_processed
        elif use_edited and image.s3_url_processed:
            # Fallback to display version if no edited version
            s3_url = image.s3_url_processed
            logger.debug(f"[get_shared_image] Using processed version: {s3_url}")
            if s3_url.startswith("https://"):
                parts = s3_url.split(".amazonaws.com/", 1)
                s3_key = parts[1] if len(parts) == 2 else s3_url.split("/", 3)[-1]
            else:
                s3_key = s3_url
            bucket = settings.s3_bucket_processed
        else:
            # Use original version
            s3_key = image.s3_key_raw
            bucket = settings.s3_bucket_raw
            logger.debug(f"[get_shared_image] Using original version: {s3_key}")
        
        logger.debug(f"[get_shared_image] Generating presigned URL for bucket={bucket}, key={s3_key}")
        
        # Generate presigned URL with the extracted key
        image_url = s3.generate_presigned_url(
            bucket,
            s3_key,
            expiration=3600,
        )
        
        if not image_url:
            logger.error(f"[get_shared_image] Failed to generate presigned URL for bucket={bucket}, key={s3_key}")
            raise HTTPException(status_code=500, detail="Failed to generate image URL")
        
        logger.debug(f"[get_shared_image] Generated presigned URL successfully (length={len(image_url)})")

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
