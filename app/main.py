from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, projects, tasks, time_entries

app = FastAPI(title="Time Tracking API")

# Cấu hình CORS (Cho phép Frontend gọi API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Trong production nên đổi thành domain cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các router
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)       
app.include_router(time_entries.router) 

@app.get("/")
def root():
    return {"message": "Time Tracking API is running"}