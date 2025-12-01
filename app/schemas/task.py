from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

# Định nghĩa các trạng thái của Task
class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"

# Class cơ bản (Chứa các trường chung)
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: int
    status: Optional[TaskStatus] = TaskStatus.TODO

# Class dùng khi tạo Task (Router đang tìm class này)
class TaskCreate(TaskBase):
    pass

# Class dùng khi trả về dữ liệu (có thêm id, time...)
class TaskResponse(TaskBase):
    id: int
    total_time: int  # Tổng thời gian đã làm (giây)
    created_at: datetime
    
    class Config:
        from_attributes = True