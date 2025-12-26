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

    # JWT Authentication
    jwt_secret_key: str = "CHANGE_ME_TO_A_SECURE_RANDOM_STRING"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Logging Configuration
    log_level: str = "INFO"
    use_cloudwatch: bool = False
    cloudwatch_log_group: str = "pixelscale"
    cloudwatch_log_stream: str = "backend"
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
