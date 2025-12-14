from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# 1. Base dùng chung
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    hourly_rate: Optional[int] = 0

# 2. Class dùng để Tạo mới (Client -> Server)
# Kế thừa từ Base, bắt buộc có name (do Base quy định)
class ProjectCreate(ProjectBase):
    pass

# 3. Class dùng để Cập nhật (Client -> Server) - MỚI THÊM
# Tại sao cần class riêng? 
# Vì khi update, người dùng có thể chỉ muốn sửa Description mà giữ nguyên Name.
# Nên tất cả các trường ở đây đều phải là Optional.
class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    hourly_rate: Optional[int] = None

# 4. Class dùng để trả về (Server -> Client)
class ProjectResponse(ProjectBase):
    id: int
    owner_id: int
    created_at: datetime
    
    class Config:
        # Pydantic v2 dùng 'from_attributes', v1 dùng 'orm_mode'
        # Nếu bạn dùng FastAPI phiên bản mới nhất thì giữ nguyên dòng dưới
        from_attributes = True