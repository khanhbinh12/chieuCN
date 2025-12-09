import sys
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# ===============================================================
# 1. CẤU HÌNH ĐƯỜNG DẪN (QUAN TRỌNG NHẤT)
# ===============================================================
# Lấy đường dẫn của file env.py hiện tại
current_path = os.path.dirname(os.path.abspath(__file__))
# Lấy đường dẫn thư mục gốc dự án (thư mục cha của migrations)
root_path = os.path.abspath(os.path.join(current_path, '..'))

# In ra để debug xem nó đang trỏ đi đâu
print(f"-------- DEBUG PATH --------")
print(f"Root Project Path: {root_path}")

# Thêm đường dẫn gốc vào VỊ TRÍ ĐẦU TIÊN của hệ thống
# Để Python ưu tiên tìm package 'app' trong thư mục này
sys.path.insert(0, root_path)
print(f"Sys Path[0]: {sys.path[0]}")
print(f"--------------------------")

# ===============================================================
# 2. IMPORT TỪ APP (Chỉ import SAU KHI đã fix đường dẫn)
# ===============================================================
try:
    from app.core.config import settings
    
    # 1. Import Base từ nơi khai báo gốc (connection.py)
    from app.database.connection import Base
    
    # 2. Import module models để đảm bảo các class (User, Task...) được đăng ký vào Base
    # Nếu thiếu dòng này, Alembic sẽ không tìm thấy bảng nào để tạo
    from app.database import models
    
    print("✅ Import thành công: settings, Base và models")
except ImportError as e:
    print("❌ LỖI IMPORT: Không tìm thấy module.")
    print(e)
    print("👉 Hãy kiểm tra lại cấu trúc thư mục và file __init__.py")
    raise e

# ---------------------------------------------------------------
# Config Alembic (Giữ nguyên logic chuẩn)
# ---------------------------------------------------------------
config = context.config

# Ghi đè URL database bằng cấu hình từ file config.py (lấy từ .env)
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Gán metadata để tính năng autogenerate hoạt động
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()