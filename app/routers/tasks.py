from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Import DB
from app.database.connection import get_db
from app.database.models import Task, Project, User
from app.core.deps import get_current_user
# Import Schema
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)

# 1. CREATE
@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Kiểm tra project thuộc về user
    project = db.query(Project).filter(
        Project.id == task_in.project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    new_task = Task(**task_in.dict())
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

# 2. READ ALL
@router.get("/", response_model=List[TaskResponse])
def get_my_tasks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Task)\
        .join(Project)\
        .filter(Project.owner_id == current_user.id)\
        .offset(skip).limit(limit).all()

# 3. READ BY PROJECT
@router.get("/project/{project_id}", response_model=List[TaskResponse])
def get_tasks_by_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Kiểm tra project thuộc về user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return db.query(Task).filter(Task.project_id == project_id).all()

# 4. READ ONE
@router.get("/{task_id}", response_model=TaskResponse)
def get_task_detail(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task)\
        .join(Project)\
        .filter(
            Task.id == task_id,
            Project.owner_id == current_user.id
        ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

# 5. UPDATE
@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Tìm task thuộc về user
    task = db.query(Task)\
        .join(Project)\
        .filter(
            Task.id == task_id,
            Project.owner_id == current_user.id
        ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Cập nhật thông minh
    update_data = task_in.dict(exclude_unset=True)

    for field, value in update_data.items():
        setattr(task, field, value)

    db.add(task)
    db.commit()
    db.refresh(task)
    return task

# 6. DELETE
@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task)\
        .join(Project)\
        .filter(
            Task.id == task_id,
            Project.owner_id == current_user.id
        ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return None