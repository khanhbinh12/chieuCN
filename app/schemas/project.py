from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Class cơ bản chứa các trường chung
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    hourly_rate: Optional[int] = 0

# Class dùng để validate dữ liệu khi Tạo mới (kế thừa từ Base)
# QUAN TRỌNG: Đây là class mà Router đang tìm kiếm nhưng không thấy
class ProjectCreate(ProjectBase):
    pass

# Class dùng để trả dữ liệu về cho Client (có thêm id, owner_id...)
class ProjectResponse(ProjectBase):
    id: int
    owner_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True