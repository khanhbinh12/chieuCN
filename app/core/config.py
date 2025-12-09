# app/core/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # URL kết nối MySQL (mặc định, có thể override bằng .env)
    database_url: str = "mysql+pymysql://root:kbinh@localhost:3306/time_tracking_db"


    # JWT & app config
    secret_key: str = "supersecretkey"
    access_token_expire_minutes: int = 60 * 24  # 1 ngày
    app_name: str = "Time Tracking App"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
