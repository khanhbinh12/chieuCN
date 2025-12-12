// app/static/assets/js/statistics.js

// ============================================
// STATISTICS PAGE SCRIPT
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    const app = window.TimeTrackingApp || {};
    const { CONFIG, Utils, Auth, Storage, Statistics, Export } = app;

    // =========================
    // 0. KIỂM TRA MODULE CẦN THIẾT
    // =========================
    if (!Utils || !Statistics || !Storage || !Export) {
        console.error('Thiếu Utils / Statistics / Storage / Export trong TimeTrackingApp');
        return;
    }

    // =========================
    // 1. BẢO VỆ ROUTE (AUTH)
    // =========================
    if (typeof Utils.requireAuth === 'function') {
        if (!Utils.requireAuth()) return; // requireAuth tự redirect nếu chưa login
    } else {
        try {
            let authenticated = false;

            if (typeof Utils.isAuthenticated === 'function') {
                authenticated = Utils.isAuthenticated();
            } else if (typeof Utils.getToken === 'function') {
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
    // 2. HELPER ALERT
    // =========================
    function showAlert(message, type = 'success') {
        if (Utils && typeof Utils.showAlert === 'function') {
            Utils.showAlert(message, type);
        } else {
            alert(message);
        }
    }

    // =========================
    // 3. LOGOUT HANDLER
    // =========================
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            if (!confirm('Bạn có chắc chắn muốn đăng xuất?')) return;

            if (Auth && typeof Auth.logout === 'function') {
                Auth.logout();
            } else {
                // fallback
                localStorage.removeItem(CONFIG?.STORAGE_KEYS?.TOKEN || 'access_token');
                localStorage.removeItem(CONFIG?.STORAGE_KEYS?.USER_DATA || 'tt_user_data');
                window.location.href = 'login.html';
            }
        });
    }

    // =========================
    // 4. LẤY CÁC PHẦN TỬ DOM
    // =========================
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const filterBtn = document.getElementById('filterBtn');
    const thisWeekBtn = document.getElementById('thisWeekBtn');
    const thisMonthBtn = document.getElementById('thisMonthBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    if (!startDateInput || !endDateInput) {
        console.error('Thiếu input startDate / endDate trong statistics.html');
        return;
    }

    // =========================
    // 5. SET RANGE MẶC ĐỊNH (TUẦN NÀY)
    // =========================
    setThisWeek();

    // =========================
    // 6. NÚT FILTER
    // =========================
    if (filterBtn) {
        filterBtn.addEventListener('click', function () {
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;

            if (!startDate || !endDate) {
                showAlert('Vui lòng chọn đầy đủ khoảng thời gian!', 'error');
                return;
            }

            if (new Date(startDate) > new Date(endDate)) {
                showAlert('Ngày bắt đầu phải nhỏ hơn ngày kết thúc!', 'error');
                return;
            }

            loadStatistics(startDate, endDate);
        });
    }

    // =========================
    // 7. NÚT "THIS WEEK"
    // =========================
    if (thisWeekBtn) {
        thisWeekBtn.addEventListener('click', function () {
            setThisWeek();
            loadStatistics(startDateInput.value, endDateInput.value);
        });
    }

    // =========================
    // 8. NÚT "THIS MONTH"
    // =========================
    if (thisMonthBtn) {
        thisMonthBtn.addEventListener('click', function () {
            setThisMonth();
            loadStatistics(startDateInput.value, endDateInput.value);
        });
    }

    // =========================
    // 9. NÚT EXPORT
    // =========================
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', function () {
            exportStatistics();
        });
    }

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', function () {
            showAlert('Chức năng export PDF đang được phát triển', 'info');
        });
    }

    // =========================
    // 10. LOAD THỐNG KÊ BAN ĐẦU (TUẦN HIỆN TẠI)
    // =========================
    loadStatistics(startDateInput.value, endDateInput.value);

    // =========================
    // HELPER: SET TUẦN HIỆN TẠI
    // =========================
    function setThisWeek() {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0: CN, 1: T2, ...
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as first day

        const monday = new Date(today);
        monday.setDate(today.getDate() + diff);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        startDateInput.value = Utils.formatDate(monday);
        endDateInput.value = Utils.formatDate(sunday);
    }

    // =========================
    // HELPER: SET THÁNG HIỆN TẠI
    // =========================
    function setThisMonth() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        startDateInput.value = Utils.formatDate(firstDay);
        endDateInput.value = Utils.formatDate(lastDay);
    }

    // =========================
    // LOAD THỐNG KÊ THEO KHOẢNG THỜI GIAN
    // =========================
    function loadStatistics(startDate, endDate) {
        const totalHours = Statistics.getTotalHoursByDateRange(startDate, endDate);
        const dailySummary = Statistics.getDailySummary(startDate, endDate);
        const projectSummary = Statistics.getProjectSummary(startDate, endDate);
        const topTasks = Statistics.getTopTasks(startDate, endDate, 10);

        updateOverview(totalHours, dailySummary, projectSummary);
        updateProjectStats(projectSummary, totalHours);
        updateDailyStats(dailySummary);
        updateTopTasks(topTasks);
    }

    // =========================
    // TỔNG QUAN
    // =========================
    function updateOverview(totalHours, dailySummary, projectSummary) {
        const totalHoursEl = document.getElementById('totalHours');
        const workingDaysEl = document.getElementById('workingDays');
        const avgPerDayEl = document.getElementById('avgPerDay');
        const totalProjectsEl = document.getElementById('totalProjects');

        if (totalHoursEl) totalHoursEl.textContent = totalHours.toFixed(1);
        if (workingDaysEl) workingDaysEl.textContent = dailySummary.length;

        const avgPerDay = dailySummary.length > 0 ? totalHours / dailySummary.length : 0;
        if (avgPerDayEl) avgPerDayEl.textContent = avgPerDay.toFixed(1);

        if (totalProjectsEl) totalProjectsEl.textContent = projectSummary.length;
    }

    // =========================
    // BẢNG THỐNG KÊ THEO PROJECT
    // =========================
    function updateProjectStats(projectSummary, totalHours) {
        const tbody = document.getElementById('projectStatsBody');
        if (!tbody) return;

        if (!projectSummary || projectSummary.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="5" style="text-align: center; color: #7f8c8d;">Không có dữ liệu</td></tr>';
            return;
        }

        projectSummary.sort((a, b) => b.totalHours - a.totalHours);

        let html = projectSummary
            .map((project) => {
                const percentage =
                    totalHours > 0 ? (project.totalHours / totalHours * 100).toFixed(1) : 0;
                const avgPerTask =
                    project.taskCount > 0
                        ? (project.totalHours / project.taskCount).toFixed(1)
                        : 0;
                return `
                <tr>
                    <td>${project.projectName}</td>
                    <td>${project.taskCount}</td>
                    <td>${project.totalHours.toFixed(1)}</td>
                    <td>${percentage}%</td>
                    <td>${avgPerTask}</td>
                </tr>
            `;
            })
            .join('');

        const totalTasks = projectSummary.reduce((sum, p) => sum + p.taskCount, 0);
        const avgPerTaskTotal =
            totalTasks > 0 ? (totalHours / totalTasks).toFixed(1) : 0;

        html += `
            <tr style="font-weight: bold; background-color: #ecf0f1;">
                <td>Tổng cộng</td>
                <td>${totalTasks}</td>
                <td>${totalHours.toFixed(1)}</td>
                <td>100%</td>
                <td>${avgPerTaskTotal}</td>
            </tr>
        `;

        tbody.innerHTML = html;
    }

    // =========================
    // BẢNG THỐNG KÊ THEO NGÀY
    // =========================
    function updateDailyStats(dailySummary) {
        const tbody = document.getElementById('dailyStatsBody');
        if (!tbody) return;

        if (!dailySummary || dailySummary.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="5" style="text-align: center; color: #7f8c8d;">Không có dữ liệu</td></tr>';
            return;
        }

        dailySummary.sort((a, b) => new Date(b.date) - new Date(a.date));

        const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

        const html = dailySummary
            .map((day) => {
                const date = new Date(day.date);
                const dayName = dayNames[date.getDay()];
                const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

                return `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${dayName}</td>
                    <td>${day.taskCount}</td>
                    <td>${day.totalHours.toFixed(1)}</td>
                    <td>${day.projectNames}</td>
                </tr>
            `;
            })
            .join('');

        tbody.innerHTML = html;
    }

    // =========================
    // BẢNG TOP TASKS
    // =========================
    function updateTopTasks(topTasks) {
        const tbody = document.getElementById('topTasksBody');
        if (!tbody) return;

        if (!topTasks || topTasks.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="5" style="text-align: center; color: #7f8c8d;">Không có dữ liệu</td></tr>';
            return;
        }

        const html = topTasks
            .map((task, index) => {
                return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${task.taskName}</td>
                    <td>${task.projectName}</td>
                    <td>${task.totalHours.toFixed(1)}</td>
                    <td>${task.count}</td>
                </tr>
            `;
            })
            .join('');

        tbody.innerHTML = html;
    }

    // =========================
    // EXPORT THỐNG KÊ RA CSV
    // =========================
    function exportStatistics() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        const projectSummary = Statistics.getProjectSummary(startDate, endDate);
        // Bạn có thể export thêm dailySummary / topTasks nếu muốn

        if (!projectSummary || projectSummary.length === 0) {
            showAlert('Không có dữ liệu để export!', 'error');
            return;
        }

        const projectData = projectSummary.map((p) => ({
            Project: p.projectName,
            'Số Tasks': p.taskCount,
            'Tổng giờ': p.totalHours.toFixed(2)
        }));

        Export.toCSV(projectData, `statistics_projects_${startDate}_${endDate}.csv`);
        showAlert('Đã export thống kê!', 'success');
    }
});