from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.connection import get_db
from app.database.models import Project, User
# Import phải khớp với tên class trong file schema
from app.schemas.project import ProjectCreate, ProjectResponse
from app.core.deps import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("/", response_model=ProjectResponse)
def create_project(
    project_in: ProjectCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Tạo project mới và gắn owner là user đang đăng nhập
    new_project = Project(**project_in.dict(), owner_id=current_user.id)
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.get("/", response_model=List[ProjectResponse])
def get_my_projects(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Chỉ lấy project của chính user đó
    return db.query(Project).filter(Project.owner_id == current_user.id).all()