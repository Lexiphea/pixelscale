from sqlalchemy.orm import Session

from .models import Image, ImageStatus, User
from .services.auth import get_password_hash


# User CRUD operations
def create_user(db: Session, username: str, password: str, email: str | None = None) -> User:
    hashed_password = get_password_hash(password)
    user = User(
        username=username,
        email=email,
        hashed_password=hashed_password,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


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
    image = Image(
        filename=filename,
        s3_key_raw=s3_key_raw,
        status=ImageStatus.PENDING,
        user_id=user_id,
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
