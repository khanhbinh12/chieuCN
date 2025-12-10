// register.js
class RegisterManager {
    constructor() {
        this.init();
    }

    init() {
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
                    const response = await api.register(data);

                    if (response && response.success) {
                        alert('Đăng ký thành công! Hãy đăng nhập.');
                        window.location.href = '/static/login.html'; // Sau khi đăng ký thành công, chuyển hướng đến trang login
                    } else {
                        alert('Đăng ký thất bại. Vui lòng kiểm tra lại thông tin!');
                    }
                } catch (err) {
                    alert('Lỗi: ' + err.message);
                }
            });
        }
    }
}

// Khởi tạo đối tượng quản lý đăng ký
window.registerManager = new RegisterManager();
