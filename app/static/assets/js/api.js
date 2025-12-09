// api.js

class APIClient {
    constructor() {
        this.baseURL = 'http://localhost:8000'; // Đảm bảo backend đang chạy ở đúng port
    }

    getToken() {
        return localStorage.getItem('access_token');
    }

    getHeaders(includeAuth = true) {
        const headers = { 'Content-Type': 'application/json' };
        if (includeAuth) {
            const token = this.getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

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
                    window.location.href = '/login.html';
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

    // --- AUTHENTICATION ---
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

            return data;
        } catch (error) {
            console.error('Login failed: ', error);
            alert('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!');
            throw error;
        }
    }

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
            requireAuth: false
        });
    }

    async getUserInfo() {
        return this.request('/auth/me', { method: 'GET' });
    }
}

// Khởi tạo API client
const api = new APIClient();
