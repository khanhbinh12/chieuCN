class AuthManager {
    constructor() { this.init(); }

    init() {
        const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html');
        
        if (isAuthPage) {
            this.setupForms();
        } else {
            if (!this.isLoggedIn()) {
                window.location.href = 'login.html';
            } else {
                this.displayUserInfo();
                document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
            }
        }
    }

    isLoggedIn() { return !!localStorage.getItem('access_token'); }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        window.location.href = 'login.html';
    }

    displayUserInfo() {
        const user = JSON.parse(localStorage.getItem('user_info') || '{}');
        const el = document.getElementById('currentUser');
        if (el) el.textContent = user.full_name || user.username || 'User';
    }

    setupForms() {
        // Login Logic
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = loginForm.username.value;
                const password = loginForm.password.value;
                try {
                    const data = await api.login(username, password);
                    if (data.access_token) {
                        localStorage.setItem('access_token', data.access_token);
                        // Lấy thêm info user
                        // (Tạm thời lưu username, thực tế nên gọi API /users/me)
                        localStorage.setItem('user_info', JSON.stringify({ username }));
                        window.location.href = 'index.html';
                    } else {
                        alert('Đăng nhập thất bại!');
                    }
                } catch (err) { alert('Lỗi: ' + err.message); }
            });
        }

        // Register Logic
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = {
                    username: registerForm.username.value,
                    email: registerForm.email.value,
                    password: registerForm.password.value,
                    full_name: registerForm.fullName.value
                };
                try {
                    await api.register(data);
                    alert('Đăng ký thành công! Hãy đăng nhập.');
                    window.location.href = 'login.html';
                } catch (err) { alert('Lỗi: ' + err.message); }
            });
        }
    }
}

window.authManager = new AuthManager();