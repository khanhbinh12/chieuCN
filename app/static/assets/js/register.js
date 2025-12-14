// assets/js/register.js

document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra API
    if (typeof api === 'undefined') return console.error("Chưa load api.js");

    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Lấy dữ liệu
        const fullname = document.getElementById('fullname').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm_password').value;
        const btn = registerForm.querySelector('button');

        // Validate đơn giản
        if (password !== confirmPassword) {
            alert("Mật khẩu không khớp!");
            return;
        }

        // Gửi request
        btn.textContent = "Đang xử lý...";
        btn.disabled = true;

        try {
            // FIX LỖI 404: Gọi qua api.register sẽ dùng đúng URL /auth/register
            await api.register({
                email: email,
                username: email,    // Map email sang username
                password: password,
                full_name: fullname
            });

            alert("Đăng ký thành công! Hãy đăng nhập.");
            window.location.href = "login.html";

        } catch (error) {
            alert("Lỗi: " + error.message);
            console.error(error);
        } finally {
            btn.textContent = "Đăng ký";
            btn.disabled = false;
        }
    });
});