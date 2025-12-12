// app/static/assets/js/app.js
// =====================================================
// TIME TRACKING APP (LocalStorage + Backend Auth)
// - Fix: đồng bộ key, chuẩn hóa kiểu dữ liệu
// - Fix: tách dữ liệu theo user (multi-user safe)
// - Fix: migrate dữ liệu cũ (tt_projects...) sang theo user
// - Fix: demo data OFF mặc định
// =====================================================

(() => {
    'use strict';

    // =====================================================
    // CONFIG
    // =====================================================
    const CONFIG = {
        API_BASE_URL: window.API_BASE_URL || 'http://127.0.0.1:8000',
        ENABLE_DEMO_DATA: false, // <-- mặc định tắt demo data để đỡ rối
        STORAGE_KEYS: {
            // key cũ (legacy - không theo user)
            LEGACY_PROJECTS: 'tt_projects',
            LEGACY_TASKS: 'tt_tasks',
            LEGACY_TRACKING_ENTRIES: 'tt_tracking_entries',
            LEGACY_TIMER_STATE: 'tt_timer_state',

            // auth
            USER_DATA: 'tt_user_data',
            TOKEN: 'access_token',

            // key mới (theo user) - sẽ tạo dạng:
            // tt:<userId>:projects, tt:<userId>:tasks, ...
            PREFIX: 'tt',
            PROJECTS: 'projects',
            TASKS: 'tasks',
            TRACKING_ENTRIES: 'entries',
            TIMER_STATE: 'timer_state',
            MIGRATED_FLAG: 'migrated_v1',
        }
    };

    // =====================================================
    // UTILS
    // =====================================================
    const Utils = {
        generateId() {
            return (
                Date.now().toString(36) +
                Math.random().toString(36).substring(2, 10)
            );
        },

        formatDate(date) {
            const d = (date instanceof Date) ? date : new Date(date);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        },

        // trả về NUMBER (giờ)
        msToHours(ms) {
            const n = Number(ms || 0);
            return n / 3600000;
        },

        // giờ -> ms
        hoursToMs(hours) {
            const n = Number(hours || 0);
            return Math.round(n * 3600000);
        },

        safeJSONParse(str, fallback = null) {
            try {
                return str ? JSON.parse(str) : fallback;
            } catch (e) {
                console.warn('safeJSONParse error:', e);
                return fallback;
            }
        },

        // ===== AUTH / TOKEN =====
        setToken(token) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
        },

        getToken() {
            return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        },

        clearToken() {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        },

        isAuthenticated() {
            return !!this.getToken();
        },

        requireAuth() {
            if (!this.isAuthenticated()) {
                window.location.href = 'login.html';
                return false;
            }
            return true;
        },

        // ===== USER =====
        setCurrentUser(userObj) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(userObj || {}));
        },

        getCurrentUser() {
            const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
            return this.safeJSONParse(raw, null);
        },

        // userId dùng để tách storage
        getUserId() {
            const u = this.getCurrentUser();
            // ưu tiên các field phổ biến
            return (u && (u.id || u.user_id || u.username || u.email)) ? String(u.id || u.user_id || u.username || u.email) : 'guest';
        },

        // ===== EVENT: để các trang có thể tự refresh nếu muốn =====
        emit(eventName, detail = {}) {
            window.dispatchEvent(new CustomEvent(eventName, { detail }));
        },

        // ===== ALERT UI =====
        showAlert(message, type = 'success', timeout = 3000) {
            let container = document.getElementById('globalAlertContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'globalAlertContainer';
                container.style.position = 'fixed';
                container.style.top = '20px';
                container.style.right = '20px';
                container.style.zIndex = '9999';
                container.style.maxWidth = '360px';
                document.body.appendChild(container);
            }

            const alert = document.createElement('div');
            const normalized = (type === 'error' || type === 'info') ? type : 'success';

            // bạn đã có .alert-success / .alert-error / .alert-info ở CSS vài trang
            alert.className = 'alert ' + (
                normalized === 'error' ? 'alert-error' :
                    normalized === 'info' ? 'alert-info' :
                        'alert-success'
            );

            alert.textContent = message;

            container.appendChild(alert);

            setTimeout(() => {
                if (alert.parentNode) alert.parentNode.removeChild(alert);
            }, timeout);
        }
    };

    // =====================================================
    // STORAGE (theo user)
    // =====================================================
    const Storage = {
        // tạo key theo user: tt:<userId>:<name>
        _key(name) {
            const userId = Utils.getUserId();
            const p = CONFIG.STORAGE_KEYS.PREFIX;
            return `${p}:${userId}:${name}`;
        },

        _getArray(name) {
            const raw = localStorage.getItem(this._key(name));
            return Utils.safeJSONParse(raw, []);
        },

        _setArray(name, arr) {
            localStorage.setItem(this._key(name), JSON.stringify(arr || []));
        },

        _getObject(name) {
            const raw = localStorage.getItem(this._key(name));
            return Utils.safeJSONParse(raw, null);
        },

        _setObject(name, obj) {
            localStorage.setItem(this._key(name), JSON.stringify(obj || null));
        },

        _remove(name) {
            localStorage.removeItem(this._key(name));
        },

        // ---------- Projects ----------
        getProjects() {
            return this._getArray(CONFIG.STORAGE_KEYS.PROJECTS);
        },

        saveProjects(projects) {
            this._setArray(CONFIG.STORAGE_KEYS.PROJECTS, projects);
            Utils.emit('tt:data_changed', { type: 'projects' });
        },

        addProject(project) {
            const name = (project?.name || '').trim();
            if (!name) throw new Error('Tên project không được để trống');

            const projects = this.getProjects();
            const newProject = {
                id: Utils.generateId(),
                name,
                description: (project?.description || '').trim(),
                createdAt: new Date().toISOString()
            };
            projects.push(newProject);
            this.saveProjects(projects);
            return newProject;
        },

        updateProject(projectId, updates = {}) {
            const projects = this.getProjects();
            const idx = projects.findIndex(p => p.id === projectId);
            if (idx === -1) return null;

            projects[idx] = {
                ...projects[idx],
                ...updates,
                name: (updates.name != null ? String(updates.name).trim() : projects[idx].name),
                description: (updates.description != null ? String(updates.description).trim() : projects[idx].description),
                updatedAt: new Date().toISOString()
            };

            this.saveProjects(projects);
            return projects[idx];
        },

        deleteProject(projectId) {
            // xóa project
            let projects = this.getProjects().filter(p => p.id !== projectId);
            this.saveProjects(projects);

            // xóa tasks thuộc project
            let tasks = this.getTasks().filter(t => t.projectId !== projectId);
            this.saveTasks(tasks);

            // xóa entries thuộc project
            let entries = this.getTrackingEntries().filter(e => e.projectId !== projectId);
            this.saveTrackingEntries(entries);

            // nếu timer đang chạy project đó -> stop timer
            const st = this.getTimerState();
            if (st && st.projectId === projectId) {
                this.clearTimerState();
            }

            Utils.emit('tt:data_changed', { type: 'project_deleted', projectId });
        },

        getProjectById(projectId) {
            return this.getProjects().find(p => p.id === projectId) || null;
        },

        // ---------- Tasks ----------
        getTasks() {
            return this._getArray(CONFIG.STORAGE_KEYS.TASKS);
        },

        saveTasks(tasks) {
            this._setArray(CONFIG.STORAGE_KEYS.TASKS, tasks);
            Utils.emit('tt:data_changed', { type: 'tasks' });
        },

        addTask(task) {
            const projectId = String(task?.projectId || '').trim();
            const name = (task?.name || '').trim();
            if (!projectId) throw new Error('Task phải thuộc một project');
            if (!name) throw new Error('Tên task không được để trống');

            // đảm bảo project tồn tại
            const p = this.getProjectById(projectId);
            if (!p) throw new Error('Project không tồn tại (hãy tạo project trước)');

            const tasks = this.getTasks();
            const newTask = {
                id: Utils.generateId(),
                projectId,
                name,
                description: (task?.description || '').trim(),
                estimatedHours: task?.estimatedHours != null ? Number(task.estimatedHours) : null,
                createdAt: new Date().toISOString()
            };
            tasks.push(newTask);
            this.saveTasks(tasks);
            return newTask;
        },

        updateTask(taskId, updates = {}) {
            const tasks = this.getTasks();
            const idx = tasks.findIndex(t => t.id === taskId);
            if (idx === -1) return null;

            tasks[idx] = {
                ...tasks[idx],
                ...updates,
                name: (updates.name != null ? String(updates.name).trim() : tasks[idx].name),
                description: (updates.description != null ? String(updates.description).trim() : tasks[idx].description),
                estimatedHours: (updates.estimatedHours != null ? Number(updates.estimatedHours) : tasks[idx].estimatedHours),
                updatedAt: new Date().toISOString()
            };

            this.saveTasks(tasks);
            return tasks[idx];
        },

        deleteTask(taskId) {
            let tasks = this.getTasks().filter(t => t.id !== taskId);
            this.saveTasks(tasks);

            // xóa entries thuộc task
            let entries = this.getTrackingEntries().filter(e => e.taskId !== taskId);
            this.saveTrackingEntries(entries);

            // nếu timer đang chạy task đó -> clear
            const st = this.getTimerState();
            if (st && st.taskId === taskId) {
                this.clearTimerState();
            }

            Utils.emit('tt:data_changed', { type: 'task_deleted', taskId });
        },

        getTaskById(taskId) {
            return this.getTasks().find(t => t.id === taskId) || null;
        },

        getTasksByProject(projectId) {
            return this.getTasks().filter(t => t.projectId === projectId);
        },

        // ---------- Tracking Entries ----------
        getTrackingEntries() {
            return this._getArray(CONFIG.STORAGE_KEYS.TRACKING_ENTRIES);
        },

        saveTrackingEntries(entries) {
            this._setArray(CONFIG.STORAGE_KEYS.TRACKING_ENTRIES, entries);
            Utils.emit('tt:data_changed', { type: 'entries' });
        },

        addTrackingEntry(entry) {
            const entries = this.getTrackingEntries();

            const durationMs = Number(entry?.duration || 0);
            const durationHours = (entry?.durationHours != null)
                ? Number(entry.durationHours)
                : Utils.msToHours(durationMs);

            const newEntry = {
                id: Utils.generateId(),
                taskId: String(entry?.taskId || ''),
                projectId: String(entry?.projectId || ''),
                date: String(entry?.date || Utils.formatDate(new Date())),
                startTime: entry?.startTime || null,
                endTime: entry?.endTime || null,
                duration: durationMs,
                durationHours: Number.isFinite(durationHours) ? durationHours : 0,
                note: (entry?.note || '').trim(),
                createdAt: new Date().toISOString()
            };

            entries.push(newEntry);
            this.saveTrackingEntries(entries);
            return newEntry;
        },

        updateTrackingEntry(entryId, updates = {}) {
            const entries = this.getTrackingEntries();
            const idx = entries.findIndex(e => e.id === entryId);
            if (idx === -1) return null;

            const next = { ...entries[idx], ...updates, updatedAt: new Date().toISOString() };

            // normalize numeric
            if (next.duration != null) next.duration = Number(next.duration) || 0;
            if (next.durationHours != null) next.durationHours = Number(next.durationHours) || Utils.msToHours(next.duration || 0);

            entries[idx] = next;
            this.saveTrackingEntries(entries);
            return entries[idx];
        },

        deleteTrackingEntry(entryId) {
            let entries = this.getTrackingEntries().filter(e => e.id !== entryId);
            this.saveTrackingEntries(entries);
        },

        getEntriesByDate(date) {
            return this.getTrackingEntries().filter(e => e.date === date);
        },

        getEntriesByDateRange(startDate, endDate) {
            const s = String(startDate);
            const e = String(endDate);
            return this.getTrackingEntries().filter(x => x.date >= s && x.date <= e);
        },

        // ---------- Timer State ----------
        getTimerState() {
            return this._getObject(CONFIG.STORAGE_KEYS.TIMER_STATE);
        },

        saveTimerState(state) {
            this._setObject(CONFIG.STORAGE_KEYS.TIMER_STATE, state);
            Utils.emit('tt:data_changed', { type: 'timer' });
        },

        clearTimerState() {
            this._remove(CONFIG.STORAGE_KEYS.TIMER_STATE);
            Utils.emit('tt:data_changed', { type: 'timer' });
        },

        // ---------- MIGRATION: legacy keys -> user keys ----------
        migrateLegacyIfNeeded() {
            const flagKey = this._key(CONFIG.STORAGE_KEYS.MIGRATED_FLAG);
            if (localStorage.getItem(flagKey) === '1') return;

            const legacyProjects = Utils.safeJSONParse(localStorage.getItem(CONFIG.STORAGE_KEYS.LEGACY_PROJECTS), null);
            const legacyTasks = Utils.safeJSONParse(localStorage.getItem(CONFIG.STORAGE_KEYS.LEGACY_TASKS), null);
            const legacyEntries = Utils.safeJSONParse(localStorage.getItem(CONFIG.STORAGE_KEYS.LEGACY_TRACKING_ENTRIES), null);
            const legacyTimer = Utils.safeJSONParse(localStorage.getItem(CONFIG.STORAGE_KEYS.LEGACY_TIMER_STATE), null);

            // chỉ migrate nếu user storage đang trống
            const hasAnyNew =
                this.getProjects().length > 0 ||
                this.getTasks().length > 0 ||
                this.getTrackingEntries().length > 0 ||
                !!this.getTimerState();

            if (!hasAnyNew) {
                if (Array.isArray(legacyProjects)) this.saveProjects(legacyProjects);
                if (Array.isArray(legacyTasks)) this.saveTasks(legacyTasks);
                if (Array.isArray(legacyEntries)) this.saveTrackingEntries(legacyEntries);
                if (legacyTimer) this.saveTimerState(legacyTimer);
            }

            localStorage.setItem(flagKey, '1');
        }
    };

    // =====================================================
    // AUTH (Backend)
    // =====================================================
    const Auth = {
        async login(username, password) {
            const baseURL = CONFIG.API_BASE_URL || window.location.origin;

            try {
                const formData = new URLSearchParams();
                formData.append('username', username);
                formData.append('password', password);

                const response = await fetch(`${baseURL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    const msg = data.detail || 'Tên đăng nhập hoặc mật khẩu sai';
                    return { success: false, error: msg };
                }

                if (!data.access_token) {
                    return { success: false, error: 'Không nhận được access_token từ server' };
                }

                Utils.setToken(data.access_token);

                // lưu user
                if (data.user) {
                    Utils.setCurrentUser(data.user);
                } else {
                    // fallback tối thiểu nếu backend không trả user
                    Utils.setCurrentUser({ username });
                }

                // migrate dữ liệu cũ ngay khi login xong
                Storage.migrateLegacyIfNeeded();

                return { success: true, token: data.access_token, user: data.user || null };
            } catch (error) {
                console.error('Login error:', error);
                return { success: false, error: error.message || 'Lỗi không xác định' };
            }
        },

        async register(username, password, { email = '', fullName = '' } = {}) {
            const baseURL = CONFIG.API_BASE_URL || window.location.origin;

            try {
                const payload = { username, password };
                if (email) payload.email = email;
                if (fullName) payload.full_name = fullName;

                const response = await fetch(`${baseURL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    const msg = data.detail || 'Đăng ký thất bại';
                    return { success: false, error: msg };
                }

                if (data.access_token) Utils.setToken(data.access_token);

                if (data.user) Utils.setCurrentUser(data.user);
                else Utils.setCurrentUser({ username, email });

                // migrate (nếu cần)
                Storage.migrateLegacyIfNeeded();

                return { success: true, user: data.user || null, token: data.access_token || null };
            } catch (error) {
                console.error('Register error:', error);
                return { success: false, error: error.message || 'Lỗi không xác định' };
            }
        },

        logout() {
            Utils.clearToken();
            Storage.clearTimerState();
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
            window.location.href = 'login.html';
        },

        getCurrentUser() {
            return Utils.getCurrentUser();
        }
    };

    // =====================================================
    // TIMER
    // =====================================================
    const Timer = {
        start(taskId, projectId) {
            const task = Storage.getTaskById(taskId);
            const project = Storage.getProjectById(projectId);

            if (!task || !project) {
                Utils.showAlert('Không tìm thấy task hoặc project', 'error');
                return false;
            }

            const state = {
                taskId,
                projectId,
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
            if (!state || !state.isRunning || state.isPaused) return false;

            state.pausedTime = Date.now() - state.startTime;
            state.isPaused = true;
            Storage.saveTimerState(state);
            return true;
        },

        resume() {
            const state = Storage.getTimerState();
            if (!state || !state.isRunning || !state.isPaused) return false;

            state.startTime = Date.now() - (state.pausedTime || 0);
            state.isPaused = false;
            Storage.saveTimerState(state);
            return true;
        },

        stop() {
            const state = Storage.getTimerState();
            if (!state) return null;

            const duration = state.isPaused
                ? Number(state.pausedTime || 0)
                : (Date.now() - state.startTime);

            const entry = {
                taskId: state.taskId,
                projectId: state.projectId,
                date: Utils.formatDate(new Date()),
                startTime: new Date(state.startTime).toISOString(),
                endTime: new Date(state.startTime + duration).toISOString(),
                duration,
                durationHours: Utils.msToHours(duration),
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
            if (state.isPaused) return Number(state.pausedTime || 0);
            if (state.isRunning) return Date.now() - state.startTime;
            return 0;
        }
    };

    // =====================================================
    // STATISTICS
    // =====================================================
    const Statistics = {
        getTotalHoursByDate(date) {
            const entries = Storage.getEntriesByDate(date);
            return entries.reduce((sum, entry) => sum + (Number(entry.durationHours) || 0), 0);
        },

        getTotalHoursByDateRange(startDate, endDate) {
            const entries = Storage.getEntriesByDateRange(startDate, endDate);
            return entries.reduce((sum, entry) => sum + (Number(entry.durationHours) || 0), 0);
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
                        projectId,
                        projectName: project ? project.name : 'Unknown',
                        taskCount: 0,
                        totalHours: 0,
                        entries: []
                    };
                }
                summary[projectId].taskCount++;
                summary[projectId].totalHours += (Number(entry.durationHours) || 0);
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
                        date,
                        taskCount: 0,
                        totalHours: 0,
                        projects: new Set(),
                        entries: []
                    };
                }
                summary[date].taskCount++;
                summary[date].totalHours += (Number(entry.durationHours) || 0);
                summary[date].projects.add(entry.projectId);
                summary[date].entries.push(entry);
            });

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
                        taskId,
                        taskName: task ? task.name : 'Unknown',
                        projectName: project ? project.name : 'Unknown',
                        totalHours: 0,
                        count: 0
                    };
                }
                taskSummary[taskId].totalHours += (Number(entry.durationHours) || 0);
                taskSummary[taskId].count++;
            });

            return Object.values(taskSummary)
                .sort((a, b) => b.totalHours - a.totalHours)
                .slice(0, limit);
        }
    };

    // =====================================================
    // EXPORT
    // =====================================================
    const Export = {
        toCSV(data, filename) {
            if (!data || data.length === 0) return;

            const keys = Object.keys(data[0]);
            const escape = (v) => {
                const s = (v == null) ? '' : String(v);
                // escape cho CSV (Excel)
                if (s.includes('"') || s.includes(',') || s.includes('\n')) {
                    return `"${s.replace(/"/g, '""')}"`;
                }
                return s;
            };

            const rows = [
                keys.join(','),
                ...data.map(row => keys.map(k => escape(row[k])).join(','))
            ];

            // BOM để Excel đọc tiếng Việt tốt hơn
            const csvContent = '\uFEFF' + rows.join('\n');
            this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
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

    // =====================================================
    // DEMO DATA (OFF mặc định)
    // =====================================================
    function initDemoData() {
        if (!CONFIG.ENABLE_DEMO_DATA) return;

        if (Storage.getProjects().length > 0) return;

        const project1 = Storage.addProject({
            name: 'Project Demo 1',
            description: 'Đây là project mẫu để demo giao diện'
        });

        const project2 = Storage.addProject({
            name: 'Project Demo 2',
            description: 'Project demo thứ hai'
        });

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

        const today = Utils.formatDate(new Date());

        Storage.addTrackingEntry({
            taskId: Storage.getTasks()[0].id,
            projectId: project1.id,
            date: today,
            startTime: new Date(Date.now() - 9000000).toISOString(),
            endTime: new Date().toISOString(),
            duration: 9000000,
            durationHours: Utils.msToHours(9000000),
            note: 'Hoàn thành feature X'
        });

        console.log('Demo data initialized');
    }

    // =====================================================
    // EXPORT GLOBAL
    // =====================================================
    window.TimeTrackingApp = {
        CONFIG,
        Utils,
        Storage,
        Auth,
        Timer,
        Statistics,
        Export,
        initDemoData
    };

    // =====================================================
    // INIT
    // =====================================================
    document.addEventListener('DOMContentLoaded', () => {
        // nếu có user (đã login trước đó) thì migrate legacy ngay
        // nếu chưa có user thì migrate sẽ chạy sau login
        try {
            const u = Utils.getCurrentUser();
            if (u) Storage.migrateLegacyIfNeeded();
        } catch (_) { }

        initDemoData();
        console.log('Time Tracking App loaded (app.js) v2');
    });
})();

