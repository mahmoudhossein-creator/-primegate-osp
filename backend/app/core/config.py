from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/primegate_osp"
    SECRET_KEY: str = "change-this-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480   # 8 hours (full shift)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Geo-fence default radius in metres
    DEFAULT_GEOFENCE_RADIUS_M: int = 500

    # Alert threshold — minutes before geo-fence alert fires
    GEOFENCE_ALERT_MINUTES: int = 120

    # AWS S3 for photo uploads
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = "primegate-osp-photos"
    AWS_REGION: str = "me-south-1"

    class Config:
        env_file = ".env"


settings = Settings()
