from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
# Import biến 'settings' đã được khởi tạo bên app/core/config.py
from app.core.config import settings

# Tạo engine kết nối từ URL trong settings
engine = create_engine(settings.database_url, pool_pre_ping=True)

# Cấu hình session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Khởi tạo Base model
Base = declarative_base()

# Dependency dùng cho API
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()