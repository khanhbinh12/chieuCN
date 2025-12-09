from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum

# --- QUAN TRỌNG: Import Base từ connection để tránh lỗi Circular Import ---
from .connection import Base

# --- Enums ---
class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

# --- 1. User Model ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(String(20), default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    projects = relationship("Project", back_populates="owner")
    time_entries = relationship("TimeEntry", back_populates="user")

# --- 2. Project Model (Thay thế cho Board) ---
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    hourly_rate = Column(Integer, default=0) # Cho chức năng Billing sau này
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")

# --- 3. Task Model ---
class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=True)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.TODO)
    
    # Quan hệ với Project (thay vì Board)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # Field mới: Tổng thời gian làm (tính bằng giây)
    total_time = Column(Integer, default=0) 
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="tasks")
    time_entries = relationship("TimeEntry", back_populates="task", cascade="all, delete-orphan")

# --- 4. TimeEntry Model (Mới hoàn toàn) ---
class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Ai bấm giờ
    
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=True) # Null = Đang chạy
    duration = Column(Integer, default=0) # Thời gian của session này (giây)
    note = Column(String(255), nullable=True) # Ghi chú cho lần bấm giờ này

    # Relationships
    task = relationship("Task", back_populates="time_entries")
    user = relationship("User", back_populates="time_entries")