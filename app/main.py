from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from starlette.requests import Request
from app.core.security import verify_password, get_password_hash
from app.database.models import User
from app.database import SessionLocal

app = FastAPI()

# Cấu hình origins
origins = [
    "http://127.0.0.1:8000",  # For localhost (IPv4)
    "http://localhost:8000",   # For localhost (IPv6)
]

# Định nghĩa thư mục template
templates = Jinja2Templates(directory="app/templates")

# Cấu hình đường dẫn static (cho CSS, JS, hình ảnh...)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Khởi tạo session database
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/login.html", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/register.html", response_class=HTMLResponse)
async def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@app.post("/auth/login")
async def login(request: Request, db: Session = Depends(get_db)):
    form_data = await request.form()
    username = form_data.get("username")
    password = form_data.get("password")
    
    # Tìm kiếm người dùng từ DB
    user = db.query(User).filter(User.username == username).first()
    
    # Nếu không tìm thấy người dùng hoặc mật khẩu sai
    if not user or not verify_password(password, user.hashed_password):
        # Nếu đăng nhập thất bại, chuyển đến trang đăng ký
        return RedirectResponse(url="/register.html", status_code=status.HTTP_302_FOUND)
    
    # Nếu đăng nhập thành công, chuyển đến trang chủ
    return RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)

@app.post("/auth/register")
async def register(request: Request, db: Session = Depends(get_db)):
    form_data = await request.form()
    username = form_data.get("username")
    password = form_data.get("password")
    
    # Kiểm tra nếu tên người dùng đã tồn tại
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Hash mật khẩu và lưu người dùng mới vào DB
    hashed_password = get_password_hash(password)
    new_user = User(username=username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()

    # Sau khi đăng ký thành công, chuyển đến trang đăng nhập
    return RedirectResponse(url="/login.html", status_code=status.HTTP_302_FOUND)

