// Cấu hình API
const API_CONFIG = {
    // Backend FastAPI đang chạy ở đây
    baseURL: 'http://localhost:8000', // hoặc 'http://127.0.0.1:8000'
};

class APIClient {
    constructor() {
        // Đảm bảo không có dấu / ở cuối để tránh lỗi //auth...
        this.baseURL = API_CONFIG.baseURL.replace(/\/$/, '');
    }

    // Lấy token từ localStorage
    getToken() {
        return localStorage.getItem('access_token');
    }

    // Header mặc định cho JSON request
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    // Hàm xử lý chung cho mọi request JSON (GET/POST/...)
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const {
            requireAuth = true,
            headers: customHeaders = {},
            ...restOptions
        } = options;

        const headers = {
            ...this.getHeaders(requireAuth),
            ...customHeaders,
        };

        const config = {
            // phương thức mặc định là GET nếu không truyền
            method: restOptions.method || 'GET',
            ...restOptions,
            headers,
        };

        try {
            const response = await fetch(url, config);

            // 1. Token hết hạn (401)
            if (response.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_info');
                window.location.href = 'login.html';
                throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            }

            // 2. Các lỗi HTTP khác (400, 403, 404, 500...)
            if (!response.ok) {
                let errorMessage = `API Error: ${response.status} ${response.statusText}`;

                try {
                    const errorData = await response.json();
                    if (errorData.detail) {
                        // FastAPI thường trả {"detail": "Not Found"} hoặc object
                        errorMessage = typeof errorData.detail === 'string'
                            ? errorData.detail
                            : JSON.stringify(errorData.detail);
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch (_) {
                    // không parse được JSON thì dùng message mặc định
                }

                throw new Error(errorMessage);
            }

            // 3. 204 No Content
            if (response.status === 204) {
                return null;
            }

            // 4. Các status 2xx có body JSON
            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    }

    // ================== AUTH ==================

    // Đăng nhập (dùng form-urlencoded theo chuẩn OAuth2PasswordRequestForm)
    async login(username, password) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            if (!response.ok) {
                let errorMessage = 'Đăng nhập thất bại';

                try {
                    const errorData = await response.json();
                    if (errorData.detail) {
                        errorMessage = typeof errorData.detail === 'string'
                            ? errorData.detail
                            : JSON.stringify(errorData.detail);
                    }
                } catch (_) {
                    // bỏ qua, dùng message mặc định
                }

                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            console.error('Login Failed:', error);
            throw error;
        }
    }

    // Đăng ký user mới
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
            requireAuth: false,
        });
    }

    // ================== PROJECT & TASKS ==================

    async getProjects() {
        return this.request('/projects/');
    }

    async getTasks(projectId) {
        if (!projectId) {
            throw new Error('projectId không hợp lệ');
        }
        return this.request(`/tasks/?project_id=${encodeURIComponent(projectId)}`);
    }

    async createTask(taskData) {
        return this.request('/tasks/', {
            method: 'POST',
            body: JSON.stringify(taskData),
        });
    }

    // ================== TIME TRACKING ==================

    async startTimer(taskId, note = '') {
        return this.request('/time-entries/start', {
            method: 'POST',
            body: JSON.stringify({
                task_id: taskId,
                note: note,
            }),
        });
    }

    async stopTimer() {
        return this.request('/time-entries/stop', {
            method: 'POST',
            body: JSON.stringify({}),
        });
    }
}

// Tạo instance dùng cho toàn app
const api = new APIClient();
