class APIClient {
    constructor() {
        // [CONFIG] Thay đổi baseURL khi deploy lên Oracle VM
        this.baseURL = 'http://127.0.0.1:8000';
        this.tokenKey = 'access_token';
        this.userKey = 'user_info';
    }

    // ============ TOKEN MANAGEMENT ============
    
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    getUserInfo() {
        const data = localStorage.getItem(this.userKey);
        return data ? JSON.parse(data) : null;
    }

    setUserInfo(user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    clearAuth() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }

    // ============ CORE REQUEST ============
    
    getHeaders(includeAuth = true) {
        const headers = {};
        if (includeAuth) {
            const token = this.getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') 
            ? endpoint 
            : `${this.baseURL}${endpoint}`;
        
        const config = {
            method: options.method || 'GET',
            headers: {
                ...this.getHeaders(options.requireAuth !== false),
                ...options.headers
            }
        };

        // Handle body - Support multiple formats
        if (options.body) {
            if (options.body instanceof URLSearchParams) {
                // Form data - browser tự set Content-Type
                config.body = options.body;
            } else if (options.body instanceof FormData) {
                // File upload - browser tự set Content-Type
                config.body = options.body;
            } else if (typeof options.body === 'string') {
                config.body = options.body;
                if (!config.headers['Content-Type']) {
                    config.headers['Content-Type'] = 'application/json';
                }
            } else {
                // Object -> JSON
                config.body = JSON.stringify(options.body);
                config.headers['Content-Type'] = 'application/json';
            }
        }

        try {
            const response = await fetch(url, config);
            
            // Handle 401 Unauthorized
            if (response.status === 401) {
                this.logout();
                throw new Error('Phiên đăng nhập hết hạn.');
            }

            // Handle 204 No Content
            if (response.status === 204) {
                return null;
            }

            // Parse response based on content type
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (contentType && contentType.includes('text/')) {
                data = await response.text();
            } else {
                // Binary data (e.g., file downloads)
                data = await response.blob();
            }

            if (!response.ok) {
                const errorMsg = data.detail || data.message || data || `Lỗi ${response.status}`;
                throw new Error(errorMsg);
            }

            return data;

        } catch (error) {
            console.error(`❌ API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // ============ AUTHENTICATION ============
    
    async login(username, password) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const data = await this.request('/auth/login', {
            method: 'POST',
            body: formData,
            requireAuth: false
        });

        this.setToken(data.access_token);
        
        // Lưu user info
        const userInfo = data.user || { username };
        this.setUserInfo(userInfo);

        return data;
    }

    async register(username, password, email, fullName) {
        return this.request('/auth/register', {
            method: 'POST',
            body: { username, password, email, full_name: fullName },
            requireAuth: false
        });
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    logout() {
        this.clearAuth();
        const currentPath = window.location.pathname;
        if (!currentPath.includes('login.html') && !currentPath.includes('register.html')) {
            window.location.href = 'login.html';
        }
    }

    // ============ PROJECTS ============
    
    async getProjects() {
        return this.request('/projects/');
    }

    async getProject(projectId) {
        return this.request(`/projects/${projectId}`);
    }

    async createProject(name, description, hourlyRate = 0) {
        return this.request('/projects/', {
            method: 'POST',
            body: { name, description, hourly_rate: hourlyRate }
        });
    }

    async updateProject(projectId, data) {
        return this.request(`/projects/${projectId}`, {
            method: 'PUT',
            body: data
        });
    }

    async deleteProject(projectId) {
        return this.request(`/projects/${projectId}`, {
            method: 'DELETE'
        });
    }

    // ============ TASKS ============
    
    async getTasks(projectId = null) {
        const endpoint = projectId 
            ? `/tasks/project/${projectId}` 
            : '/tasks/';
        return this.request(endpoint);
    }

    async getTask(taskId) {
        return this.request(`/tasks/${taskId}`);
    }

    async createTask(taskData) {
        return this.request('/tasks/', {
            method: 'POST',
            body: taskData
        });
    }

    async updateTask(taskId, taskData) {
        return this.request(`/tasks/${taskId}`, {
            method: 'PUT',
            body: taskData
        });
    }

    async deleteTask(taskId) {
        return this.request(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
    }

    // ============ TIME ENTRIES ============
    
    /**
     * START TIMER - Tự động stop timer cũ nếu đang chạy
     */
    async startTimer(taskId, note = '') {
        try {
            // Backend mới - auto-stop timer cũ
            return await this.request('/time-entries/start', {
                method: 'POST',
                body: { task_id: taskId, note }
            });
        } catch (error) {
            // Fallback cho backend cũ
            if (error.message.includes('404')) {
                return await this.request('/time-entries/', {
                    method: 'POST',
                    body: { task_id: taskId, note }
                });
            }
            throw error;
        }
    }

    /**
     * STOP TIMER - Dừng timer đang chạy
     */
    async stopTimer(entryId = null) {
        if (entryId) {
            // Backend cũ - cần entry ID
            return await this.request(`/time-entries/${entryId}/stop`, {
                method: 'PUT'
            });
        } else {
            // Backend mới - không cần ID
            return await this.request('/time-entries/stop', {
                method: 'POST'
            });
        }
    }

    /**
     * GET CURRENT TIMER - Lấy timer đang chạy
     */
    async getCurrentTimer() {
        return await this.request('/time-entries/current');
    }

    /**
     * GET TIME ENTRIES - Với automatic normalization
     * ✅ Xử lý cả array và paginated responses
     * ✅ Tự động normalize format
     */
    async getTimeEntries(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString 
            ? `/time-entries/?${queryString}` 
            : '/time-entries/';
        
        const response = await this.request(endpoint);
        
        // ✅ CRITICAL: Normalize response format
        // Nếu Utils có sẵn, dùng Utils.normalizeEntriesResponse()
        if (typeof Utils !== 'undefined' && Utils.normalizeEntriesResponse) {
            return Utils.normalizeEntriesResponse(response);
        }
        
        // Fallback manual normalization
        if (Array.isArray(response)) {
            return response;
        }
        
        if (response && response.data && Array.isArray(response.data)) {
            return response.data;
        }
        
        console.warn('Unknown response format:', response);
        return [];
    }

    /**
     * GET TIME ENTRIES RAW - Trả về object gốc với pagination info
     * Dùng khi cần total, page, has_next, etc.
     */
    async getTimeEntriesRaw(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString 
            ? `/time-entries/?${queryString}` 
            : '/time-entries/';
        
        return await this.request(endpoint);
    }

    /**
     * GET TIME ENTRY - Lấy 1 entry cụ thể
     */
    async getTimeEntry(entryId) {
        return this.request(`/time-entries/${entryId}`);
    }

    /**
     * UPDATE TIME ENTRY - Cập nhật note hoặc thông tin khác
     */
    async updateTimeEntry(entryId, data) {
        return this.request(`/time-entries/${entryId}`, {
            method: 'PUT',
            body: data
        });
    }

    /**
     * DELETE TIME ENTRY - Xóa 1 entry
     */
    async deleteTimeEntry(entryId) {
        return this.request(`/time-entries/${entryId}`, {
            method: 'DELETE'
        });
    }

    /**
     * BULK DELETE - Xóa nhiều entries cùng lúc
     */
    async bulkDeleteEntries(entryIds) {
        return this.request('/time-entries/bulk-delete', {
            method: 'POST',
            body: entryIds
        });
    }

    /**
     * GET SUMMARY - Thống kê theo khoảng thời gian
     */
    async getTimeSummary(startDate = null, endDate = null) {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        const endpoint = params.toString() 
            ? `/time-entries/summary?${params}` 
            : '/time-entries/summary';
        
        return this.request(endpoint);
    }

    /**
     * GET TODAY STATS - Thống kê hôm nay
     */
    async getTodayStats() {
        try {
            // Thử dùng /summary với date hôm nay
            const today = new Date().toISOString().split('T')[0];
            return await this.getTimeSummary(today, today);
        } catch (error) {
            // Fallback về endpoint cũ nếu có
            if (error.message.includes('404')) {
                return await this.request('/time-entries/stats/today');
            }
            throw error;
        }
    }

    /**
     * GET STATS BY TASK - Thống kê theo task
     */
    async getStatsByTask(startDate = null, endDate = null) {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        const endpoint = params.toString()
            ? `/time-entries/stats/by-task?${params}`
            : '/time-entries/stats/by-task';
        
        return this.request(endpoint);
    }

    /**
     * EXPORT CSV - Download timesheet as CSV
     */
    async exportCsv(startDate = null, endDate = null) {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        const queryString = params.toString();
        const url = queryString 
            ? `${this.baseURL}/time-entries/export/csv?${queryString}`
            : `${this.baseURL}/time-entries/export/csv`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        
        if (!response.ok) {
            throw new Error('Export CSV failed');
        }
        
        return await response.blob();
    }

    /**
     * EXPORT EXCEL - Download timesheet as Excel
     */
    async exportExcel(startDate = null, endDate = null) {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        const queryString = params.toString();
        const url = queryString 
            ? `${this.baseURL}/time-entries/export/excel?${queryString}`
            : `${this.baseURL}/time-entries/export/excel`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        
        if (!response.ok) {
            throw new Error('Export Excel failed');
        }
        
        return await response.blob();
    }

    /**
     * DOWNLOAD FILE HELPER - Tải file từ blob
     */
    downloadFile(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    /**
     * EXPORT AND DOWNLOAD CSV - Tải ngay
     */
    async downloadCsv(startDate = null, endDate = null) {
        try {
            const blob = await this.exportCsv(startDate, endDate);
            const today = new Date().toISOString().split('T')[0];
            const filename = `timesheet_${today}.csv`;
            this.downloadFile(blob, filename);
            return true;
        } catch (error) {
            console.error('Download CSV error:', error);
            throw error;
        }
    }

    /**
     * EXPORT AND DOWNLOAD EXCEL - Tải ngay
     */
    async downloadExcel(startDate = null, endDate = null) {
        try {
            const blob = await this.exportExcel(startDate, endDate);
            const today = new Date().toISOString().split('T')[0];
            const filename = `timesheet_${today}.xlsx`;
            this.downloadFile(blob, filename);
            return true;
        } catch (error) {
            console.error('Download Excel error:', error);
            throw error;
        }
    }
}

// ============ GLOBAL INSTANCE ============
const api = new APIClient();

// ============ DEBUG INFO ============
console.log('✅ API Client v5.0 (Complete) loaded');
console.log('📍 Backend URL:', api.baseURL);
console.log('🔑 Token:', api.getToken() ? 'Present ✓' : 'Missing ✗');

// ============ QUICK REFERENCE ============
console.log(`
📚 API Client Quick Reference:

Authentication:
  - api.login(username, password)
  - api.register(username, password, email, fullName)
  - api.logout()
  - api.getCurrentUser()

Projects:
  - api.getProjects()
  - api.createProject(name, description, hourlyRate)
  - api.updateProject(projectId, data)
  - api.deleteProject(projectId)

Tasks:
  - api.getTasks(projectId)
  - api.createTask(taskData)
  - api.updateTask(taskId, taskData)
  - api.deleteTask(taskId)

Time Entries:
  - api.startTimer(taskId, note)
  - api.stopTimer()
  - api.getCurrentTimer()
  - api.getTimeEntries(params)         ← Normalized array
  - api.getTimeEntriesRaw(params)      ← With pagination
  - api.updateTimeEntry(entryId, data)
  - api.deleteTimeEntry(entryId)
  - api.bulkDeleteEntries(entryIds)

Statistics:
  - api.getTodayStats()
  - api.getTimeSummary(start, end)
  - api.getStatsByTask(start, end)

Export:
  - api.downloadCsv(start, end)
  - api.downloadExcel(start, end)

Utils (if loaded):
  - Utils.parseISOToTimestamp(iso)
  - Utils.formatDateLocal(timestamp)
  - Utils.formatTimeLocal(timestamp)
  - Utils.formatDuration(seconds)
  - Utils.calculateElapsed(timestamp)
`);