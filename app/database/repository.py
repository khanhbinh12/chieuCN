from sqlalchemy.orm import Session
from app.database.models import User
from app.core.security import get_password_hash

class UserRepository:
    # Tìm user theo username
    def get_by_username(self, db: Session, username: str):
        return db.query(User).filter(User.username == username).first()

    # Tạo user mới
    def create_user(self, db: Session, user_data: dict):
        # Lấy password từ dữ liệu đầu vào để mã hóa
        password = user_data.pop("password")
        hashed_password = get_password_hash(password)
        
        # Tạo đối tượng User với password đã mã hóa
        db_user = User(**user_data, password_hash=hashed_password)
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

# Khởi tạo instance để các nơi khác import
user_repo = UserRepository()