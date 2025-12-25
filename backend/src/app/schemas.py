from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ImageFormat(str, Enum):
    JPEG = "jpeg"
    PNG = "png"
    WEBP = "webp"


class FilterType(str, Enum):
    NONE = "none"
    GRAYSCALE = "grayscale"
    SEPIA = "sepia"
    BLUR = "blur"
    SHARPEN = "sharpen"
    CONTOUR = "contour"
    EMBOSS = "emboss"


class ImageProcessingOptions(BaseModel):
    width: int | None = Field(None, ge=1, le=4096)
    height: int | None = Field(None, ge=1, le=4096)
    preset: str | None = None
    maintain_aspect: bool = True

    crop_x: int | None = Field(None, ge=0)
    crop_y: int | None = Field(None, ge=0)
    crop_width: int | None = Field(None, ge=1)
    crop_height: int | None = Field(None, ge=1)

    rotate: int = Field(0, ge=0, le=360)
    flip_horizontal: bool = False
    flip_vertical: bool = False

    filter: FilterType = FilterType.NONE

    brightness: int = Field(0, ge=-100, le=100)
    contrast: int = Field(0, ge=-100, le=100)
    saturation: int = Field(0, ge=-100, le=100)

    format: ImageFormat = ImageFormat.JPEG
    quality: int = Field(85, ge=1, le=100)


class ImageBase(BaseModel):
    filename: str


class ImageCreate(ImageBase):
    s3_key_raw: str


class ImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_index: int
    filename: str
    url: str | None = None
    original_url: str | None = None
    options: ImageProcessingOptions | None = None
    uploaded_at: datetime

    @classmethod
    def from_orm_with_url(cls, image, url: str | None = None, original_url: str | None = None) -> "ImageResponse":
        return cls(
            id=image.id,
            user_index=image.user_index,
            filename=image.filename,
            url=url or image.s3_url_processed,
            original_url=original_url,
            options=ImageProcessingOptions(**image.options) if image.options else None,
            uploaded_at=image.upload_date,
        )


class ImageUploadResponse(BaseModel):
    id: int
    user_index: int
    filename: str
    url: str | None = None
    original_url: str | None = None
    options_applied: ImageProcessingOptions | None = None


class HealthResponse(BaseModel):
    status: str = "healthy"


class StressResponse(BaseModel):
    message: str
    duration_seconds: int


# Authentication Schemas
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
