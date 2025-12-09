import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# ===============================================================
# 1. CẤU HÌNH ĐƯỜNG DẪN ĐẾN PROJECT ROOT
# ===============================================================

# Đường dẫn thư mục chứa file env.py (migrations/)
current_path = os.path.dirname(os.path.abspath(__file__))

# Thư mục gốc project (cha của migrations/) – nơi chứa thư mục app/
root_path = os.path.abspath(os.path.join(current_path, ".."))

# Thêm root_path vào PYTHONPATH để import được package "app"
if root_path not in sys.path:
    sys.path.insert(0, root_path)

# ===============================================================
# 2. IMPORT TỪ APP SAU KHI ĐÃ FIX ĐƯỜNG DẪN
# ===============================================================

try:
    # Config (lấy database_url, secret_key, ...)
    from app.core.config import settings

    # Base: nơi khai báo declarative_base()
    from app.database.connection import Base

    # Import models để Alembic biết metadata có những bảng nào
    from app.database import models  # noqa: F401

    print("✅ Alembic: Import settings, Base, models thành công.")
except ImportError as e:
    print("❌ Alembic: Lỗi import module từ app.")
    print("   Hãy kiểm tra lại cấu trúc thư mục và file __init__.py.")
    raise e

# ===============================================================
# 3. CẤU HÌNH ALEMBIC CONFIG
# ===============================================================

config = context.config

# Ghi đè URL database bằng cấu hình từ Settings (lấy từ .env hoặc default)
# Lưu ý: dùng đúng tên field trong Settings (database_url hoặc DATABASE_URL)
config.set_main_option("sqlalchemy.url", settings.database_url)

# Nếu có file alembic.ini thì load config logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Gắn metadata để tính năng autogenerate làm việc được
target_metadata = Base.metadata


# ===============================================================
# 4. HÀM CHẠY MIGRATION OFFLINE
# ===============================================================
def run_migrations_offline() -> None:
    """
    Chạy migrations ở chế độ 'offline'.
    Alembic sẽ sinh câu lệnh SQL dựa trên URL, không cần kết nối DB thật.
    """
    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


# ===============================================================
# 5. HÀM CHẠY MIGRATION ONLINE
# ===============================================================
def run_migrations_online() -> None:
    """
    Chạy migrations ở chế độ 'online'.
    Alembic sẽ tạo engine và kết nối tới DB rồi apply migration.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section) or {},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


# ===============================================================
# 6. CHỌN CHẾ ĐỘ CHẠY
# ===============================================================
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
