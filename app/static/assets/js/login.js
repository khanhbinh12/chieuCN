document.addEventListener('DOMContentLoaded', function () {
    // 1. Kiểm tra sự tồn tại của APIClient
    if (typeof api === 'undefined') {
        console.error("Lỗi: Chưa load thư viện 'api.js'.");
        alert("Lỗi hệ thống: Không tìm thấy API Client.");
        return;
    }

    // 2. Lấy các element từ DOM
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const errorContainer = document.getElementById('errorMessage'); // Đảm bảo HTML có thẻ này, hoặc xóa dòng này đi

    // 3. Validate DOM elements
    if (!loginForm || !emailInput || !passwordInput || !loginBtn) {
        console.error("Lỗi HTML: Thiếu ID (loginForm, email, password, hoặc loginBtn).");
        return;
    }

    // 4. Xử lý sự kiện Submit
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault(); // Ngăn trình duyệt reload trang

        // Reset thông báo lỗi cũ
        if (errorContainer) {
            errorContainer.textContent = '';
            errorContainer.style.display = 'none';
        }
        
        // Lấy dữ liệu
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validate cơ bản
        if (!email || !password) {
            showError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
            return;
        }

        // --- BẮT ĐẦU GỌI API ---
        
        // 1. Khóa nút để tránh click nhiều lần
        setLoadingState(true);

        try {
            // 2. Gọi hàm login từ api.js
            // Hàm này sẽ lưu Token vào LocalStorage
            await api.login(email, password);
            
            console.log("Đăng nhập thành công! Đang chuyển hướng...");
            
            // 3. --- QUAN TRỌNG NHẤT: CHUYỂN TRANG TẠI ĐÂY ---
            window.location.href = 'dashboard.html'; 
            
        } catch (error) {
            // 4. Xử lý lỗi
            console.error("Login Error:", error);
            
            let msg = error.message;
            if (msg.includes('Failed to fetch')) msg = 'Không thể kết nối đến Server.';
            // Một số server trả về 400 hoặc 401
            if (msg.includes('401') || msg.includes('400')) msg = 'Sai email hoặc mật khẩu.';
            
            showError(msg);
            
            // Nếu lỗi thì mở lại nút để bấm lại (được xử lý ở finally)
        } finally {
            // 5. Mở lại nút (Chỉ cần thiết nếu đăng nhập lỗi, nhưng để đây cho chắc)
            // Lưu ý: Nếu chuyển trang thành công thì dòng này có chạy cũng không sao vì trang đã load lại sang dashboard.
            setLoadingState(false);
        }
    });

    // --- HELPER FUNCTIONS ---

    function setLoadingState(isLoading) {
        if (isLoading) {
            loginBtn.textContent = 'Đang xử lý...';
            loginBtn.disabled = true;
            emailInput.disabled = true;
            passwordInput.disabled = true;
            loginBtn.style.cursor = 'not-allowed';
            loginBtn.style.opacity = '0.7';
        } else {
            loginBtn.textContent = 'Đăng nhập';
            loginBtn.disabled = false;
            emailInput.disabled = false;
            passwordInput.disabled = false;
            loginBtn.style.cursor = 'pointer';
            loginBtn.style.opacity = '1';
        }
    }

    function showError(message) {
        if (errorContainer) {
            errorContainer.style.color = '#e74c3c';
            errorContainer.style.backgroundColor = '#fadbd8';
            errorContainer.style.padding = '10px';
            errorContainer.style.borderRadius = '5px';
            errorContainer.style.marginTop = '10px';
            errorContainer.style.textAlign = 'center';
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
        } else {
            alert(message);
        }
    }
});