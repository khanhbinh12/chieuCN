from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth
from app.routers import projects
from app.routers import tasks
from app.routers import time_entries

app = FastAPI(title="Time Tracking API")

# Cấu hình CORS để cho phép tất cả các nguồn yêu cầu
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phép tất cả các nguồn
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(auth.router)  # Đảm bảo đã import đúng route auth
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(time_entries.router)

# Cấu hình phục vụ tệp tĩnh
app.mount("/assets", StaticFiles(directory="app/static/assets"), name="assets")  # Cấu hình tệp tĩnh cho thư mục assets
app.mount("/static", StaticFiles(directory="app/static"), name="static")  # Cấu hình tệp tĩnh cho thư mục static

# Các route trang chính
@app.get("/", response_class=HTMLResponse)
async def index():
    return FileResponse("app/static/index.html")

@app.get("/login.html", response_class=HTMLResponse)
async def login_page():
    return FileResponse("app/static/login.html")

@app.get("/register.html", response_class=HTMLResponse)
async def register_page():
    return FileResponse("app/static/register.html")
