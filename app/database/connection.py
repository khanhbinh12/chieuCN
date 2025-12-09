# app/database/connection.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings  # import Settings ở trên


# Nếu dùng field là `database_url`
SQLALCHEMY_DATABASE_URL = settings.database_url
# Nếu bạn dùng field UPPERCASE:
# SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,      # bật True nếu muốn xem log SQL
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


# Dependency cho FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
