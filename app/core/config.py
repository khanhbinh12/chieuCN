from pydantic_settings import BaseSettings  # Updated import
from typing import Optional
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # URL kết nối cơ sở dữ liệu MySQL, bạn có thể thay đổi thành PostgreSQL hoặc SQLite nếu cần
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./time_tracking.db")  # Cấu hình SQLite
  
    # Key bí mật cho JWT (JSON Web Token) từ biến môi trường, fallback về giá trị mặc định nếu không tìm thấy
    secret_key: str = os.getenv("SECRET_KEY", "supersecretkey")
    
    # Thời gian hết hạn của access token (phút)
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))  # Default 1440 minutes (24 hours)
    
    # Tên ứng dụng
    app_name: str = "Time Tracking App"
    
    class Config:
        env_file = ".env"  # Đọc từ file .env nếu có
    
# Tạo một instance của Settings để sử dụng trong ứng dụng
settings = Settings()
