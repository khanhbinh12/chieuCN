from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[TaskStatus] = TaskStatus.TODO

class TaskCreate(TaskBase):
    project_id: int

# --- QUAN TRỌNG: Class này dùng cho hàm update_task ---
class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None 
# -----------------------------------------------------

class TaskResponse(TaskBase):
    id: int
    project_id: int
    created_at: datetime = datetime.now() # Hoặc lấy từ DB

    class Config:
        from_attributes = True