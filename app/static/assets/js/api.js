class APIClient {
    constructor() {
        this.baseURL = 'http://127.0.0.1:8000';  // Đảm bảo đúng port backend
    }

    // Lấy token từ localStorage
    getToken() {
        return localStorage.getItem('access_token');
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
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('user_info');
                    window.location.href = '/static/login.html';
                }
                throw new Error(`API Error: ${response.statusText}`);
            }
            return response.json();
        } catch (error) {
            console.error("Request failed", error);
            alert("Có lỗi xảy ra, vui lòng thử lại.");
            throw error;
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

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);

            // Sau khi đăng nhập, lấy thông tin người dùng
            const userInfo = await this.getUserInfo();
            localStorage.setItem('user_info', JSON.stringify(userInfo));

            return data;
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
                throw new Error('Registration failed');
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
}

// Khởi tạo đối tượng APIClient
const api = new APIClient();
