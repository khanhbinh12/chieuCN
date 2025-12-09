from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import thẳng các router (giờ project đã đủ file rồi)
from app.routers import auth, projects, tasks, time_entries

app = FastAPI(title="Time Tracking API")

# --- CẤU HÌNH CORS ---
# Cho phép frontend (127.0.0.1:5500 / localhost:5500) gọi API
origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ĐĂNG KÝ ROUTER ---
# Các router này đã có prefix sẵn trong từng file,
# ví dụ auth.router có prefix="/auth" → /auth/login, /auth/register...
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(time_entries.router)


@app.get("/")
def root():
    return {"message": "Time Tracking API is running", "status": "ok"}
