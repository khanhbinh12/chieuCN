// app/static/assets/js/tracking.js

document.addEventListener('DOMContentLoaded', () => {
    const app = window.TimeTrackingApp || {};
    const { CONFIG, Auth, Storage, Timer, Utils } = app;

    // =========================
    // 1. BẢO VỆ ROUTE TRACKING
    // =========================
    if (!Utils || !Utils.requireAuth || !Utils.requireAuth()) {
        // Nếu requireAuth trả false thì nó đã redirect về login
        return;
    }

    // =========================
    // 2. NÚT ĐĂNG XUẤT
    // =========================
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                if (Auth && typeof Auth.logout === 'function') {
                    Auth.logout();
                } else {
                    // fallback
                    localStorage.removeItem(CONFIG?.STORAGE_KEYS?.TOKEN || 'access_token');
                    localStorage.removeItem(CONFIG?.STORAGE_KEYS?.USER_DATA || 'tt_user_data');
                    window.location.href = 'login.html';
                }
            }
        });
    }

    // =========================
    // 3. LẤY CÁC PHẦN TỬ DOM
    // =========================
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const saveBtn = document.getElementById('saveBtn');

    const trackingDisplay = document.getElementById('trackingDisplay');
    const taskNoteInput = document.getElementById('taskNote');
    const taskIdInput = document.getElementById('taskId');       // thường là <select>
    const projectIdInput = document.getElementById('projectId'); // thường là <select>

    if (!Storage || !Timer || !Utils) {
        console.error('Thiếu Storage / Timer / Utils trong TimeTrackingApp, không thể dùng trang Tracking.');
        if (trackingDisplay) trackingDisplay.textContent = '00:00:00';
        return;
    }

    let trackingInterval = null;
    let lastEntry = null; // entry vừa STOP, chờ SAVE

    // =========================
    // 4. HÀM HỖ TRỢ
    // =========================
    function formatTimeFromMs(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);

        return (
            String(hours).padStart(2, '0') + ':' +
            String(minutes).padStart(2, '0') + ':' +
            String(seconds).padStart(2, '0')
        );
    }

    function updateTrackingDisplay() {
        const elapsed = Timer.getElapsedTime(); // ms
        if (trackingDisplay) {
            trackingDisplay.textContent = formatTimeFromMs(elapsed);
        }
    }

    function clearIntervalIfAny() {
        if (trackingInterval) {
            clearInterval(trackingInterval);
            trackingInterval = null;
        }
    }

    function showAlert(message, type = 'success') {
        if (Utils && typeof Utils.showAlert === 'function') {
            Utils.showAlert(message, type);
        } else {
            alert(message);
        }
    }

    // =========================
    // 5. FILL PROJECTS & TASKS (NẾU CÓ SELECT)
    // =========================
    async function populateProjects() {
        if (!projectIdInput || projectIdInput.tagName !== 'SELECT') return;

        try {
            const projects = await window.api.getProjects();
            projectIdInput.innerHTML = '<option value="">-- Chọn Project --</option>';

            projects.forEach((p) => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                projectIdInput.appendChild(opt);
            });
        } catch (error) {
            console.error('Error loading projects:', error);
            showAlert('Lỗi khi tải danh sách projects!', 'error');
        }
    }

    async function populateTasksForProject(projectId) {
        if (!taskIdInput || taskIdInput.tagName !== 'SELECT') return;

        taskIdInput.innerHTML = '<option value="">-- Chọn Task --</option>';
        if (!projectId) return;

        try {
            const allTasks = await window.api.getTasks();
            const tasks = allTasks.filter((t) => t.project_id === parseInt(projectId));
            tasks.forEach((t) => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.title;
                taskIdInput.appendChild(opt);
            });
        } catch (error) {
            console.error('Error loading tasks:', error);
            showAlert('Lỗi khi tải danh sách tasks!', 'error');
        }
    }

    // Gắn event khi chọn project để lọc task
    if (projectIdInput && projectIdInput.tagName === 'SELECT') {
        projectIdInput.addEventListener('change', async (e) => {
            const projectId = e.target.value;
            await populateTasksForProject(projectId);
        });
    }

    // Lần đầu load
    (async () => {
        await populateProjects();
        if (projectIdInput && projectIdInput.value) {
            await populateTasksForProject(projectIdInput.value);
        }
    })();

    // =========================
    // 6. KHÔI PHỤC TRẠNG THÁI TIMER
    // =========================
    (function restoreTimerState() {
        const state = Timer.getState();
        if (!trackingDisplay) return;

        if (state && state.isRunning) {
            // Đang chạy -> hiển thị và cập nhật realtime
            updateTrackingDisplay();
            trackingInterval = setInterval(updateTrackingDisplay, 1000);

            // Nếu có sẵn projectId / taskId trong state thì sync vào select
            if (projectIdInput && state.projectId) {
                projectIdInput.value = state.projectId;
                populateTasksForProject(state.projectId);
            }
            if (taskIdInput && state.taskId) {
                taskIdInput.value = state.taskId;
            }
        } else if (state && state.isPaused) {
            trackingDisplay.textContent = formatTimeFromMs(state.pausedTime || 0);
        } else {
            trackingDisplay.textContent = '00:00:00';
        }
    })();

    // =========================
    // 7. NÚT START
    // =========================
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            const taskId = taskIdInput ? taskIdInput.value : '';
            const projectId = projectIdInput ? projectIdInput.value : '';

            if (!taskId || !projectId) {
                showAlert('Vui lòng chọn Project và Task trước khi bắt đầu!', 'error');
                return;
            }

            try {
                const note = taskNoteInput ? taskNoteInput.value.trim() : '';
                const response = await window.api.startTimer({ task_id: parseInt(taskId), note: note || null });
                console.log('Started timer:', response);

                // Start local timer for display
                const ok = Timer.start(taskId, projectId);
                if (!ok) return;

                lastEntry = null; // reset entry cũ
                clearIntervalIfAny();
                updateTrackingDisplay();
                trackingInterval = setInterval(updateTrackingDisplay, 1000);

                showAlert('Bắt đầu tracking!', 'success');
            } catch (error) {
                console.error('Start timer error:', error);
                showAlert('Lỗi khi bắt đầu tracking!', 'error');
            }
        });
    }

    // =========================
    // 8. NÚT PAUSE
    // =========================
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            Timer.pause();
            clearIntervalIfAny();
            updateTrackingDisplay();
            showAlert('Đã tạm dừng!', 'success');
        });
    }

    // =========================
    // 9. NÚT STOP (TẠO ENTRY TẠM, CHƯA LƯU)
    // =========================
    if (stopBtn) {
        stopBtn.addEventListener('click', async () => {
            try {
                const response = await window.api.stopTimer();
                console.log('Stopped timer:', response);

                clearIntervalIfAny();
                const entry = Timer.stop(); // clear local timer

                if (trackingDisplay) trackingDisplay.textContent = '00:00:00';

                showAlert('Đã dừng tracking!', 'success');
                console.log('Stopped entry:', response);
            } catch (error) {
                console.error('Stop timer error:', error);
                showAlert('Lỗi khi dừng tracking!', 'error');
            }
        });
    }

    // =========================
    // 10. NÚT SAVE (LƯU ENTRY VÀO STORAGE)
    // =========================
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (!lastEntry) {
                // Nếu user quên STOP mà bấm LƯU -> cố gắng STOP tự động
                const entry = Timer.stop();
                clearIntervalIfAny();
                if (trackingDisplay) trackingDisplay.textContent = '00:00:00';
                lastEntry = entry;
            }

            if (!lastEntry) {
                showAlert('Không có dữ liệu time tracking để lưu. Hãy Start -> Stop trước.', 'error');
                return;
            }

            const note = taskNoteInput ? taskNoteInput.value.trim() : '';
            const taskId = taskIdInput ? taskIdInput.value : lastEntry.taskId;
            const projectId = projectIdInput ? projectIdInput.value : lastEntry.projectId;

            const finalEntry = {
                ...lastEntry,
                taskId,
                projectId,
                note: note || lastEntry.note || ''
            };

            Storage.addTrackingEntry(finalEntry);
            console.log('Saved tracking entry:', finalEntry);

            showAlert('Thời gian đã được lưu thành công!', 'success');

            // Reset
            lastEntry = null;
            if (taskNoteInput) taskNoteInput.value = '';
        });
    }

    console.log('Tracking page initialized');
});