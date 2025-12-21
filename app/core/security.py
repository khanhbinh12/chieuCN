# app/core/security.py

from datetime import datetime, timedelta
from typing import Any, Optional, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from argon2 import PasswordHasher, exceptions as argon2_exceptions

from app.core.config import settings
from app.database.connection import get_db

# ================== CẤU HÌNH CHUNG ==================

ALGORITHM = "HS256"

# Lấy token từ header Authorization: Bearer <token>
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Dùng Argon2 để băm mật khẩu
ph = PasswordHasher()


# ================== HÀM HASH / VERIFY PASSWORD ==================

def get_password_hash(password: str) -> str:
    """
    Băm mật khẩu bằng Argon2.
    """
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    So sánh mật khẩu người dùng nhập với hash trong DB.
    Trả về True nếu đúng, False nếu sai.
    """
    try:
        ph.verify(hashed_password, plain_password)
        return True
    except argon2_exceptions.VerifyMismatchError:
        return False
    except argon2_exceptions.VerificationError:
        return False


# ================== HÀM TẠO / KIỂM TRA JWT ==================

def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Tạo access token (JWT) cho user.
    - subject: thường là user_id
    - expires_delta: thời gian sống token (nếu không truyền thì dùng settings.access_token_expire_minutes)
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)

    expire = datetime.utcnow() + expires_delta
    to_encode = {"exp": expire, "sub": str(subject)}

    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def verify_jwt_token(token: str) -> str:
    """
    Giải mã JWT, lấy ra user_id từ field 'sub'.
    Nếu token sai / hết hạn -> raise HTTPException(401).
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalid: missing 'sub'"
            )
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


# ================== HÀM LẤY USER HIỆN TẠI ==================

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Lấy user hiện tại dựa vào JWT trong header Authorization.
    """
    # Import trong hàm để tránh circular import
    from app.database.repository import user_repo

    user_id = verify_jwt_token(token)
    user = user_repo.get_by_id(db, int(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user
