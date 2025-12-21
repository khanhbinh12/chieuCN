from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# Import TaskResponse (Phải có TaskResponse đã được định nghĩa trong file schemas/task.py)
from app.schemas.task import TaskResponse 

# 1. Base Class (Chứa các trường chung)
class TimeEntryBase(BaseModel):
    note: Optional[str] = None

# 2. Class dùng để Tạo mới (Client -> Server)
class TimeEntryCreate(TimeEntryBase):
    task_id: int  # Bắt buộc phải có ID của Task

# 3. Class dùng để Cập nhật (Client -> Server)
class TimeEntryUpdate(BaseModel):
    note: Optional[str] = None
    # Nếu cần sửa thời gian, thêm các trường sau
    # start_time: Optional[datetime] = None
    # end_time: Optional[datetime] = None

# 4. Class dùng để Trả về (Server -> Client) -- ĐÃ SỬA CHỮA LỖI SERIALIZATION
class TimeEntryResponse(TimeEntryBase):
    id: int
    task_id: int
    user_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: int = 0  # Thời gian chạy (giây)

    # Thêm mối quan hệ lồng ghép (Nested Relationship)
    # Đây là nơi Pydantic biết rằng, khi thấy trường 'task' 
    # trong đối tượng TimeEntry SQLAlchemy, hãy chuyển nó sang dạng TaskResponse
    task: Optional[TaskResponse] = None 
    
    # Cần phải khai báo lại Config vì đã thay đổi cấu trúc
    class Config:
        from_attributes = True
        # Thêm mode JSON cho trường hợp bạn dùng Pydantic V2
        # json_encoders = {datetime: lambda v: v.isoformat() if v else None}