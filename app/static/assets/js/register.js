// register.js - Xử lý đăng ký người dùng

const API_BASE_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', function () {
    // Kiểm tra nếu đã đăng nhập thì hiển thị thông báo
    const token = localStorage.getItem('access_token');
    if (token) {
        showAlert('Bạn đã đăng nhập. Nếu muốn đăng ký tài khoản mới, hãy đăng xuất trước.', 'info');
        // Không redirect, cho phép ở lại trang register
    }

    const registerForm = document.getElementById('registerForm');

    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const fullname = document.getElementById('fullname').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm_password').value;

        // Validation
        if (!username || !fullname || !email || !password || !confirmPassword) {
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
                    username: username,
                    full_name: fullname,
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