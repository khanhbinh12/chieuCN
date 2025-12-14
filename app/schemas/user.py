from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Cơ sở cho thông tin người dùng (không bao gồm mật khẩu)
class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None

# Lớp khi người dùng đăng ký, bao gồm mật khẩu
class UserCreate(UserBase):
    password: str

# Lớp trả về thông tin người dùng sau khi đăng ký hoặc xác thực
class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Lớp Token để trả về mã thông báo sau khi người dùng đăng nhập thành công
class Token(BaseModel):
    access_token: str
    token_type: str

# Thêm lớp UserCredentials để xác thực người dùng khi đăng nhập
class UserCredentials(BaseModel):
    username: str
    password: str