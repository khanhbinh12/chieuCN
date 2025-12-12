from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, projects, tasks, time_entries

# =========================
# CẤU HÌNH ĐƯỜNG DẪN
# =========================

# Thư mục chứa main.py (app/)
BASE_DIR = Path(__file__).resolve().parent

# Thư mục static: app/static
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Time Tracking API")

# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # cho phép mọi origin (dev cho dễ)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# INCLUDE ROUTERS (API)
# =========================

app.include_router(auth.router)          # /auth/login, /auth/register, /auth/me
app.include_router(projects.router)      # /projects ...
app.include_router(tasks.router)         # /tasks ...
app.include_router(time_entries.router)  # /time-entries ...

# =========================
# STATIC FILES
# =========================

# Toàn bộ file tĩnh (HTML, CSS, JS, images...) nằm trong app/static
# Ví dụ:
#   app/static/login.html
#   app/static/dashboard.html
#   app/static/assets/css/style.css
#   app/static/assets/js/app.js
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# Helper: trả về file HTML an toàn (tránh lỗi 500 nếu thiếu file)
def get_html_file(filename: str) -> FileResponse:
    file_path = STATIC_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"{filename} not found")
    return FileResponse(file_path)


# =========================
# ROUTES TRẢ VỀ HTML
# =========================

# Vào root "/" -> chuyển thẳng sang login.html
@app.get("/", response_class=HTMLResponse)
async def root():
    return RedirectResponse(url="/login.html")


@app.get("/login.html", response_class=HTMLResponse)
async def login_page():
    # HTML: app/static/login.html
    return get_html_file("login.html")


@app.get("/register.html", response_class=HTMLResponse)
async def register_page():
    # HTML: app/static/register.html
    return get_html_file("register.html")


@app.get("/dashboard.html", response_class=HTMLResponse)
async def dashboard_page():
    # HTML: app/static/dashboard.html
    return get_html_file("dashboard.html")


@app.get("/projects.html", response_class=HTMLResponse)
async def projects_page():
    # HTML: app/static/projects.html
    return get_html_file("projects.html")


@app.get("/tracking.html", response_class=HTMLResponse)
async def tracking_page():
    # HTML: app/static/tracking.html
    return get_html_file("tracking.html")


@app.get("/report.html", response_class=HTMLResponse)
async def report_page():
    # HTML: app/static/report.html
    return get_html_file("report.html")


@app.get("/statistics.html", response_class=HTMLResponse)
async def statistics_page():
    # HTML: app/static/statistics.html
    return get_html_file("statistics.html")