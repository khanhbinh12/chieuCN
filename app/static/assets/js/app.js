const App = (() => {
    'use strict';

    // Cấu hình các trang không cần đăng nhập
    const PUBLIC_PAGES = ['login.html', 'register.html'];

    // ============================================================
    // 1. KHỞI TẠO ỨNG DỤNG
    // ============================================================
    function init() {
        if (typeof api === 'undefined') {
            console.error("Critical Error: api.js chưa được load!");
            return;
        }

        // Kiểm tra bảo mật ngay lập tức
        checkAuth();

        // Đợi DOM load xong để xử lý giao diện
        document.addEventListener('DOMContentLoaded', () => {
            setupNavigation();
            setupGlobalEvents();
            highlightActiveMenu();
        });
    }

    // ============================================================
    // 2. LOGIC BẢO MẬT (AUTH GUARD)
    // ============================================================
    function checkAuth() {
        const path = window.location.pathname;
        const page = path.split("/").pop() || 'index.html'; // Lấy tên file
        const token = api.getToken();

        // A. Nếu đang ở trang công khai (Login/Register)
        if (PUBLIC_PAGES.includes(page)) {
            // Nếu đã có token -> Đẩy thẳng vào Dashboard (tránh việc phải login lại)
            if (token) {
                window.location.href = 'dashboard.html';
            }
            return; // Không làm gì thêm
        }

        // B. Nếu đang ở trang nội bộ (Dashboard, Projects...)
        // Mà không có token -> Đá về Login
        if (!token) {
            console.warn("Unauthorized access. Redirecting to login...");
            window.location.href = 'login.html';
        }
    }

    // ============================================================
    // 3. XỬ LÝ GIAO DIỆN TOÀN CỤC
    // ============================================================
    
    // Tự động tô màu menu dựa trên URL hiện tại
    function highlightActiveMenu() {
        const path = window.location.pathname;
        const page = path.split("/").pop();
        
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            // Lấy href của thẻ a (vd: "dashboard.html")
            const href = link.getAttribute('href');
            
            // Xóa class active cũ
            link.classList.remove('active');

            // Nếu href trùng tên file hiện tại -> Thêm active
            if (href === page || (page === '' && href === 'dashboard.html')) {
                link.classList.add('active');
            }
        });
    }

    // Gắn sự kiện cho các nút bấm dùng chung
    function setupGlobalEvents() {
        // Xử lý nút Đăng xuất (ID = logoutBtn) có ở mọi trang
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                    api.logout();
                }
            });
        }
    }

    // Xử lý điều hướng Mobile (nếu sau này cần)
    function setupNavigation() {
        // Placeholder cho logic toggle menu mobile
    }

    // ============================================================
    // 4. EXPORT PUBLIC METHODS (Nếu cần gọi từ file khác)
    // ============================================================
    return {
        init: init,
        // Có thể thêm các hàm tiện ích khác vào đây
        formatDate: (dateString) => {
            if(!dateString) return '';
            return new Date(dateString).toLocaleDateString('vi-VN');
        }
    };

})();

// Tự động chạy App khi file được load
App.init();