from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Import DB
from app.database.connection import get_db
from app.database.models import Project, User
from app.core.deps import get_current_user
# Import Schema
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

# 1. CREATE
@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    new_project = Project(
        **project_in.dict(), 
        owner_id=current_user.id
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

# 2. READ ALL
@router.get("/", response_model=List[ProjectResponse])
def get_my_projects(
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return db.query(Project)\
        .filter(Project.owner_id == current_user.id)\
        .offset(skip).limit(limit).all()

# 3. READ ONE (Sửa str -> int)
@router.get("/{project_id}", response_model=ProjectResponse)
def get_project_detail(
    project_id: int,  # <--- Đã sửa thành int
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id, 
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

# 4. UPDATE (Inline Edit gọi vào đây)
@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int, # <--- Đã sửa thành int
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Tìm dự án của đúng user này
    project = db.query(Project).filter(
        Project.id == project_id, 
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Cập nhật thông minh (chỉ update cái nào client gửi lên)
    # Frontend gửi {name: "ABC"} thì chỉ sửa name, description giữ nguyên
    update_data = project_in.dict(exclude_unset=True) 
    
    for field, value in update_data.items():
        setattr(project, field, value)

    db.add(project)
    db.commit()
    db.refresh(project)
    return project

# 5. DELETE
@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int, # <--- Đã sửa thành int
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id, 
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()
    return None