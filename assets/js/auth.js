class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        const path = window.location.pathname;
        const isAuthPage =
            path.includes('login.html') || path.includes('register.html');
        const hasToken = this.isLoggedIn();

        // 1. Guard điều hướng
        if (isAuthPage && hasToken) {
            // Đã login mà cố vào login/register -> về index
            window.location.href = 'index.html';
            return;
        }

        if (!isAuthPage && !hasToken) {
            // Chưa login mà vào trang trong -> ép về login
            if (!path.endsWith('/') && !path.includes('index.html')) {
                // Có thể để page public ở đây nếu muốn
            } else {
                window.location.href = 'login.html';
                return;
            }
        }

        // 2. Gắn handler cho form
        this.setupForms();

        // 3. Hiển thị info user + nút logout ở trang trong
        if (!isAuthPage) {
            this.displayUserInfo();
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
            }
        }
    }

    isLoggedIn() {
        return !!localStorage.getItem('access_token');
    }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        localStorage.removeItem('current_project_id');
        window.location.href = 'login.html';
    }

    displayUserInfo() {
        try {
            const user = JSON.parse(localStorage.getItem('user_info') || '{}');
            const el = document.getElementById('currentUser');
            if (el) {
                el.textContent = user.full_name || user.username || 'User';
            }
        } catch (e) {
            console.error('Lỗi đọc user info:', e);
        }
    }

    setupForms() {
        // ========== LOGIN ==========
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const btn =
                    document.getElementById('loginBtn') ||
                    loginForm.querySelector('button[type="submit"]');
                const originalText = btn ? btn.textContent : 'Đăng nhập';

                try {
                    if (btn) {
                        btn.textContent = 'Đang xử lý...';
                        btn.disabled = true;
                    }

                    const username = loginForm.username.value;
                    const password = loginForm.password.value;

                    const data = await api.login(username, password);

                    if (data.access_token) {
                        localStorage.setItem('access_token', data.access_token);

                        // Lưu info user (nếu backend trả về)
                        const userInfo = data.user || { username: username };
                        localStorage.setItem(
                            'user_info',
                            JSON.stringify(userInfo)
                        );

                        // Chuyển qua trang chính
                        window.location.href = 'index.html';
                    }
                } catch (err) {
                    alert('Lỗi đăng nhập: ' + (err.message || 'Thất bại'));
                } finally {
                    if (btn) {
                        btn.textContent = originalText;
                        btn.disabled = false;
                    }
                }
            });
        }

        // ========== REGISTER ==========
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const btn =
                    document.getElementById('registerBtn') ||
                    registerForm.querySelector('button[type="submit"]');
                const originalText = btn ? btn.textContent : 'Đăng ký';

                // Lấy dữ liệu
                const username = registerForm.username?.value || '';
                const email = registerForm.email?.value || '';
                const fullName = registerForm.fullName
                    ? registerForm.fullName.value
                    : '';
                const password = registerForm.password?.value || '';
                const confirmPassword =
                    registerForm.confirmPassword?.value || '';

                // Check confirm password
                if (password !== confirmPassword) {
                    alert(
                        'Mật khẩu và xác nhận mật khẩu không khớp, vui lòng nhập lại!'
                    );
                    return;
                }

                const data = {
                    username: username,
                    email: email,
                    password: password,
                    full_name: fullName,
                };

                try {
                    if (btn) {
                        btn.textContent = 'Đang đăng ký...';
                        btn.disabled = true;
                    }

                    await api.register(data);

                    alert(
                        'Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.'
                    );
                    window.location.href = 'login.html';
                } catch (err) {
                    console.error('Chi tiết lỗi đăng ký:', err);
                    alert('Đăng ký thất bại:\n' + (err.message || 'Có lỗi xảy ra'));
                } finally {
                    if (btn) {
                        btn.textContent = originalText;
                        btn.disabled = false;
                    }
                }
            });
        }
    }
}

// Khởi chạy AuthManager
document.addEventListener('DOMContentLoaded', () => {
    if (typeof api === 'undefined') {
        console.error(
            "LỖI: Không tìm thấy biến 'api'. Kiểm tra lại đường dẫn assets/js/api.js trong HTML."
        );
        alert('Lỗi: Chưa tải được thư viện API.');
        return;
    }

    window.authManager = new AuthManager();
});
