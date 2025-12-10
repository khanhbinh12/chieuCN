document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();  // Ngừng hành động mặc định của form (tức là không reload trang)

    // Lấy giá trị username và password từ các ô nhập liệu
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Hiển thị thông báo khi đang gửi yêu cầu (optional)
    const loginBtn = document.getElementById("loginBtn");
    loginBtn.textContent = "Đang đăng nhập...";  // Cập nhật nút đăng nhập
    loginBtn.disabled = true; // Vô hiệu hóa nút đăng nhập trong quá trình gửi yêu cầu

    // Gửi yêu cầu POST đến backend để xác thực đăng nhập
    fetch('http://127.0.0.1:8000/auth/login', {  // Đảm bảo API này tồn tại và đúng địa chỉ
        method: 'POST',  // Đảm bảo sử dụng phương thức POST
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',  // Sử dụng đúng kiểu dữ liệu
        },
        body: new URLSearchParams({
            'username': username,
            'password': password
        })
    })
    .then(response => response.json())  // Chuyển đổi phản hồi thành JSON
    .then(data => {
        if (data.access_token) {
            localStorage.setItem('access_token', data.access_token);  // Lưu token vào localStorage
            localStorage.setItem('user_info', JSON.stringify(data.user));  // Lưu thông tin người dùng
            window.location.href = '/';  // Chuyển đến trang chủ index.html sau khi đăng nhập thành công
        } else {
            alert('Tên đăng nhập hoặc mật khẩu sai');
            loginBtn.textContent = "Đăng nhập";  // Cập nhật lại nút đăng nhập
            loginBtn.disabled = false;  // Bật lại nút đăng nhập
        }
    })
    .catch(error => {
        console.error('Lỗi:', error);
        alert('Đã có lỗi xảy ra, vui lòng thử lại');
        loginBtn.textContent = "Đăng nhập";  // Cập nhật lại nút đăng nhập
        loginBtn.disabled = false;  // Bật lại nút đăng nhập
    });
});
