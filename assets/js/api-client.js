const API_CONFIG = {
    // ⚠️ Đảm bảo đúng port Backend của bạn (thường là 8000)
    baseURL: 'http://localhost:8000',
};

class APIClient {
    constructor() {
        this.baseURL = API_CONFIG.baseURL;
    }

    getToken() {
        return localStorage.getItem('access_token');
    }

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

    /**
     * Hàm request chung cho toàn bộ ứng dụng.
     * - Tự thêm baseURL
     * - Tự thêm Authorization header nếu cần
     * - Tự xử lý lỗi 401, 422, 204, ...
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        // Tách các option thường dùng
        const {
            requireAuth = true,
            headers: customHeaders = {},
            ...restOptions
        } = options;

        // Gộp headers mặc định + custom headers (nếu có)
        const headers = {
            ...this.getHeaders(requireAuth),
            ...customHeaders,
        };

        const config = {
            headers,
            ...restOptions,
        };

        try {
            const response = await fetch(url, config);

            // 1. Token hết hạn (401) -> Tự động logout
            if (response.status === 401) {
                localStorage.removeItem('access_token');
                // Có thể xoá thêm user_info nếu bạn lưu
                localStorage.removeItem('user_info');
                window.location.href = 'login.html';
                throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            }

            // 2. Xử lý lỗi từ Server trả về
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Lỗi validation (422) của FastAPI
                if (response.status === 422 && Array.isArray(errorData.detail)) {
                    const detailMsg = errorData.detail
                        .map(err => {
                            const fieldName = err.loc[err.loc.length - 1];
                            return `• ${fieldName}: ${err.msg}`;
                        })
                        .join('\n');
                    throw new Error("Dữ liệu không hợp lệ:\n" + detailMsg);
                }

                // Các lỗi khác
                throw new Error(errorData.detail || errorData.message || `Lỗi Server (${response.status})`);
            }

            // 3. 204 No Content
            if (response.status === 204) {
                return null;
            }

            // 4. Các status 2xx có body JSON
            return await response.json();
        } catch (error) {
            console.error("API Request Failed:", error);
            // Có thể popup toast ở đây nếu bạn có UI
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
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Đăng nhập thất bại');
            }

            return await response.json();
        } catch (error) {
            console.error('Login Failed:', error);
            throw error;
        }
    }

    async register(userData) {
        // Gọi qua hàm request chung để tận dụng xử lý lỗi 422
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
            requireAuth: false, // Đăng ký không cần token
        });
    }

    // --- PROJECTS ---

    async getProjects() {
        return this.request('/projects/');
    }

    // --- TASKS ---

    async getTasks(projectId) {
        if (!projectId) {
            // Có thể return [] hoặc ném lỗi tuỳ logic của bạn
            throw new Error('projectId không hợp lệ');
        }
        return this.request(`/tasks/?project_id=${projectId}`);
    }

    async createTask(taskData) {
        return this.request('/tasks/', {
            method: 'POST',
            body: JSON.stringify(taskData),
        });
    }

    // --- TIME ENTRIES / TIMER ---

    async startTimer(taskId, note = "") {
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

    // (Optional) Nếu sau này bạn làm daily report:
    // async getDailyReport(date, projectId) {
    //     const params = new URLSearchParams({ report_date: date });
    //     if (projectId) params.append('project_id', projectId);
    //     return this.request(`/reports/daily?${params.toString()}`);
    // }
}

// Export instance để dùng ở các file khác
const api = new APIClient();
