from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Thay root:password bằng user/pass MySQL của bạn
    database_url: str = "mysql+pymysql://root:kbinh@localhost:3306/time_tracking_db"
    secret_key: str = "supersecretkey"
    access_token_expire_minutes: int = 1440
    app_name: str = "Time Tracking App"

    class Config:
        env_file = ".env"

settings = Settings()