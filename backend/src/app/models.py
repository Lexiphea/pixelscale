import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class ImageStatus(enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class User(Base):
    """
    User model with encrypted username storage.
    The username field stores a SHA256 hash for privacy.
    Login works by hashing the input username and comparing.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # Stores hashed username (SHA256 = 64 chars)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True, default=None)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    images: Mapped[list["Image"]] = relationship("Image", back_populates="owner")

    def __repr__(self) -> str:
        # Only show first 12 chars of hashed username for security
        return f"<User(id={self.id}, username_hash={self.username[:12]}...)>"


class Image(Base):
    __tablename__ = "images"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_index: Mapped[int] = mapped_column(nullable=False, default=1)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    s3_key_raw: Mapped[str] = mapped_column(String(255), nullable=False)
    s3_url_processed: Mapped[str | None] = mapped_column(String(512), nullable=True)
    s3_url_edited: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[ImageStatus] = mapped_column(
        Enum(ImageStatus), default=ImageStatus.PENDING
    )
    upload_date: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    options: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    owner: Mapped["User"] = relationship("User", back_populates="images")

    def __repr__(self) -> str:
        return f"<Image(id={self.id}, filename={self.filename}, status={self.status})>"


class ShareLink(Base):
    """Shareable link for public access to an image with optional expiration."""
    __tablename__ = "share_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    image_id: Mapped[int] = mapped_column(
        ForeignKey("images.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[str] = mapped_column(String(10), default="edited")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # null = never expires
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    image: Mapped["Image"] = relationship("Image")

    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        # Handle both naive (SQLite) and aware datetimes
        now = datetime.now(timezone.utc)
        expires = self.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return now > expires

    def __repr__(self) -> str:
        return f"<ShareLink(id={self.id}, image_id={self.image_id}, expires_at={self.expires_at})>"
