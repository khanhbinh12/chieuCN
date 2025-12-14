1. Giới thiệu dự án
Time Tracking App là một ứng dụng web mã nguồn mở được xây dựng nhằm hỗ trợ người dùng theo dõi thời gian làm việc trên các công việc (tasks) khác nhau. Hệ thống cho phép người dùng tạo công việc, bắt đầu/dừng bộ đếm thời gian (timer), ghi nhận thời gian làm việc và xem báo cáo tổng hợp theo ngày.
Dự án được thực hiện trong khuôn khổ học phần Phát triển ứng dụng mã nguồn mở tại Trường Đại học Bình Dương, với mục tiêu áp dụng các kiến thức về FastAPI, ORM, cơ sở dữ liệu và quy trình phát triển phần mềm mã nguồn mở.
7. Demo hệ thống
Ảnh chụp màn hình minh họa trong báo cáo tiểu luận:
•	Trang đăng nhập / đăng ký
•	Trang quản lý công việc
•	Chức năng bắt đầu / dừng timer
•	Báo cáo tổng thời gian làm việc
6. Hướng dẫn cài đặt & chạy hệ thống
Thiết lập biến môi trường:
Cài đặt backend
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
Sau khi chạy thành công, truy cập API docs tại:
http://127.0.0.1:8000/
Time Tracking App – Ứng dụng theo dõi thời gian làm việc
1. Giới thiệu dự án
Time Tracking App là một ứng dụng web mã nguồn mở được xây dựng nhằm hỗ trợ người dùng theo dõi thời gian làm việc trên các công việc (tasks) khác nhau. Hệ thống cho phép người dùng tạo công việc, bắt đầu/dừng bộ đếm thời gian (timer), ghi nhận thời gian làm việc và xem báo cáo tổng hợp theo ngày.
Dự án được thực hiện trong khuôn khổ học phần Phát triển ứng dụng mã nguồn mở tại Trường Đại học Bình Dương, với mục tiêu áp dụng các kiến thức về FastAPI, ORM, cơ sở dữ liệu và quy trình phát triển phần mềm mã nguồn mở.
________________________________________
2. Chức năng chính
2.1. Xác thực người dùng
•	Đăng ký tài khoản người dùng
•	Đăng nhập / đăng xuất
•	Quản lý phiên đăng nhập
2.2. Quản lý công việc (Tasks)
•	Tạo mới công việc
•	Chỉnh sửa thông tin công việc
•	Xóa công việc không còn sử dụng
•	Hiển thị danh sách công việc của người dùng
2.3. Theo dõi thời gian (Time Tracking)
•	Bắt đầu bộ đếm thời gian cho từng công việc
•	Dừng bộ đếm và lưu thời gian làm việc
•	Ghi nhận tổng thời gian đã làm cho mỗi công việc
2.4. Báo cáo thời gian
•	Xem tổng thời gian làm việc theo ngày
•	Theo dõi lịch sử thời gian đã ghi nhận
________________________________________
3. Công nghệ sử dụng
Backend
•	Python – FastAPI: Xây dựng RESTful API
•	ORM (SQLAlchemy): Quản lý và truy vấn cơ sở dữ liệu
•	JWT / Session: Xác thực người dùng
•	Alembic: Quản lý migration cơ sở dữ liệu
Frontend
•	HTML, CSS, JavaScript
•	Giao diện đơn giản, dễ sử dụng
•	Gửi request đến backend thông qua API
Database
•	SQLite (sử dụng trong quá trình phát triển)
Công cụ & nền tảng
•	Git & GitHub: Quản lý mã nguồn và làm việc nhóm
•	Visual Studio Code: Môi trường phát triển
________________________________________
4. Kiến trúc hệ thống
Hệ thống được xây dựng theo mô hình Client – Server kết hợp với kiến trúc phân tầng (Layered Architecture):
•	Presentation Layer: Giao diện web (Frontend)
•	Application / Service Layer: FastAPI xử lý logic nghiệp vụ
•	Data Layer: Cơ sở dữ liệu SQLite
Luồng hoạt động tổng quát:
Frontend → FastAPI (API) → Database → FastAPI → Frontend
________________________________________
5. Cấu trúc thư mục
chieuCN/
│
├── app/
│   ├── main.py
│   ├── models/
│   ├── routers/
│   ├── schemas/
│   └── database.py
│
├── migrations/
│   └── alembic
│
├── requirements.txt
├── alembic.ini
├── time_tracking.db
└── README.md
________________________________________
6. Hướng dẫn cài đặt & chạy hệ thống
6.1. Yêu cầu môi trường
•	Python >= 3.9
6.2. Cài đặt backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
Sau khi chạy thành công, truy cập API docs tại:
http://127.0.0.1:8000/docs
_______________________________________
7. Nhóm thực hiện
1.Họ và Tên:Trần Khánh Bình
MSSV:23050151
Trường: Đại học Bình Dương Môn
Phát triển ứng dụng mã nguồn mở

2.Họ và Tên:Bùi Nguyễn Đức Thắng
MSSV:23050144
Trường: Đại học Bình Dương Môn
Phát triển ứng dụng mã nguồn mở

Giảng viên hướng dẫn: Th.S Lê Duy Hùng
________________________________________
9. Giấy phép (License)
Dự án được phát triển cho mục đích học tập và nghiên cứu trong khuôn khổ môn học Phát triển ứng dụng mã nguồn mở.
