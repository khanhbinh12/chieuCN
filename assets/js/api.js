const API_CONFIG = {
    baseURL: 'http://localhost:8000', // Đảm bảo backend đang chạy ở port này
};

class APIClient {
    constructor() { this.baseURL = API_CONFIG.baseURL; }

    getToken() { return localStorage.getItem('access_token'); }
    
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
        
        const response = await fetch(url, config);
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'login.html'; // Tự động logout nếu hết hạn
            }
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    }

    // --- AUTHENTICATION ---
    async login(username, password) {
        // Form data cho OAuth2
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        return fetch(`${this.baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        }).then(res => res.json());
    }

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
            requireAuth: false
        });
    }

    // --- PROJECT & TASKS ---
    async getProjects() {
        return this.request('/projects/');
    }

    async getTasks(projectId) {
        return this.request(`/tasks/?project_id=${projectId}`);
    }

    async createTask(taskData) {
        return this.request('/tasks/', {
            method: 'POST',
            body: JSON.stringify(taskData),
        });
    }

    // --- TIME TRACKING (MỚI) ---
    async startTimer(taskId, note = "") {
        return this.request('/time-entries/start', {
            method: 'POST',
            body: JSON.stringify({ task_id: taskId, note: note }),
        });
    }

    async stopTimer() {
        return this.request('/time-entries/stop', {
            method: 'POST',
            body: JSON.stringify({}),
        });
    }
}

const api = new APIClient();