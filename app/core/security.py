from datetime import datetime, timedelta
from typing import Optional, Union, Any

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

# Context để hash/verify password bằng bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Thuật toán dùng cho JWT
ALGORITHM = "HS256"

# Thời gian sống của access token (phút)
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Tạo JWT access token.

    - subject: thường là user_id (hoặc string bất kỳ) -> sẽ đưa vào claim 'sub'
    - expires_delta: nếu truyền vào thì dùng, không thì lấy ACCESS_TOKEN_EXPIRE_MINUTES từ settings
    """
    if expires_delta is not None:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "exp": expire,
        "sub": str(subject),  # Thêm user_id vào claim 'sub'
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,  # Lấy secret_key từ settings
        algorithm=ALGORITHM,
    )
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    So sánh password người dùng nhập với password đã hash trong DB.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash password trước khi lưu vào DB.
    """
    return pwd_context.hash(password)


def decode_access_token(token: str) -> dict:
    """
    Giải mã access token. Ném JWTError nếu token không hợp lệ hoặc hết hạn.
    Dùng trong get_current_user hoặc chỗ nào cần đọc payload.
    """
    try:
        # Giải mã token
        payload = jwt.decode(
            token,
            settings.secret_key,  # Sử dụng secret_key từ config
            algorithms=[ALGORITHM],
        )
        return payload
    except JWTError as e:
        # Nếu token không hợp lệ hoặc hết hạn
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn.",
        )
