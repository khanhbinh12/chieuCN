from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import User
from app.schemas.time_entry import TimeEntryStart, TimeEntryResponse
from app.core.deps import get_current_user
from app.database.repository import time_repo

router = APIRouter(prefix="/time-entries", tags=["Time Tracking"])

@router.post("/start", response_model=TimeEntryResponse)
def start_timer(
    entry_in: TimeEntryStart,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return time_repo.start_timer(db, current_user.id, entry_in.task_id, entry_in.note)

@router.post("/stop", response_model=TimeEntryResponse)
def stop_timer(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry = time_repo.stop_timer(db, current_user.id)
    if not entry:
        raise HTTPException(status_code=400, detail="No running timer found")
    return entry