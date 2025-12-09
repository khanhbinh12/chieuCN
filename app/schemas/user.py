from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ================== SCHEMAS CƠ BẢN ==================

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """
    Schema dùng cho /auth/register
    """
    password: str


class UserResponse(UserBase):
    """
    Schema dùng làm response khi trả thông tin user ra ngoài
    (vd: trả về sau khi đăng ký, hoặc kèm theo token login)
    """
    id: int
    is_active: bool = True
    created_at: datetime

    # Pydantic v2: from_attributes = True (tương đương orm_mode = True ở v1)
    class Config:
        from_attributes = True


# ================== SCHEMAS CHO AUTH (NẾU CẦN) ==================

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenWithUser(Token):
    """
    Nếu trong router login bạn trả về cả token + thông tin user,
    có thể dùng schema này làm response_model
    """
    user: UserResponse
