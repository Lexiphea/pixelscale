from sqlalchemy.orm import Session

from .models import Image, ImageStatus


def create_image(
    db: Session,
    filename: str,
    s3_key_raw: str,
) -> Image:
    image = Image(
        filename=filename,
        s3_key_raw=s3_key_raw,
        status=ImageStatus.PENDING,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


def get_image(db: Session, image_id: int) -> Image | None:
    return db.query(Image).filter(Image.id == image_id).first()


def get_images(db: Session, skip: int = 0, limit: int = 100) -> list[Image]:
    return (
        db.query(Image)
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
) -> Image | None:
    image = get_image(db, image_id)
    if image:
        image.s3_url_processed = s3_url_processed
        image.status = ImageStatus.COMPLETED
        db.commit()
        db.refresh(image)
    return image


def update_image_failed(db: Session, image_id: int) -> Image | None:
    image = get_image(db, image_id)
    if image:
        image.status = ImageStatus.FAILED
        db.commit()
        db.refresh(image)
    return image


def delete_image(db: Session, image_id: int) -> bool:
    image = get_image(db, image_id)
    if image:
        db.delete(image)
        db.commit()
        return True
    return False
