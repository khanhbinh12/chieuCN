class APIClient {
    constructor() {
        this.baseURL = 'http://127.0.0.1:8000';  // Đảm bảo đúng port backend
    }

    // Lấy token từ localStorage hoặc sessionStorage
    getToken() {
        return localStorage.getItem('access_token');  // Hoặc sessionStorage.getItem nếu bạn muốn dùng sessionStorage
    }

    // Lấy headers cho yêu cầu, bao gồm Authorization nếu cần
    getHeaders(includeAuth = true) {
        const headers = { 'Content-Type': 'application/json' };
        if (includeAuth) {
            const token = this.getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    // Phương thức request chung
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(options.requireAuth !== false),
            ...options,
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                if (response.status === 401) {
                    // Xóa token và thông tin người dùng khi hết hạn token
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('user_info');
                    window.location.href = '/login.html';  // Điều hướng về trang đăng nhập
                }
                throw new Error(`API Error: ${response.statusText}`);
            }
            return response.json(); // Trả về kết quả JSON
        } catch (error) {
            console.error("Request failed", error);
            alert("Có lỗi xảy ra, vui lòng thử lại.");
            throw error; // Đảm bảo lỗi được ném ra để có thể xử lý ở ngoài
        }
    }

    // Phương thức đăng nhập
    async login(username, password) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.access_token) {
                // Lưu JWT token vào localStorage
                localStorage.setItem('access_token', data.access_token);

                // Sau khi đăng nhập, lấy thông tin người dùng
                const userInfo = await this.getUserInfo();
                localStorage.setItem('user_info', JSON.stringify(userInfo));  // Lưu thông tin người dùng

                // Điều hướng đến trang dashboard
                window.location.href = '/dashboard.html';  // Điều hướng đến trang dashboard

                return data;
            } else {
                throw new Error(data.detail || 'Đăng nhập thất bại');
            }
        } catch (error) {
            console.error('Login failed: ', error);
            alert('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!');
            throw error;
        }
    }

    // Phương thức đăng ký
    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                throw new Error('Đăng ký thất bại');
            }

            return await response.json();
        } catch (error) {
            console.error('Registration failed: ', error);
            alert('Đăng ký thất bại. Vui lòng thử lại!');
            throw error;
        }
    }

    // Lấy thông tin người dùng hiện tại
    async getUserInfo() {
        return this.request('/auth/me', { method: 'GET' });
    }

    // Phương thức đăng xuất
    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        window.location.href = '/login.html';  // Điều hướng đến trang đăng nhập
    }
}

// Khởi tạo đối tượng APIClient
const api = new APIClient();