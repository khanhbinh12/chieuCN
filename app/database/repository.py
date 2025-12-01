from sqlalchemy.orm import Session
from datetime import datetime
from app.database.models import User, Project, Task, TimeEntry
from app.core.security import get_password_hash

# --- 1. User Repository ---
class UserRepository:
    def get_by_username(self, db: Session, username: str):
        return db.query(User).filter(User.username == username).first()

    def create_user(self, db: Session, user_data: dict):
        password = user_data.pop("password")
        hashed_password = get_password_hash(password)
        db_user = User(**user_data, password_hash=hashed_password)
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

# --- 2. Project Repository ---
class ProjectRepository:
    def create_project(self, db: Session, project_data: dict):
        new_project = Project(**project_data)
        db.add(new_project)
        db.commit()
        db.refresh(new_project)
        return new_project

    def get_my_projects(self, db: Session, user_id: int):
        return db.query(Project).filter(Project.owner_id == user_id).all()

    def get_project_by_id(self, db: Session, project_id: int):
        return db.query(Project).filter(Project.id == project_id).first()

# --- 3. Task Repository ---
class TaskRepository:
    def create_task(self, db: Session, task_data: dict):
        new_task = Task(**task_data)
        db.add(new_task)
        db.commit()
        db.refresh(new_task)
        return new_task

    def get_my_tasks(self, db: Session, user_id: int, project_id: int = None):
        # Join bảng Task với Project để chỉ lấy task thuộc về project của user đó
        query = db.query(Task).join(Project).filter(Project.owner_id == user_id)
        if project_id:
            query = query.filter(Task.project_id == project_id)
        return query.all()
    
    def get_task_by_id(self, db: Session, task_id: int):
        return db.query(Task).filter(Task.id == task_id).first()

# --- 4. Time Repository (Logic Bấm giờ) ---
class TimeRepository:
    def start_timer(self, db: Session, user_id: int, task_id: int, note: str = None):
        """Bắt đầu tính giờ. Tự động dừng timer cũ nếu đang chạy."""
        # 1. Tìm timer đang chạy (end_time là Null)
        running_entry = db.query(TimeEntry).filter(
            TimeEntry.user_id == user_id,
            TimeEntry.end_time == None
        ).first()
        
        # Nếu có, dừng nó lại trước
        if running_entry:
            self.stop_timer(db, user_id)

        # 2. Tạo timer mới
        new_entry = TimeEntry(
            task_id=task_id,
            user_id=user_id,
            start_time=datetime.utcnow(),
            note=note
        )
        db.add(new_entry)
        db.commit()
        db.refresh(new_entry)
        return new_entry

    def stop_timer(self, db: Session, user_id: int):
        """Dừng timer và tính toán thời gian."""
        # 1. Tìm entry đang chạy
        entry = db.query(TimeEntry).filter(
            TimeEntry.user_id == user_id,
            TimeEntry.end_time == None
        ).first()

        if not entry:
            return None 

        # 2. Cập nhật thời gian kết thúc
        entry.end_time = datetime.utcnow()
        
        # 3. Tính duration (giây)
        duration_seconds = int((entry.end_time - entry.start_time).total_seconds())
        entry.duration = duration_seconds

        # 4. Cộng dồn vào total_time của Task cha (để frontend hiển thị nhanh)
        task = db.query(Task).filter(Task.id == entry.task_id).first()
        if task:
            task.total_time += duration_seconds
            
        db.commit()
        db.refresh(entry)
        return entry

# Khởi tạo instance
user_repo = UserRepository()
project_repo = ProjectRepository()
task_repo = TaskRepository()
time_repo = TimeRepository()