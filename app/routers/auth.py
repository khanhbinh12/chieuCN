from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.connection import get_db
# Lưu ý: Import models từ app.database.models chứ không phải app.database
from app.database.models import User
from app.database.repository import user_repo
from app.schemas.user import UserCreate, UserResponse, Token
from app.core.security import verify_password, create_access_token

# Khởi tạo router
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # 1. Kiểm tra username đã tồn tại chưa
    if user_repo.get_by_username(db, username=user_in.username):
        raise HTTPException(
            status_code=400, 
            detail="Username already registered"
        )
    
    # 2. Tạo user
    user = user_repo.create_user(db, user_in.dict())
    return user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Tìm user trong DB
    user = user_repo.get_by_username(db, username=form_data.username)
    
    # 2. Kiểm tra password
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Tạo token
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}