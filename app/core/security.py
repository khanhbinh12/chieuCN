from datetime import datetime, timedelta
from typing import Optional, Union, Any

from jose import jwt, JWTError
from argon2 import PasswordHasher, exceptions as argon2_exceptions

from app.core.config import settings

# Khởi tạo PasswordHasher của argon2 (không bị giới hạn 72 bytes như bcrypt)
pwd_hasher = PasswordHasher()


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Tạo access token (JWT) cho user.
    - subject: thường là user_id.
    - expires_delta: thời gian sống của token (nếu không truyền thì lấy từ settings).
    """
    if expires_delta is not None:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.access_token_expire_minutes
        )

    to_encode = {"exp": expire, "sub": str(subject)}

    try:
        encoded_jwt = jwt.encode(
            to_encode,
            settings.secret_key,
            algorithm="HS256",
        )
        return encoded_jwt
    except JWTError as e:
        # Thường hiếm khi rơi vào đây, nhưng để debug cho dễ
        raise RuntimeError(f"Error generating JWT: {e}") from e


def get_password_hash(password: str) -> str:
    """
    Hash mật khẩu bằng argon2 và trả về chuỗi hash.
    Argon2 không bị giới hạn 72 ký tự như bcrypt.
    """
    return pwd_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    So khớp mật khẩu người dùng nhập với hash trong DB.
    Trả về True nếu đúng, False nếu sai.
    """
    try:
        pwd_hasher.verify(hashed_password, plain_password)
        return True
    except argon2_exceptions.VerifyMismatchError:
        # Sai mật khẩu
        return False
    except argon2_exceptions.VerificationError:
        # Hash lỗi / hỏng / không đúng format
        return False
