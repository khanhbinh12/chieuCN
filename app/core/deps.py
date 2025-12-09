from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.connection import get_db
from app.database.models import User

# Thuật toán dùng cho JWT
ALGORITHM = "HS256"

# Đường dẫn API để lấy token (Login) - dùng trong /docs
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency dùng cho các endpoint cần đăng nhập.
    Tự động:
    1. Lấy token từ header Authorization: Bearer <token>
    2. Giải mã token bằng SECRET_KEY + ALGORITHM
    3. Lấy user_id từ payload["sub"]
    4. Tìm user trong database
    5. Trả về User object nếu hợp lệ, hoặc ném lỗi 401 nếu không
    """

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Giải mã token
        payload = jwt.decode(
            token,
            settings.secret_key,  # lấy SECRET_KEY từ config
            algorithms=[ALGORITHM],
        )
        
        # Lấy user_id từ "sub" (subject)
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
    except JWTError:
        # Nếu token bị lỗi (hết hạn, không hợp lệ...)
        raise credentials_exception

    # Ép kiểu user_id sang int để truy vấn
    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        # Nếu không ép kiểu thành công, báo lỗi
        raise credentials_exception

    # Tìm user trong DB bằng user_id
    user: Optional[User] = db.query(User).filter(User.id == user_id_int).first()
    
    # Nếu không tìm thấy người dùng, trả về lỗi 401
    if user is None:
        raise credentials_exception

    return user
