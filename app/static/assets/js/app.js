const Storage = {
    // Projects
    getProjects() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.PROJECTS);
        return data ? JSON.parse(data) : [];
    },

    saveProjects(projects) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    },

    addProject(project) {
        const projects = this.getProjects();
        project.id = Utils.generateId();
        project.createdAt = new Date().toISOString();
        projects.push(project);
        this.saveProjects(projects);
        return project;
    },

    updateProject(projectId, updates) {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            projects[index] = { ...projects[index], ...updates };
            this.saveProjects(projects);
            return projects[index];
        }
        return null;
    },

    deleteProject(projectId) {
        let projects = this.getProjects();
        projects = projects.filter(p => p.id !== projectId);
        this.saveProjects(projects);
        
        // Xóa luôn các tasks của project
        let tasks = this.getTasks();
        tasks = tasks.filter(t => t.projectId !== projectId);
        this.saveTasks(tasks);
    },

    getProjectById(projectId) {
        const projects = this.getProjects();
        return projects.find(p => p.id === projectId);
    },

    // Tasks
    getTasks() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.TASKS);
        return data ? JSON.parse(data) : [];
    },

    saveTasks(tasks) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    },

    addTask(task) {
        const tasks = this.getTasks();
        task.id = Utils.generateId();
        task.createdAt = new Date().toISOString();
        tasks.push(task);
        this.saveTasks(tasks);
        return task;
    },

    updateTask(taskId, updates) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            tasks[index] = { ...tasks[index], ...updates };
            this.saveTasks(tasks);
            return tasks[index];
        }
        return null;
    },

    deleteTask(taskId) {
        let tasks = this.getTasks();
        tasks = tasks.filter(t => t.id !== taskId);
        this.saveTasks(tasks);
    },

    getTaskById(taskId) {
        const tasks = this.getTasks();
        return tasks.find(t => t.id === taskId);
    },

    getTasksByProject(projectId) {
        const tasks = this.getTasks();
        return tasks.filter(t => t.projectId === projectId);
    },

    // Tracking Entries
    getTrackingEntries() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.TRACKING_ENTRIES);
        return data ? JSON.parse(data) : [];
    },

    saveTrackingEntries(entries) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TRACKING_ENTRIES, JSON.stringify(entries));
    },

    addTrackingEntry(entry) {
        const entries = this.getTrackingEntries();
        entry.id = Utils.generateId();
        entries.push(entry);
        this.saveTrackingEntries(entries);
        return entry;
    },

    updateTrackingEntry(entryId, updates) {
        const entries = this.getTrackingEntries();
        const index = entries.findIndex(e => e.id === entryId);
        if (index !== -1) {
            entries[index] = { ...entries[index], ...updates };
            this.saveTrackingEntries(entries);
            return entries[index];
        }
        return null;
    },

    deleteTrackingEntry(entryId) {
        let entries = this.getTrackingEntries();
        entries = entries.filter(e => e.id !== entryId);
        this.saveTrackingEntries(entries);
    },

    getEntriesByDate(date) {
        const entries = this.getTrackingEntries();
        return entries.filter(e => e.date === date);
    },

    getEntriesByDateRange(startDate, endDate) {
        const entries = this.getTrackingEntries();
        return entries.filter(e => e.date >= startDate && e.date <= endDate);
    },

    // Timer State
    getTimerState() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.TIMER_STATE);
        return data ? JSON.parse(data) : null;
    },

    saveTimerState(state) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TIMER_STATE, JSON.stringify(state));
    },

    clearTimerState() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TIMER_STATE);
    }
};

// ============================================
// AUTHENTICATION MODULE
// ============================================

const Auth = {
    async login(email, password) {
        try {
            // TODO: Thay bằng API call thực tế
            // const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ email, password })
            // });
            
            // Giả lập login thành công
            const fakeToken = 'fake_jwt_token_' + Date.now();
            const fakeUser = {
                id: '1',
                email: email,
                fullname: 'User Demo'
            };
            
            Utils.setToken(fakeToken);
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(fakeUser));
            
            return { success: true, token: fakeToken, user: fakeUser };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    },

    async register(fullname, email, password) {
        try {
            // TODO: Thay bằng API call thực tế
            // const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ fullname, email, password })
            // });
            
            // Giả lập register thành công
            const fakeToken = 'fake_jwt_token_' + Date.now();
            const fakeUser = {
                id: Utils.generateId(),
                email: email,
                fullname: fullname
            };
            
            Utils.setToken(fakeToken);
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(fakeUser));
            
            return { success: true, token: fakeToken, user: fakeUser };
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, error: error.message };
        }
    },

    logout() {
        Utils.clearToken();
        Storage.clearTimerState();
        window.location.href = 'login.html';
    },

    getCurrentUser() {
        const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        return userData ? JSON.parse(userData) : null;
    }
};

// ============================================
// TIMER MODULE
// ============================================

const Timer = {
    interval: null,
    
    start(taskId, projectId) {
        const task = Storage.getTaskById(taskId);
        const project = Storage.getProjectById(projectId);
        
        if (!task || !project) {
            Utils.showAlert('Không tìm thấy task hoặc project', 'error');
            return false;
        }

        const state = {
            taskId: taskId,
            projectId: projectId,
            taskName: task.name,
            projectName: project.name,
            startTime: Date.now(),
            pausedTime: 0,
            isPaused: false,
            isRunning: true
        };

        Storage.saveTimerState(state);
        return true;
    },

    pause() {
        const state = Storage.getTimerState();
        if (!state || !state.isRunning) return false;

        state.pausedTime = Date.now() - state.startTime;
        state.isPaused = true;
        Storage.saveTimerState(state);
        return true;
    },

    resume() {
        const state = Storage.getTimerState();
        if (!state || !state.isPaused) return false;

        state.startTime = Date.now() - state.pausedTime;
        state.isPaused = false;
        Storage.saveTimerState(state);
        return true;
    },

    stop() {
        const state = Storage.getTimerState();
        if (!state) return null;

        const duration = state.pausedTime || (Date.now() - state.startTime);
        
        const entry = {
            taskId: state.taskId,
            projectId: state.projectId,
            date: Utils.formatDate(new Date()),
            startTime: new Date(state.startTime).toISOString(),
            endTime: new Date(state.startTime + duration).toISOString(),
            duration: duration,
            durationHours: parseFloat(Utils.msToHours(duration)),
            note: ''
        };

        Storage.clearTimerState();
        return entry;
    },

    getState() {
        return Storage.getTimerState();
    },

    getElapsedTime() {
        const state = Storage.getTimerState();
        if (!state) return 0;

        if (state.isPaused) {
            return state.pausedTime;
        } else if (state.isRunning) {
            return Date.now() - state.startTime;
        }
        return 0;
    }
};

// ============================================
// STATISTICS MODULE
// ============================================

const Statistics = {
    getTotalHoursByDate(date) {
        const entries = Storage.getEntriesByDate(date);
        return entries.reduce((sum, entry) => sum + entry.durationHours, 0);
    },

    getTotalHoursByDateRange(startDate, endDate) {
        const entries = Storage.getEntriesByDateRange(startDate, endDate);
        return entries.reduce((sum, entry) => sum + entry.durationHours, 0);
    },

    getProjectSummary(startDate, endDate) {
        const entries = Storage.getEntriesByDateRange(startDate, endDate);
        const projects = Storage.getProjects();
        const summary = {};

        entries.forEach(entry => {
            const projectId = entry.projectId;
            if (!summary[projectId]) {
                const project = projects.find(p => p.id === projectId);
                summary[projectId] = {
                    projectId: projectId,
                    projectName: project ? project.name : 'Unknown',
                    taskCount: 0,
                    totalHours: 0,
                    entries: []
                };
            }
            summary[projectId].taskCount++;
            summary[projectId].totalHours += entry.durationHours;
            summary[projectId].entries.push(entry);
        });

        return Object.values(summary);
    },

    getDailySummary(startDate, endDate) {
        const entries = Storage.getEntriesByDateRange(startDate, endDate);
        const summary = {};

        entries.forEach(entry => {
            const date = entry.date;
            if (!summary[date]) {
                summary[date] = {
                    date: date,
                    taskCount: 0,
                    totalHours: 0,
                    projects: new Set(),
                    entries: []
                };
            }
            summary[date].taskCount++;
            summary[date].totalHours += entry.durationHours;
            summary[date].projects.add(entry.projectId);
            summary[date].entries.push(entry);
        });

        // Convert Set to Array and get project names
        Object.values(summary).forEach(day => {
            const projectNames = Array.from(day.projects).map(projectId => {
                const project = Storage.getProjectById(projectId);
                return project ? project.name : 'Unknown';
            });
            day.projectNames = projectNames.join(', ');
            delete day.projects;
        });

        return Object.values(summary);
    },

    getTopTasks(startDate, endDate, limit = 10) {
        const entries = Storage.getEntriesByDateRange(startDate, endDate);
        const tasks = Storage.getTasks();
        const taskSummary = {};

        entries.forEach(entry => {
            const taskId = entry.taskId;
            if (!taskSummary[taskId]) {
                const task = tasks.find(t => t.id === taskId);
                const project = Storage.getProjectById(entry.projectId);
                taskSummary[taskId] = {
                    taskId: taskId,
                    taskName: task ? task.name : 'Unknown',
                    projectName: project ? project.name : 'Unknown',
                    totalHours: 0,
                    count: 0
                };
            }
            taskSummary[taskId].totalHours += entry.durationHours;
            taskSummary[taskId].count++;
        });

        return Object.values(taskSummary)
            .sort((a, b) => b.totalHours - a.totalHours)
            .slice(0, limit);
    }
};

// ============================================
// EXPORT MODULE
// ============================================

const Export = {
    toCSV(data, filename) {
        if (!data || data.length === 0) return;

        const keys = Object.keys(data[0]);
        const csvContent = [
            keys.join(','),
            ...data.map(row => keys.map(key => {
                const value = row[key];
                return typeof value === 'string' && value.includes(',') 
                    ? `"${value}"` 
                    : value;
            }).join(','))
        ].join('\n');

        this.downloadFile(csvContent, filename, 'text/csv');
    },

    toJSON(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, filename, 'application/json');
    },

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

// ============================================
// INITIALIZE DEMO DATA
// ============================================

function initDemoData() {
    // Kiểm tra xem đã có dữ liệu chưa
    if (Storage.getProjects().length > 0) return;

    // Tạo demo projects
    const project1 = Storage.addProject({
        name: 'Project Demo 1',
        description: 'Đây là project mẫu để demo giao diện'
    });

    const project2 = Storage.addProject({
        name: 'Project Demo 2',
        description: 'Project demo thứ hai'
    });

    // Tạo demo tasks
    Storage.addTask({
        projectId: project1.id,
        name: 'Task Demo 1',
        description: 'Task mẫu 1',
        estimatedHours: 3.0
    });

    Storage.addTask({
        projectId: project1.id,
        name: 'Task Demo 2',
        description: 'Task mẫu 2',
        estimatedHours: 2.5
    });

    Storage.addTask({
        projectId: project2.id,
        name: 'Task Demo 3',
        description: 'Task mẫu 3',
        estimatedHours: 4.0
    });

    // Tạo demo tracking entries
    const today = Utils.formatDate(new Date());
    const yesterday = Utils.formatDate(new Date(Date.now() - 86400000));

    Storage.addTrackingEntry({
        taskId: Storage.getTasks()[0].id,
        projectId: project1.id,
        date: today,
        startTime: new Date(Date.now() - 9000000).toISOString(),
        endTime: new Date(Date.now() - 0).toISOString(),
        duration: 9000000,
        durationHours: 2.5,
        note: 'Hoàn thành feature X'
    });

    console.log('Demo data initialized');
}

// ============================================
// EXPORT GLOBAL OBJECTS
// ============================================

window.TimeTrackingApp = {
    Utils,
    Storage,
    Auth,
    Timer,
    Statistics,
    Export,
    initDemoData
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initDemoData();
    console.log('Time Tracking App loaded');
});