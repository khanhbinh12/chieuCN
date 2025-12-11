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

# Cập nhật route để chuyển hướng đến login.html thay vì dashboard.html
@app.get("/", response_class=HTMLResponse)
async def index():
    # Chuyển hướng đến login.html thay vì dashboard.html
    return FileResponse(BASE_DIR / "static" / "login.html")


@app.get("/login.html", response_class=HTMLResponse)
async def login_page():
    # Trước tiên, người dùng sẽ vào trang đăng nhập
    return FileResponse(BASE_DIR / "static" / "login.html")

@app.get("/register.html", response_class=HTMLResponse)
async def register_page():
    # Sau khi vào login, người dùng có thể đăng ký tài khoản
    return FileResponse(BASE_DIR / "static" / "register.html")

@app.get("/dashboard.html", response_class=HTMLResponse)
async def dashboard_page():
    # Sau khi đăng nhập thành công, người dùng sẽ được chuyển đến dashboard
    return FileResponse(BASE_DIR / "static" / "dashboard.html")

@app.get("/projects.html", response_class=HTMLResponse)
async def projects_page():
    # Sau khi vào dashboard, người dùng sẽ vào trang quản lý projects
    return FileResponse(BASE_DIR / "static" / "projects.html")

@app.get("/tracking.html", response_class=HTMLResponse)
async def tracking_page():
    # Từ dashboard, người dùng có thể bắt đầu theo dõi thời gian cho task
    return FileResponse(BASE_DIR / "static" / "tracking.html")

@app.get("/report.html", response_class=HTMLResponse)
async def report_page():
    # Sau khi làm việc xong, người dùng có thể xem báo cáo hàng ngày
    return FileResponse(BASE_DIR / "static" / "report.html")

@app.get("/statistics.html", response_class=HTMLResponse)
async def statistics_page():
    # Người dùng có thể xem thống kê tổng quan theo tuần hoặc tháng
    return FileResponse(BASE_DIR / "static" / "statistics.html")
