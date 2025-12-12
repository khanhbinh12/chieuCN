document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');

    if (!form) {
        console.error('Không tìm thấy form với id="loginForm"');
        return;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        if (!usernameInput || !passwordInput) {
            console.error('Không tìm thấy input username hoặc password');
            alert('Có lỗi xảy ra với form đăng nhập. Vui lòng kiểm tra lại HTML.');
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            alert('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
            return;
        }

        if (loginBtn) {
            loginBtn.textContent = 'Đang đăng nhập...';
            loginBtn.disabled = true;
        }

        fetch(`${window.location.origin}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                // Backend (OAuth2PasswordRequestForm) mong chờ field "username"
                username: username,
                password: password,
            }),
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    const msg = data.detail || 'Tên đăng nhập hoặc mật khẩu sai';
                    throw new Error(msg);
                }

                if (!data.access_token) {
                    throw new Error('Không nhận được access_token từ server');
                }

                localStorage.setItem('access_token', data.access_token);
                if (data.user) {
                    localStorage.setItem('user_info', JSON.stringify(data.user));
                }

                // 🔥 Đăng nhập OK → sang thẳng dashboard
                window.location.href = '/dashboard.html';
            })
            .catch((error) => {
                console.error('Lỗi đăng nhập:', error);
                alert(error.message || 'Đã có lỗi xảy ra, vui lòng thử lại');
            })
            .finally(() => {
                if (loginBtn) {
                    loginBtn.textContent = 'Đăng nhập';
                    loginBtn.disabled = false;
                }
            });
    });
});