from fastapi import FastAPI
from app.routers import auth, projects

app = FastAPI(title="Time Tracking API")

app.include_router(auth.router)
app.include_router(projects.router)

@app.get("/")
def root():
    return {"message": "Time Tracking API is running"}