// register.js - Xử lý đăng ký người dùng

const API_BASE_URL = 'http://localhost:8000/api';

document.addEventListener('DOMContentLoaded', function () {
    // Kiểm tra nếu đã đăng nhập thì chuyển đến dashboard
    const token = localStorage.getItem('jwt_token');
    if (token) {
        window.location.href = 'dashboard.html';
        return;
    }

    const registerForm = document.getElementById('registerForm');

    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const fullname = document.getElementById('fullname').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm_password').value;

        // Validation
        if (!fullname || !email || !password || !confirmPassword) {
            showAlert('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Mật khẩu không khớp!', 'error');
            return;
        }

        if (password.length < 6) {
            showAlert('Mật khẩu phải có ít nhất 6 ký tự!', 'error');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Email không hợp lệ!', 'error');
            return;
        }

        try {
            // Gọi API đăng ký
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fullname: fullname,
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                showAlert('Đăng ký thành công! Đang chuyển đến trang đăng nhập...', 'success');

                // Chuyển đến trang login sau 2 giây
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showAlert(data.detail || 'Đăng ký thất bại!', 'error');
            }
        } catch (error) {
            console.error('Register error:', error);
            showAlert('Không thể kết nối đến server. Vui lòng thử lại!', 'error');
        }
    });
});

function showAlert(message, type) {
    // Xóa alert cũ nếu có
    const oldAlert = document.querySelector('.alert');
    if (oldAlert) {
        oldAlert.remove();
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    const form = document.getElementById('registerForm');
    form.parentNode.insertBefore(alert, form);

    // Auto remove sau 5 giây
    setTimeout(() => {
        alert.remove();
    }, 5000);
}