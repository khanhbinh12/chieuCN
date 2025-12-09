from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Boolean,
    Enum as SQLEnum,
    Numeric,
)
from sqlalchemy.orm import relationship

# Import Base từ connection để tránh lỗi Circular Import
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
    full_name = Column(String(100), nullable=True)

    # TÊN CỘT NÀY PHẢI TRÙNG VỚI DB: hashed_password
    hashed_password = Column(String(255), nullable=False)

    # Có thể dùng Enum hoặc String, ở đây mình để String cho đơn giản
    role = Column(String(20), default=UserRole.USER.value)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="user", cascade="all, delete-orphan")


# --- 2. Project Model (Thay thế cho Board) ---

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Cho UI (màu project) – nếu bạn có cột này trong DB
    color = Column(String(20), nullable=True)

    # Billing: tiền/giờ, nên dùng Numeric (DECIMAL) cho giống MySQL
    hourly_rate = Column(Numeric(10, 2), default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    owner = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


# --- 3. Task Model ---

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=True)

    status = Column(SQLEnum(TaskStatus), default=TaskStatus.TODO, nullable=False)

    # Quan hệ với Project (thay vì Board)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    # Tổng thời gian làm (tính bằng giây), cộng dồn từ TimeEntry
    total_time = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    project = relationship("Project", back_populates="tasks")
    time_entries = relationship("TimeEntry", back_populates="task", cascade="all, delete-orphan")


# --- 4. TimeEntry Model (Log thời gian) ---

class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(Integer, primary_key=True, index=True)

    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Ai bấm giờ

    start_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=True)  # NULL = đang chạy
    duration = Column(Integer, default=0, nullable=False)  # Thời gian session này (giây)
    note = Column(String(255), nullable=True)  # Ghi chú cho lần bấm giờ này

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    task = relationship("Task", back_populates="time_entries")
    user = relationship("User", back_populates="time_entries")
