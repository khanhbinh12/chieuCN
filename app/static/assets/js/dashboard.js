// app/static/assets/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const app = window.TimeTrackingApp || {};
    const { Auth, Storage, Utils } = app;

    // =========================
    // 1) Bảo vệ route
    // =========================
    const authenticated =
        (Utils?.isAuthenticated?.() === true) ||
        (!!Utils?.getToken?.()) ||
        (!!localStorage.getItem('access_token'));

    if (!authenticated) {
        window.location.href = 'login.html';
        return;
    }

    // =========================
    // 2) Logout
    // =========================
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Bạn có chắc chắn muốn đăng xuất?')) Auth?.logout?.();
    });

    // =========================
    // 3) Lấy DOM
    // =========================
    const welcomeUserEl = document.getElementById('welcomeUser');
    const totalHoursTodayEl = document.getElementById('totalHoursToday');
    const activeProjectEl = document.getElementById('activeProject');
    const currentTaskEl = document.getElementById('currentTask');
    const recentActivitiesEl = document.getElementById('recentActivities');

    // =========================
    // 4) Hiển thị thông tin User
    // =========================
    const user = Utils.getCurrentUser();
    if (welcomeUserEl && user) {
        welcomeUserEl.textContent = `Chào, ${user.fullName || user.username || 'User'}!`;
    }

    // =========================
    // 5) Render Dashboard (hiển thị tổng giờ, project, task hiện tại)
    // =========================
    function renderDashboard() {
        // Tính tổng giờ làm hôm nay
        const today = Utils.formatDate(new Date());
        const totalHoursToday = Storage.getEntriesByDate(today).reduce((sum, entry) => sum + entry.durationHours, 0);
        totalHoursTodayEl.textContent = totalHoursToday.toFixed(2);

        // Tìm project đang active
        const activeProject = Storage.getProjects().find(p => p.active);
        if (activeProject) {
            activeProjectEl.innerHTML = `<p>${activeProject.name}</p>`;
        } else {
            activeProjectEl.innerHTML = '<p>Chưa có project nào đang chạy</p>';
        }

        // Tìm task hiện tại
        const activeTask = Storage.getTasks().find(t => t.active);
        if (activeTask) {
            currentTaskEl.innerHTML = `<p>${activeTask.name}</p>`;
        } else {
            currentTaskEl.innerHTML = '<p>Chưa có task nào đang chạy</p>';
        }

        // Hoạt động gần đây
        const recentEntries = Storage.getTrackingEntries().slice(0, 5);
        if (recentEntries.length === 0) {
            recentActivitiesEl.innerHTML = '<p>Chưa có hoạt động nào</p>';
        } else {
            recentActivitiesEl.innerHTML = recentEntries.map(entry => {
                const task = Storage.getTaskById(entry.taskId);
                const project = Storage.getProjectById(entry.projectId);
                const taskName = task ? task.name : 'Unknown Task';
                const projectName = project ? project.name : 'Unknown Project';
                const duration = Utils.msToHours(entry.duration);
                const date = new Date(entry.startTime).toLocaleString('vi-VN');

                return `
          <div class="activity-item">
            <div><strong>${taskName}</strong> - ${projectName}</div>
            <div>${duration.toFixed(2)} giờ • ${date}</div>
          </div>
        `;
            }).join('');
        }
    }

    // =========================
    // 6) Các action nhanh (start tracking, quản lý project/task)
    // =========================
    const startTrackingBtn = document.getElementById('startTrackingBtn');
    const manageProjectsBtn = document.getElementById('manageProjectsBtn');
    const viewReportsBtn = document.getElementById('viewReportsBtn');

    startTrackingBtn?.addEventListener('click', () => {
        window.location.href = 'tracking.html';
    });

    manageProjectsBtn?.addEventListener('click', () => {
        window.location.href = 'projects.html';
    });

    viewReportsBtn?.addEventListener('click', () => {
        window.location.href = 'report.html';
    });

    // =========================
    // 7) Lắng nghe sự kiện tt:data_changed để cập nhật dashboard tự động
    // =========================
    window.addEventListener('tt:data_changed', (e) => {
        if (e.detail?.type === 'projects' || e.detail?.type === 'tasks') {
            renderDashboard();
        }
    });

    // =========================
    // 8) Init lần đầu
    // =========================
    renderDashboard();

    console.log('Dashboard page initialized');
});
