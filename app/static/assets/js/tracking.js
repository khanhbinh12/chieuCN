document.addEventListener('DOMContentLoaded', async () => {
    // ============ ENVIRONMENT CHECK ============
    if (typeof api === 'undefined') {
        console.error("❌ Lỗi: Chưa load api.js");
        return;
    }

    if (typeof eventBus === 'undefined') {
        console.warn('⚠️ EventBus not loaded - real-time sync disabled');
    }

    const token = api.getToken();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // ============ DOM ELEMENTS ============
    const dom = {
        projectSelect: document.getElementById('projectSelect'),
        taskSelect: document.getElementById('taskSelect'),
        timerDisplay: document.getElementById('timerDisplay'),
        currentTaskLabel: document.getElementById('currentTaskLabel'),
        startBtn: document.getElementById('startBtn'),
        stopBtn: document.getElementById('stopBtn'),
        noteInput: document.getElementById('noteInput'),
        historyList: document.getElementById('historyList'),
        newTaskBtn: document.getElementById('newTaskBtn'),
        newTaskForm: document.getElementById('newTaskForm'),
        newTaskTitle: document.getElementById('newTaskTitle'),
        saveTaskBtn: document.getElementById('saveTaskBtn'),
        darkModeToggle: document.getElementById('darkModeToggle'),
        exportCsvBtn: document.getElementById('exportCsvBtn'),
        exportExcelBtn: document.getElementById('exportExcelBtn'),
        loadMoreBtn: document.getElementById('loadMoreBtn'),
        chartCanvas: document.getElementById('chartCanvas'),
        selectedCount: document.getElementById('selectedCount'),
        bulkDeleteBtn: document.getElementById('bulkDeleteBtn')
    };

    // ============ STATE MANAGEMENT ============
    let timerInterval = null;
    let serverStartTime = null;
    let currentEntry = null;
    let currentPage = 1;
    let selectedEntries = new Set();
    let notificationShown = false;
    let timerChart = null;
    let syncInterval = null;

    // ============ EVENTBUS INTEGRATION ============
    
    function setupEventBusListeners() {
        if (typeof eventBus === 'undefined') return;

        console.log('📡 Setting up EventBus listeners for Tracking...');

        // Listen to timer events from other tabs
        eventBus.on(Events.TIMER_STARTED, async (data, event) => {
            // Ignore if event from current tab
            if (event.source === 'current_tab') return;
            
            console.log('🔔 Timer started in another tab:', data);
            await syncTimerState();
        });

        eventBus.on(Events.TIMER_STOPPED, async (data, event) => {
            if (event.source === 'current_tab') return;
            
            console.log('🔔 Timer stopped in another tab:', data);
            await syncTimerState();
        });

        // Listen to entry events
        eventBus.on(Events.ENTRY_CREATED, async (data, event) => {
            if (event.source === 'current_tab') return;
            
            console.log('🔔 Entry created in another tab:', data);
            await loadHistory(1);
            await loadChart();
        });

        eventBus.on(Events.ENTRY_UPDATED, async (data, event) => {
            if (event.source === 'current_tab') return;
            
            console.log('🔔 Entry updated in another tab:', data);
            await loadHistory(1);
        });

        eventBus.on(Events.ENTRY_DELETED, async (data, event) => {
            if (event.source === 'current_tab') return;
            
            console.log('🔔 Entry deleted in another tab:', data);
            await loadHistory(1);
            await loadChart();
        });

        eventBus.on(Events.ENTRY_BULK_DELETED, async (data, event) => {
            if (event.source === 'current_tab') return;
            
            console.log('🔔 Bulk delete in another tab:', data);
            await loadHistory(1);
            await loadChart();
        });

        console.log('✅ EventBus listeners registered');
    }

    /**
     * Sync timer state from server
     */
    async function syncTimerState() {
        try {
            const remoteEntry = await api.request('/time-entries/current');
            
            // State changed
            if (remoteEntry && !currentEntry) {
                // Timer started remotely
                await restoreRunningState(remoteEntry);
                await loadHistory(1);
            } else if (!remoteEntry && currentEntry) {
                // Timer stopped remotely
                resetUIStopped();
                await loadHistory(1);
            }
            
        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    // ============ INITIALIZATION ============
    await init();
    initDarkMode();
    initKeyboardShortcuts();
    requestNotificationPermission();
    startAutoSync();
    setupEventBusListeners(); // ✅ NEW: Setup EventBus

    async function init() {
        try {
            const projects = await api.getProjects();
            populateSelect(dom.projectSelect, projects, 'id', 'name', 'Chọn Dự Án');

            currentEntry = await api.request('/time-entries/current');
            
            if (currentEntry) {
                await restoreRunningState(currentEntry);
            } else {
                resetUIStopped();
            }

            await loadHistory(1);
            await loadChart();

        } catch (error) {
            console.error('❌ Init error:', error);
            if (error.message?.includes('401')) {
                alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                api.logout();
            }
        }
    }

    // ============ DARK MODE ============
    function initDarkMode() {
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            document.body.classList.add('dark-mode');
            if (dom.darkModeToggle) dom.darkModeToggle.checked = true;
        }

        if (dom.darkModeToggle) {
            dom.darkModeToggle.addEventListener('change', (e) => {
                document.body.classList.toggle('dark-mode');
                localStorage.setItem('darkMode', e.target.checked);
            });
        }
    }

    // ============ KEYBOARD SHORTCUTS ============
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                if (currentEntry) {
                    dom.stopBtn?.click();
                } else {
                    dom.startBtn?.click();
                }
            }
            
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                exportCsv();
            }
            
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                dom.darkModeToggle?.click();
            }
        });
    }

    // ============ NOTIFICATIONS ============
    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    function checkTimerNotification() {
        if (!currentEntry || !serverStartTime) return;
        
        const elapsed = (Date.now() - serverStartTime) / 1000;
        
        if (elapsed >= 3600 && !notificationShown) {
            notificationShown = true;
            showNotification('⏰ Timer Alert', 'Bạn đã làm việc được 1 giờ!');
        }
        
        if (Math.floor(elapsed / 3600) > Math.floor((elapsed - 1000) / 3600)) {
            notificationShown = false;
        }
    }

    function showNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { 
                body, 
                icon: '/static/assets/images/icon.png',
                badge: '/static/assets/images/badge.png'
            });
        }
    }

    // ============ AUTO SYNC ============
    function startAutoSync() {
        syncInterval = setInterval(async () => {
            await syncTimerState();
        }, 30000); // Sync every 30s
    }

    function stopAutoSync() {
        if (syncInterval) clearInterval(syncInterval);
    }

    // ============ EVENT LISTENERS ============

    if (dom.projectSelect) {
        dom.projectSelect.addEventListener('change', async (e) => {
            const projectId = e.target.value;
            dom.taskSelect.innerHTML = '<option value="">-- Đang tải... --</option>';
            dom.taskSelect.disabled = true;

            if (projectId) {
                try {
                    const tasks = await api.request(`/tasks/project/${projectId}`);
                    populateSelect(dom.taskSelect, tasks, 'id', 'title', 'Chọn Task');
                    dom.taskSelect.disabled = false;
                } catch (e) {
                    console.error('❌ Load tasks error:', e);
                    dom.taskSelect.innerHTML = '<option value="">Lỗi tải task</option>';
                }
            } else {
                dom.taskSelect.innerHTML = '<option value="">-- Chọn Task --</option>';
            }
        });
    }

    if (dom.startBtn) {
        dom.startBtn.addEventListener('click', async () => {
            const taskId = dom.taskSelect.value;
            const note = dom.noteInput.value.trim();

            if (!taskId) {
                alert("⚠️ Vui lòng chọn Task trước!");
                return;
            }

            try {
                dom.startBtn.disabled = true;
                dom.startBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang khởi động...';

                const entry = await api.request('/time-entries/start', {
                    method: 'POST',
                    body: JSON.stringify({ task_id: parseInt(taskId), note })
                });

                currentEntry = entry;
                
                // ✅ Broadcast timer started event
                if (typeof eventBus !== 'undefined') {
                    eventBus.emit(Events.TIMER_STARTED, { 
                        entryId: entry.id,
                        taskId: entry.task_id 
                    });
                }
                
                await restoreRunningState(entry);
                await loadHistory(1);
                await loadChart();

            } catch (err) {
                console.error('❌ Start timer error:', err);
                alert('❌ Lỗi: ' + (err.message || 'Không thể khởi động timer'));
                dom.startBtn.disabled = false;
                dom.startBtn.innerHTML = '<i class="fa-solid fa-play"></i> BẮT ĐẦU';
            }
        });
    }

    if (dom.stopBtn) {
        dom.stopBtn.addEventListener('click', async () => {
            if (!confirm('⏸️ Dừng timer và lưu thời gian?')) return;

            try {
                dom.stopBtn.disabled = true;
                dom.stopBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang dừng...';

                const stoppedEntry = await api.request('/time-entries/stop', { method: 'POST' });
                
                // ✅ Broadcast timer stopped event
                if (typeof eventBus !== 'undefined') {
                    eventBus.emit(Events.TIMER_STOPPED, { 
                        entryId: currentEntry?.id,
                        duration: stoppedEntry?.duration 
                    });
                    
                    eventBus.emit(Events.ENTRY_CREATED, { 
                        entryId: stoppedEntry?.id 
                    });
                }
                
                currentEntry = null;
                notificationShown = false;
                resetUIStopped();
                await loadHistory(1);
                await loadChart();

            } catch (err) {
                console.error('❌ Stop timer error:', err);
                alert('❌ Lỗi: ' + (err.message || 'Không thể dừng timer'));
                dom.stopBtn.disabled = false;
                dom.stopBtn.innerHTML = '<i class="fa-solid fa-stop"></i> DỪNG LẠI';
            }
        });
    }

    if (dom.newTaskBtn) {
        dom.newTaskBtn.addEventListener('click', () => {
            const isVisible = dom.newTaskForm.style.display !== 'none';
            dom.newTaskForm.style.display = isVisible ? 'none' : 'block';
        });
    }

    if (dom.saveTaskBtn) {
        dom.saveTaskBtn.addEventListener('click', async () => {
            const title = dom.newTaskTitle.value.trim();
            const projectId = dom.projectSelect.value;
            
            if (!title || !projectId) {
                alert("⚠️ Chọn Project và nhập tên Task");
                return;
            }

            try {
                dom.saveTaskBtn.disabled = true;
                const newTask = await api.request('/tasks/', {
                    method: 'POST',
                    body: JSON.stringify({ title, project_id: parseInt(projectId), status: 'todo' })
                });

                const opt = document.createElement('option');
                opt.value = newTask.id;
                opt.textContent = newTask.title;
                opt.selected = true;
                dom.taskSelect.appendChild(opt);

                dom.newTaskForm.style.display = 'none';
                dom.newTaskTitle.value = '';
                dom.saveTaskBtn.disabled = false;
                alert('✅ Tạo task thành công!');
                
                // ✅ Broadcast task created
                if (typeof eventBus !== 'undefined') {
                    eventBus.emit(Events.TASK_CREATED, { 
                        taskId: newTask.id,
                        project_id: projectId 
                    });
                }
            } catch(e) {
                console.error('❌ Create task error:', e);
                alert('❌ ' + e.message);
                dom.saveTaskBtn.disabled = false;
            }
        });
    }

    if (dom.exportCsvBtn) {
        dom.exportCsvBtn.addEventListener('click', exportCsv);
    }

    if (dom.exportExcelBtn) {
        dom.exportExcelBtn.addEventListener('click', exportExcel);
    }

    if (dom.loadMoreBtn) {
        dom.loadMoreBtn.addEventListener('click', async () => {
            currentPage++;
            await loadHistory(currentPage, true);
        });
    }

    if (dom.bulkDeleteBtn) {
        dom.bulkDeleteBtn.addEventListener('click', async () => {
            if (selectedEntries.size === 0) {
                alert('⚠️ Chưa chọn entry nào!');
                return;
            }

            if (!confirm(`🗑️ Xóa ${selectedEntries.size} entries đã chọn?`)) return;

            try {
                await api.request('/time-entries/bulk-delete', {
                    method: 'POST',
                    body: JSON.stringify([...selectedEntries])
                });

                // ✅ Broadcast bulk delete
                if (typeof eventBus !== 'undefined') {
                    eventBus.emit(Events.ENTRY_BULK_DELETED, { 
                        entryIds: [...selectedEntries] 
                    });
                }

                selectedEntries.clear();
                updateSelectedCount();
                await loadHistory(1);
                await loadChart();
                alert('✅ Xóa thành công!');
            } catch (e) {
                alert('❌ Lỗi: ' + e.message);
            }
        });
    }

    // ============ HELPER FUNCTIONS ============

    function populateSelect(el, data, valKey, textKey, defaultText) {
        if (!el) return;
        el.innerHTML = `<option value="">-- ${defaultText} --</option>`;
        data.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item[valKey];
            opt.textContent = item[textKey];
            el.appendChild(opt);
        });
    }

    async function restoreRunningState(entry) {
        dom.startBtn.style.display = 'none';
        dom.stopBtn.style.display = 'inline-block';
        dom.stopBtn.disabled = false;
        dom.stopBtn.innerHTML = '<i class="fa-solid fa-stop"></i> DỪNG LẠI';
        
        dom.projectSelect.disabled = true;
        dom.taskSelect.disabled = true;

        try {
            const task = await api.request(`/tasks/${entry.task_id}`);
            if (dom.currentTaskLabel) {
                dom.currentTaskLabel.innerHTML = `
                    <i class="fa-solid fa-circle-play" style="color: var(--success);"></i> 
                    Đang làm: <strong>${task.title}</strong>
                `;
            }
        } catch (e) {
            if (dom.currentTaskLabel) {
                dom.currentTaskLabel.textContent = `Đang làm Task ID: ${entry.task_id}`;
            }
        }

        if (entry.note && dom.noteInput) {
            dom.noteInput.value = entry.note;
        }

        const startTimeISO = entry.start_time;
        const cleanISO = startTimeISO.replace('Z', '');
        const startDate = new Date(cleanISO + 'Z');
        
        serverStartTime = startDate.getTime();
        
        if (timerInterval) clearInterval(timerInterval);
        
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            updateTimerDisplay();
            checkTimerNotification();
        }, 1000);
        
        if (dom.timerDisplay) {
            dom.timerDisplay.classList.add('running');
        }
    }

    function resetUIStopped() {
        if (timerInterval) clearInterval(timerInterval);
        
        dom.startBtn.style.display = 'inline-block';
        dom.startBtn.disabled = false;
        dom.startBtn.innerHTML = '<i class="fa-solid fa-play"></i> BẮT ĐẦU';
        
        dom.stopBtn.style.display = 'none';
        
        dom.projectSelect.disabled = false;
        dom.taskSelect.disabled = false;
        
        if (dom.currentTaskLabel) {
            dom.currentTaskLabel.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #95a5a6;"></i> Sẵn sàng';
        }
        
        if (dom.timerDisplay) {
            dom.timerDisplay.textContent = "00:00:00";
            dom.timerDisplay.classList.remove('running');
        }
        
        if (dom.noteInput) dom.noteInput.value = "";
        serverStartTime = null;
    }

    function updateTimerDisplay() {
        if (!dom.timerDisplay || !serverStartTime) return;
        
        const now = Date.now();
        const diff = now - serverStartTime;
        
        if (diff < 0) {
            console.warn('⚠️ Timer diff is negative:', diff);
            dom.timerDisplay.textContent = "00:00:00";
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        dom.timerDisplay.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    function pad(num) {
        return num.toString().padStart(2, '0');
    }

    async function loadHistory(page = 1, append = false) {
        if (!dom.historyList) return;

        if (!append) {
            dom.historyList.innerHTML = `
                <p class="text-muted text-center" style="padding:20px;">
                    <i class="fa-solid fa-spinner fa-spin"></i> Đang tải...
                </p>
            `;
            currentPage = page;
        }

        try {
            const response = await api.request(`/time-entries/?page=${page}&limit=20`);
            const entries = response.data || [];

            if (entries.length === 0 && page === 1) {
                dom.historyList.innerHTML = `
                    <p class="text-muted text-center" style="padding:20px;">
                        <i class="fa-regular fa-calendar-xmark"></i> Chưa có dữ liệu.
                    </p>`;
                if (dom.loadMoreBtn) dom.loadMoreBtn.style.display = 'none';
                return;
            }

            const html = entries.map(h => renderHistoryItem(h)).join('');
            
            if (append) {
                dom.historyList.insertAdjacentHTML('beforeend', html);
            } else {
                dom.historyList.innerHTML = html;
            }

            if (dom.loadMoreBtn) {
                dom.loadMoreBtn.style.display = response.has_next ? 'block' : 'none';
            }

        } catch (e) {
            console.error('❌ Load history error:', e);
            dom.historyList.innerHTML = `
                <p class="text-danger text-center" style="padding:20px;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Lỗi tải dữ liệu
                </p>
            `;
        }
    }

    function renderHistoryItem(h) {
        const startTime = new Date(h.start_time).toLocaleTimeString('vi-VN', {
            hour: '2-digit', minute: '2-digit'
        });
        
        let durationHtml = '<span class="history-duration running-badge">⏱️ Running</span>';
        if (h.duration && h.duration > 0) {
            const hours = Math.floor(h.duration / 3600);
            const mins = Math.floor((h.duration % 3600) / 60);
            let timeStr = '';
            if (hours > 0) timeStr += `${hours}h `;
            timeStr += `${mins}m`;
            durationHtml = `<span class="history-duration">${timeStr}</span>`;
        }

        const isSelected = selectedEntries.has(h.id);

        return `
            <div class="history-item ${isSelected ? 'selected' : ''}" data-id="${h.id}">
                <div style="display:flex; align-items:center; gap:15px;">
                    <input type="checkbox" class="entry-checkbox" data-id="${h.id}" ${isSelected ? 'checked' : ''}>
                    <div style="width:40px; height:40px; background:#f0f4f8; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#3498db;">
                        <i class="fa-regular fa-clock"></i>
                    </div>
                    <div style="flex:1;">
                        <div style="font-weight:700; color:#2c3e50; font-size:0.95rem;">Task #${h.task_id}</div>
                        <div class="entry-note" data-id="${h.id}" contenteditable="false" style="font-size:0.85rem; color:#7f8c8d; cursor:pointer;" title="Click để chỉnh sửa">${h.note || 'Click để thêm ghi chú'}</div>
                    </div>
                </div>
                <div style="text-align:right; display:flex; flex-direction:column; gap:5px;">
                    ${durationHtml}
                    <div class="history-time">
                        <i class="fa-solid fa-play" style="font-size:0.6rem;"></i> ${startTime}
                    </div>
                    <button class="btn-icon delete-entry" data-id="${h.id}" title="Xóa">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    document.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-entry')) {
            const id = parseInt(e.target.closest('.delete-entry').dataset.id);
            if (!confirm('🗑️ Xóa entry này?')) return;

            try {
                await api.request(`/time-entries/${id}`, { method: 'DELETE' });
                
                // ✅ Broadcast delete
                if (typeof eventBus !== 'undefined') {
                    eventBus.emit(Events.ENTRY_DELETED, { entryId: id });
                }
                
                await loadHistory(1);
                await loadChart();
            } catch (err) {
                alert('❌ ' + err.message);
            }
        }

        if (e.target.classList.contains('entry-checkbox')) {
            const id = parseInt(e.target.dataset.id);
            if (e.target.checked) {
                selectedEntries.add(id);
            } else {
                selectedEntries.delete(id);
            }
            updateSelectedCount();
        }

        if (e.target.classList.contains('entry-note') && e.target.getAttribute('contenteditable') === 'false') {
            e.target.setAttribute('contenteditable', 'true');
            e.target.focus();
            e.target.style.border = '1px dashed #3498db';
        }
    });

    document.addEventListener('blur', async (e) => {
        if (e.target.classList.contains('entry-note') && e.target.getAttribute('contenteditable') === 'true') {
            const id = parseInt(e.target.dataset.id);
            const newNote = e.target.textContent.trim();
            
            e.target.setAttribute('contenteditable', 'false');
            e.target.style.border = 'none';

            try {
                await api.request(`/time-entries/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ note: newNote })
                });
                
                // ✅ Broadcast update
                if (typeof eventBus !== 'undefined') {
                    eventBus.emit(Events.ENTRY_UPDATED, { 
                        entryId: id,
                        note: newNote 
                    });
                }
            } catch (err) {
                alert('❌ Không thể lưu: ' + err.message);
            }
        }
    }, true);

    function updateSelectedCount() {
        if (dom.selectedCount) {
            dom.selectedCount.textContent = selectedEntries.size;
        }
        if (dom.bulkDeleteBtn) {
            dom.bulkDeleteBtn.style.display = selectedEntries.size > 0 ? 'inline-block' : 'none';
        }
    }

    async function exportCsv() {
        try {
            const response = await fetch(api.baseURL + '/time-entries/export/csv', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const blob = await response.blob();
            downloadFile(blob, 'timesheet.csv');
        } catch (e) {
            alert('❌ Export failed: ' + e.message);
        }
    }

    async function exportExcel() {
        try {
            const response = await fetch(api.baseURL + '/time-entries/export/excel', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const blob = await response.blob();
            downloadFile(blob, 'timesheet.xlsx');
        } catch (e) {
            alert('❌ Export failed: ' + e.message);
        }
    }

    function downloadFile(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    async function loadChart() {
        if (!dom.chartCanvas) return;

        try {
            const stats = await api.request('/time-entries/stats/by-task');
            
            if (timerChart) timerChart.destroy();

            const ctx = dom.chartCanvas.getContext('2d');
            timerChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: stats.stats.map(s => s.task_title),
                    datasets: [{
                        data: stats.stats.map(s => s.total_hours),
                        backgroundColor: [
                            '#3498db', '#e74c3c', '#f39c12', '#27ae60', 
                            '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `${context.label}: ${context.parsed} hours (${stats.stats[context.dataIndex].percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (e) {
            console.error('Chart error:', e);
        }
    }

    window.addEventListener('beforeunload', () => {
        stopAutoSync();
        if (timerInterval) clearInterval(timerInterval);
    });
    
    console.log('✅ Tracking.js with EventBus loaded');
    console.log('📡 EventBus:', typeof eventBus !== 'undefined' ? 'Available ✓' : 'Not loaded');
});