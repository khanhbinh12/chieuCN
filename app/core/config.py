from pydantic_settings import BaseSettings 

class Settings(BaseSettings):
    # URL kết nối MySQL (mặc định, có thể override bằng .env)
    database_url: str = "mysql+pymysql://root:kbinh@localhost:3306/time_tracking_db"  # Nếu không có file .env, sẽ dùng giá trị này.

    # JWT & app config
    secret_key: str = "supersecretkey"  # Key cho việc tạo JWT
    access_token_expire_minutes: int = 60 * 24  # Token sẽ hết hạn sau 1 ngày
    app_name: str = "Time Tracking App"

    class Config:
        # Đọc cấu hình từ file .env (nếu có)
        env_file = ".env"
        case_sensitive = False  # Không phân biệt chữ hoa chữ thường khi đọc tên biến từ .env

# Khởi tạo đối tượng settings từ lớp Settings
settings = Settings()

