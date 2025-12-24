from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ImageBase(BaseModel):
    filename: str


class ImageCreate(ImageBase):
    s3_key_raw: str


class ImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    url: str | None = None
    uploaded_at: datetime

    @classmethod
    def from_orm_with_url(cls, image, url: str | None = None) -> "ImageResponse":
        return cls(
            id=image.id,
            filename=image.filename,
            url=url or image.s3_url_processed,
            uploaded_at=image.upload_date,
        )


class ImageUploadResponse(BaseModel):
    id: int
    filename: str
    url: str | None = None


class HealthResponse(BaseModel):
    status: str = "healthy"


class StressResponse(BaseModel):
    message: str
    duration_seconds: int
