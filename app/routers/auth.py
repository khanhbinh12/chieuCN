from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.repository import user_repo
from app.schemas.user import UserCreate, UserResponse  # Thay UserOut thành UserResponse

from app.core.security import create_access_token, verify_password

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

@router.post("/register", response_model=UserResponse)  # Đổi từ UserOut thành UserResponse
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Kiểm tra username trùng
    if user_repo.get_by_username(db, username=user_in.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    # Tạo user mới
    user = user_repo.create_user(db, user_in.dict())
    return user


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # Lấy user theo username
    user = user_repo.get_by_username(db, username=form_data.username)

    # ⚠️ Dùng đúng field hashed_password
    if not user or not verify_password(form_data.password, user.hashed_password):  # Xác minh hashed_password
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password",
        )

    # Tạo access token
    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
        },
    }
