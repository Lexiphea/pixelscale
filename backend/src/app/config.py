from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite:///./pixelscale.db"

    s3_bucket_raw: str = "pixelscale-raw"
    s3_bucket_processed: str = "pixelscale-processed"
    aws_region: str = "us-east-1"

    use_local_storage: bool = False
    local_storage_path: str = "./uploads"


@lru_cache
def get_settings() -> Settings:
    return Settings()
