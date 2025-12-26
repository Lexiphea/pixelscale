from sqlalchemy import func
from sqlalchemy.orm import Session

from .logging_config import get_logger
from .models import Image, ImageStatus, User
from .services.auth import get_password_hash, hash_username, get_username_display

logger = get_logger(__name__)


# User CRUD operations
def create_user(db: Session, username: str, password: str, email: str | None = None) -> User:
    """Create a new user with hashed username and password."""
    hashed_password = get_password_hash(password)
    hashed_username = hash_username(username)
    
    user = User(
        username=hashed_username,  # Store hashed username
        email=email,
        hashed_password=hashed_password,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    logger.info(f"Created user: {get_username_display(username)}")
    return user


def get_user_by_username(db: Session, username: str) -> User | None:
    """Find user by username (hashes input before lookup)."""
    hashed_username = hash_username(username)
    return db.query(User).filter(User.username == hashed_username).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


# Image CRUD operations (now with user ownership)
def create_image(
    db: Session,
    filename: str,
    s3_key_raw: str,
    user_id: int,
) -> Image:
    max_index = db.query(func.max(Image.user_index)).filter(Image.user_id == user_id).scalar()
    next_index = (max_index or 0) + 1
    
    image = Image(
        filename=filename,
        s3_key_raw=s3_key_raw,
        status=ImageStatus.PENDING,
        user_id=user_id,
        user_index=next_index,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


def get_image(db: Session, image_id: int, user_id: int | None = None) -> Image | None:
    query = db.query(Image).filter(Image.id == image_id)
    if user_id is not None:
        query = query.filter(Image.user_id == user_id)
    return query.first()


def get_images(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> list[Image]:
    return (
        db.query(Image)
        .filter(Image.user_id == user_id)
        .filter(Image.status == ImageStatus.COMPLETED)
        .order_by(Image.upload_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_image_processed(
    db: Session,
    image_id: int,
    s3_url_processed: str,
    options: dict | None = None,
) -> Image | None:
    image = db.query(Image).filter(Image.id == image_id).first()
    if image:
        image.s3_url_processed = s3_url_processed
        image.status = ImageStatus.COMPLETED
        if options:
            image.options = options
        db.commit()
        db.refresh(image)
    return image


def update_image_failed(db: Session, image_id: int) -> Image | None:
    image = db.query(Image).filter(Image.id == image_id).first()
    if image:
        image.status = ImageStatus.FAILED
        db.commit()
        db.refresh(image)
    return image


def delete_image(db: Session, image_id: int, user_id: int) -> bool:
    image = get_image(db, image_id, user_id)
    if image:
        db.delete(image)
        db.commit()
        return True
    return False


def toggle_favorite(db: Session, image_id: int, user_id: int) -> Image | None:
    image = get_image(db, image_id, user_id)
    if image:
        image.is_favorite = not image.is_favorite
        db.commit()
        db.refresh(image)
    return image


def get_favorite_images(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> list[Image]:
    return (
        db.query(Image)
        .filter(Image.user_id == user_id)
        .filter(Image.status == ImageStatus.COMPLETED)
        .filter(Image.is_favorite == True)
        .order_by(Image.upload_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# Share Link CRUD operations
def create_share_link(
    db: Session,
    image_id: int,
    duration: str,
) -> "ShareLink":
    from datetime import datetime, timedelta, timezone
    from uuid import uuid4
    from .models import ShareLink  # Import here to avoid circular import

    # Calculate expiration based on duration
    expires_at = None
    if duration == "1_day":
        expires_at = datetime.now(timezone.utc) + timedelta(days=1)
    elif duration == "1_week":
        expires_at = datetime.now(timezone.utc) + timedelta(weeks=1)
    # "forever" -> expires_at remains None

    share_link = ShareLink(
        id=str(uuid4()),
        image_id=image_id,
        expires_at=expires_at,
    )
    db.add(share_link)
    db.commit()
    db.refresh(share_link)
    return share_link


def get_share_link(db: Session, share_id: str) -> "ShareLink | None":
    from .models import ShareLink
    return db.query(ShareLink).filter(ShareLink.id == share_id).first()


def get_share_link_by_user(db: Session, share_id: str, user_id: int) -> "ShareLink | None":
    """Get share link only if owned by the specified user."""
    from .models import ShareLink
    return (
        db.query(ShareLink)
        .join(Image)
        .filter(ShareLink.id == share_id)
        .filter(Image.user_id == user_id)
        .first()
    )


def get_share_links_by_user(db: Session, user_id: int) -> list:
    """Get all share links for a user's images."""
    from .models import ShareLink
    return (
        db.query(ShareLink)
        .join(Image)
        .filter(Image.user_id == user_id)
        .order_by(ShareLink.created_at.desc())
        .all()
    )


def delete_share_link(db: Session, share_id: str, user_id: int) -> bool:
    share_link = get_share_link_by_user(db, share_id, user_id)
    if share_link:
        db.delete(share_link)
        db.commit()
        return True
    return False
