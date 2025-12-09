from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.database.models import User, Project, Task, TimeEntry
from app.core.security import get_password_hash


# --- 1. User Repository ---
class UserRepository:
    def get_by_username(self, db: Session, username: str) -> Optional[User]:
        return db.query(User).filter(User.username == username).first()

    def get_by_id(self, db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    def create_user(self, db: Session, user_data: dict) -> User:
        """
        user_data thường là dict lấy từ schema:
        {
            "username": ...,
            "email": ...,
            "full_name": ...,
            "password": ...,
        }
        """
        password = user_data.pop("password")
        hashed_password = get_password_hash(password)

        db_user = User(
            **user_data,
            hashed_password=hashed_password  # TRÙNG VỚI TÊN CỘT / MODEL
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user


# --- 2. Project Repository ---
class ProjectRepository:
    def create_project(self, db: Session, project_data: dict) -> Project:
        """
        project_data: {"name":..., "description":..., "owner_id":..., "hourly_rate":..., "color":...}
        """
        new_project = Project(**project_data)
        db.add(new_project)
        db.commit()
        db.refresh(new_project)
        return new_project

    def get_my_projects(self, db: Session, user_id: int) -> list[Project]:
        return db.query(Project).filter(Project.owner_id == user_id).all()

    def get_project_by_id(self, db: Session, project_id: int) -> Optional[Project]:
        return db.query(Project).filter(Project.id == project_id).first()


# --- 3. Task Repository ---
class TaskRepository:
    def create_task(self, db: Session, task_data: dict) -> Task:
        """
        task_data: {"title":..., "description":..., "project_id":..., "status":...}
        """
        new_task = Task(**task_data)
        db.add(new_task)
        db.commit()
        db.refresh(new_task)
        return new_task

    def get_my_tasks(
        self,
        db: Session,
        user_id: int,
        project_id: Optional[int] = None
    ) -> list[Task]:
        """
        Lấy tasks thuộc các project mà user sở hữu.
        Nếu truyền project_id thì filter thêm theo project.
        """
        query = (
            db.query(Task)
            .join(Project, Task.project_id == Project.id)
            .filter(Project.owner_id == user_id)
        )

        if project_id is not None:
            query = query.filter(Task.project_id == project_id)

        return query.all()

    def get_task_by_id(self, db: Session, task_id: int) -> Optional[Task]:
        return db.query(Task).filter(Task.id == task_id).first()


# --- 4. Time Repository (Logic Bấm giờ) ---
class TimeRepository:
    def start_timer(
        self,
        db: Session,
        user_id: int,
        task_id: int,
        note: Optional[str] = None
    ) -> TimeEntry:
        """
        Bắt đầu tính giờ.
        - Tự động dừng timer cũ nếu đang chạy.
        - Tạo TimeEntry mới với start_time = now.
        """

        # 1. Tìm timer đang chạy (end_time IS NULL)
        running_entry = (
            db.query(TimeEntry)
            .filter(
                TimeEntry.user_id == user_id,
                TimeEntry.end_time.is_(None),
            )
            .first()
        )

        # Nếu có, dừng nó lại trước
        if running_entry:
            self.stop_timer(db, user_id)

        # 2. Tạo timer mới
        new_entry = TimeEntry(
            task_id=task_id,
            user_id=user_id,
            start_time=datetime.utcnow(),
            note=note,
        )
        db.add(new_entry)
        db.commit()
        db.refresh(new_entry)
        return new_entry

    def stop_timer(self, db: Session, user_id: int) -> Optional[TimeEntry]:
        """
        Dừng timer đang chạy (nếu có) và:
        - Set end_time = now
        - Tính duration (giây)
        - Cộng dồn vào Task.total_time
        """

        # 1. Tìm entry đang chạy
        entry = (
            db.query(TimeEntry)
            .filter(
                TimeEntry.user_id == user_id,
                TimeEntry.end_time.is_(None),
            )
            .first()
        )

        if not entry:
            return None

        # 2. Cập nhật thời gian kết thúc
        entry.end_time = datetime.utcnow()

        # 3. Tính duration (giây)
        duration_seconds = int(
            (entry.end_time - entry.start_time).total_seconds()
        )
        entry.duration = duration_seconds

        # 4. Cộng dồn vào total_time của Task cha
        task = db.query(Task).filter(Task.id == entry.task_id).first()
        if task:
            task.total_time = (task.total_time or 0) + duration_seconds

        db.commit()
        db.refresh(entry)
        return entry


# Khởi tạo instance
user_repo = UserRepository()
project_repo = ProjectRepository()
task_repo = TaskRepository()
time_repo = TimeRepository()
