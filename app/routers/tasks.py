from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.connection import get_db
from app.database.models import User, Project
from app.schemas.task import TaskCreate, TaskResponse
from app.core.deps import get_current_user
from app.database.repository import task_repo

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.post("/", response_model=TaskResponse)
def create_task(
    task_in: TaskCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Kiểm tra Project có thuộc về User này không
    project = db.query(Project).filter(Project.id == task_in.project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied")

    return task_repo.create_task(db, task_in.dict())

@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return task_repo.get_my_tasks(db, current_user.id)