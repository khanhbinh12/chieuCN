class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        const authPages = ['login.html', 'register.html'];
        const isAuthPage = authPages.some(page => window.location.pathname.includes(page));
        
        if (isAuthPage) {
            this.setupForms();
        } else {
            if (!this.isLoggedIn()) {
                window.location.href = '/static/login.html'; // Chuyển hướng tới login nếu chưa đăng nhập
            } else {
                this.displayUserInfo();
                document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
            }
        }
    }

    isLoggedIn() {
        return !!localStorage.getItem('access_token');
    }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        window.location.href = '/static/login.html'; // Đăng xuất và chuyển hướng về login
    }

    async displayUserInfo() {
        const user = JSON.parse(localStorage.getItem('user_info') || '{}');
        const el = document.getElementById('currentUser');
        if (el) {
            // Nếu có thông tin user trong localStorage, hiển thị thông tin đó
            el.textContent = user.full_name || user.username || 'User';
        }

        // Nếu chưa có thông tin người dùng trong localStorage, gọi API để lấy thông tin người dùng
        if (!user.full_name && user.username) {
            try {
                const userInfo = await api.getUserInfo();
                localStorage.setItem('user_info', JSON.stringify(userInfo));
                if (el) el.textContent = userInfo.full_name || userInfo.username;
            } catch (err) {
                console.error('Không thể tải thông tin người dùng:', err);
            }
        }
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
                        
                        // Lấy thêm thông tin người dùng từ API
                        const userInfo = await api.getUserInfo(); // API lấy thông tin người dùng
                        localStorage.setItem('user_info', JSON.stringify(userInfo));

                        window.location.href = '/static/index.html'; // Chuyển đến trang chính sau khi đăng nhập
                    } else {
                        alert('Đăng nhập thất bại!');
                    }
                } catch (err) {
                    alert('Lỗi: ' + err.message);
                }
            });
        }

        // Register Logic
        const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Lấy dữ liệu từ form
        const data = {
            username: registerForm.username.value,
            email: registerForm.email.value,
            password: registerForm.password.value,
            full_name: registerForm.fullName.value
        };

        try {
            // Gọi API để đăng ký
            const response = await api.register(data);

            if (response && response.success) {
                alert('Đăng ký thành công! Hãy đăng nhập.');
                window.location.href = '/static/login.html'; // Sau khi đăng ký thành công, chuyển hướng đến trang login
            } else {
                alert('Đăng ký thất bại. Vui lòng kiểm tra lại thông tin!');
            }
        } catch (err) {
            // Hiển thị lỗi nếu có
            alert('Lỗi: ' + err.message);
        }
    });
}
    }
}

window.authManager = new AuthManager();
