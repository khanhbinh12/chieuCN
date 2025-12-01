from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Dữ liệu khi bấm Start
class TimeEntryStart(BaseModel):
    task_id: int
    note: Optional[str] = None

# Dữ liệu trả về
class TimeEntryResponse(BaseModel):
    id: int
    task_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: int
    note: Optional[str] = None

    class Config:
        from_attributes = True