from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.repository import user_repo
from app.schemas.user import UserCreate, UserResponse, Token
from app.core.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ---------- REGISTER ----------
@router.post("/register")
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Kiểm tra username đã tồn tại chưa
    if user_repo.get_by_username(db, username=user_in.username):
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )

    # Tạo user mới
    user = user_repo.create_user(db, user_in.dict())

    # Trả về thông tin người dùng mới
    return {
        "success": True,
        "message": "User created successfully",
        "user": UserResponse.model_validate(user)  # Pydantic v2
    }


# ---------- LOGIN ----------
@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # Lấy thông tin người dùng từ database bằng username
    user = user_repo.get_by_username(db, username=form_data.username)

    # Kiểm tra thông tin người dùng và mật khẩu
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Tạo token và trả về cho người dùng
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer", "user": UserResponse.model_validate(user)}