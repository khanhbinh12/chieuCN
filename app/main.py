from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, projects, tasks, time_entries

# Đặt BASE_DIR là thư mục gốc của dự án
BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Time Tracking API")

# Cấu hình CORS để cho phép tất cả các nguồn yêu cầu
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phép tất cả các nguồn
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Bao gồm các routers từ app.routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(time_entries.router)

# Mount thư mục static chỉ cần 1 lần
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# Các route trang chính
@app.get("/", response_class=HTMLResponse)
async def index():
    return FileResponse(BASE_DIR / "static" / "index.html")

@app.get("/login.html", response_class=HTMLResponse)
async def login_page():
    return FileResponse(BASE_DIR / "static" / "login.html")

@app.get("/register.html", response_class=HTMLResponse)
async def register_page():
    return FileResponse(BASE_DIR / "static" / "register.html")
