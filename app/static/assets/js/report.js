// app/static/assets/js/report.js

document.addEventListener('DOMContentLoaded', () => {
    const app = window.TimeTrackingApp || {};
    const { CONFIG, Auth, Storage, Statistics, Export, Utils } = app;

    // =========================
    // 1. BẢO VỆ ROUTE: REPORT PAGE
    // =========================
    if (Utils && typeof Utils.requireAuth === 'function') {
        if (!Utils.requireAuth()) return; // requireAuth sẽ tự redirect nếu chưa login
    } else {
        try {
            let authenticated = false;

            if (Utils && typeof Utils.isAuthenticated === 'function') {
                authenticated = Utils.isAuthenticated();
            } else if (Utils && typeof Utils.getToken === 'function') {
                authenticated = !!Utils.getToken();
            } else {
                const token = localStorage.getItem('access_token');
                authenticated = !!token;
            }

            if (!authenticated) {
                window.location.href = 'login.html';
                return;
            }
        } catch (e) {
            console.warn('Không kiểm tra được token, fallback về login:', e);
            window.location.href = 'login.html';
            return;
        }
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
                    // fallback nếu Auth chưa sẵn
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
    const filterBtn = document.getElementById('filterBtn');
    const reportDateInput = document.getElementById('reportDate');
    const reportTableBody = document.getElementById('reportTableBody');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    let currentEntries = []; // entries hiện tại dùng để export

    if (!Storage || !Export || !Utils) {
        console.error('Thiếu Storage / Export / Utils trong TimeTrackingApp, không thể dùng trang Report.');
        if (reportTableBody) {
            reportTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;color:#c0392b;">
                        Lỗi cấu hình: không thể tải module cần thiết.
                    </td>
                    </tr>`;
        }
        return;
    }

    // =========================
    // 4. HELPER
    // =========================
    function showAlert(message, type = 'success') {
        if (Utils && typeof Utils.showAlert === 'function') {
            Utils.showAlert(message, type);
        } else {
            alert(message);
        }
    }

    function formatTime(isoString) {
        if (!isoString) return '';
        const d = new Date(isoString);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // =========================
    // 5. LOAD BÁO CÁO 1 NGÀY
    // =========================
    function loadReportData(date) {
        if (!date) {
            showAlert('Vui lòng chọn ngày báo cáo', 'error');
            return;
        }

        const entries = Storage.getEntriesByDate(date) || [];
        currentEntries = entries;
        updateReportTable(entries);

        // Nếu sau này bạn muốn show tổng giờ trong ngày ở đâu đó, thêm span id="totalHoursDay"
        const totalHoursDayEl = document.getElementById('totalHoursDay');
        if (totalHoursDayEl && Statistics && typeof Statistics.getTotalHoursByDate === 'function') {
            const totalHours = Statistics.getTotalHoursByDate(date);
            totalHoursDayEl.textContent = totalHours.toFixed(2);
        }
    }

    // =========================
    // 6. RENDER BẢNG BÁO CÁO
    // =========================
    function updateReportTable(entries) {
        if (!reportTableBody) {
            console.warn('Không tìm thấy tbody với id="reportTableBody"');
            return;
        }

        reportTableBody.innerHTML = '';

        if (!entries || entries.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="7" style="text-align:center;">Không có bản ghi nào trong ngày</td>`;
            reportTableBody.appendChild(row);
            return;
        }

        const tasks = Storage.getTasks();
        const projects = Storage.getProjects();

        entries.forEach((entry) => {
            const row = document.createElement('tr');

            const task = tasks.find((t) => t.id === entry.taskId);
            const project = projects.find((p) => p.id === entry.projectId);

            const taskName = task ? task.name : 'Unknown task';
            const projectName = project ? project.name : 'Unknown project';

            const durationHours =
                typeof entry.durationHours === 'number'
                    ? entry.durationHours.toFixed(2)
                    : Utils.msToHours(entry.duration || 0);

            row.innerHTML = `
                <td>${formatTime(entry.startTime)}</td>
                <td>${formatTime(entry.endTime)}</td>
                <td>${taskName}</td>
                <td>${projectName}</td>
                <td>${durationHours}</td>
                <td>${entry.note || ''}</td>
                <td>
                    <button class="btn btn-warning" onclick="editEntry('${entry.id}')">Sửa</button>
                    <button class="btn btn-danger" onclick="deleteEntry('${entry.id}')">Xóa</button>
                </td>
            `;

            reportTableBody.appendChild(row);
        });
    }

    // =========================
    // 7. SỬA ENTRY (DEMO: SỬA NOTE)
    // =========================
    function handleEditEntry(entryId) {
        const entries = Storage.getTrackingEntries();
        const entry = entries.find((e) => e.id === entryId);
        if (!entry) {
            alert('Không tìm thấy bản ghi');
            return;
        }

        const newNote = prompt('Cập nhật ghi chú cho bản ghi này:', entry.note || '');
        if (newNote === null) return; // user bấm Cancel

        const updated = Storage.updateTrackingEntry(entryId, { note: newNote });
        if (updated) {
            showAlert('Đã cập nhật ghi chú!', 'success');
            const date = reportDateInput.value || Utils.formatDate(new Date());
            loadReportData(date);
        } else {
            alert('Cập nhật thất bại');
        }
    }

    // =========================
    // 8. XOÁ ENTRY
    // =========================
    function handleDeleteEntry(entryId) {
        if (!confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) {
            return;
        }
        Storage.deleteTrackingEntry(entryId);
        showAlert('Đã xóa bản ghi!', 'success');

        const date = reportDateInput.value || Utils.formatDate(new Date());
        loadReportData(date);
    }

    // Gắn ra window để dùng onclick="editEntry(...)" / "deleteEntry(...)" trong HTML
    window.editEntry = handleEditEntry;
    window.deleteEntry = handleDeleteEntry;

    // =========================
    // 9. NÚT LỌC THEO NGÀY
    // =========================
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            const selectedDate =
                (reportDateInput && reportDateInput.value) || Utils.formatDate(new Date());
            loadReportData(selectedDate);
        });
    }

    // =========================
    // 10. EXPORT EXCEL (CSV)
    // =========================
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => {
            if (!currentEntries || currentEntries.length === 0) {
                alert('Không có dữ liệu để export');
                return;
            }

            const tasks = Storage.getTasks();
            const projects = Storage.getProjects();

            const exportData = currentEntries.map((entry) => {
                const task = tasks.find((t) => t.id === entry.taskId);
                const project = projects.find((p) => p.id === entry.projectId);

                return {
                    date: entry.date,
                    startTime: formatTime(entry.startTime),
                    endTime: formatTime(entry.endTime),
                    taskName: task ? task.name : 'Unknown task',
                    projectName: project ? project.name : 'Unknown project',
                    durationHours:
                        typeof entry.durationHours === 'number'
                            ? entry.durationHours.toFixed(2)
                            : Utils.msToHours(entry.duration || 0),
                    note: entry.note || ''
                };
            });

            const date = reportDateInput.value || Utils.formatDate(new Date());
            const filename = `time-report-${date}.csv`;

            Export.toCSV(exportData, filename);
            showAlert('Đã export báo cáo ra CSV!', 'success');
        });
    }

    // =========================
    // 11. EXPORT PDF (TẠM = JSON)
    // =========================
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            if (!currentEntries || currentEntries.length === 0) {
                alert('Không có dữ liệu để export');
                return;
            }

            const date = reportDateInput.value || Utils.formatDate(new Date());
            const filename = `time-report-${date}.json`;

            Export.toJSON(currentEntries, filename);
            showAlert('Đã export dữ liệu gốc ra JSON (giả lập PDF).', 'success');
        });
    }

    // =========================
    // 12. KHỞI TẠO: MẶC ĐỊNH HÔM NAY
    // =========================
    const today = Utils.formatDate(new Date());
    if (reportDateInput && !reportDateInput.value) {
        reportDateInput.value = today;
    }
    loadReportData(reportDateInput ? reportDateInput.value : today);

    console.log('Report page initialized');
});