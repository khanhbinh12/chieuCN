document.addEventListener('DOMContentLoaded', async () => {
    // ========== ENVIRONMENT CHECK ==========
    if (typeof api === 'undefined') {
        console.error("❌ Lỗi: Chưa load api.js");
        alert("Hệ thống chưa tải đúng thư viện. Vui lòng refresh trang.");
        return;
    }
    
    if (!api.getToken()) {
        window.location.href = 'login.html';
        return;
    }

    if (typeof eventBus === 'undefined') {
        console.warn('⚠️ EventBus not loaded - real-time sync disabled');
    }

    const hasUtils = typeof Utils !== 'undefined';
    if (!hasUtils) {
        console.warn('⚠️ Utils.js not loaded - using fallback methods');
    }

    // ========== DOM ELEMENTS ==========
    const dom = {
        startDate: document.getElementById('startDate'),
        endDate: document.getElementById('endDate'),
        filterBtn: document.getElementById('filterBtn'),
        thisWeekBtn: document.getElementById('thisWeekBtn'),
        thisMonthBtn: document.getElementById('thisMonthBtn'),
        
        totalHours: document.getElementById('totalHours'),
        workingDays: document.getElementById('workingDays'),
        totalProjects: document.getElementById('totalProjects'),
        totalTasks: document.getElementById('totalTasks'),
        
        projectStatsBody: document.getElementById('projectStatsBody'),
        chartContainer: document.querySelector('.chart-placeholder'),
        
        logoutBtn: document.getElementById('logoutBtn')
    };

    const requiredElements = ['startDate', 'endDate', 'filterBtn', 'projectStatsBody'];
    const missingElements = requiredElements.filter(key => !dom[key]);
    
    if (missingElements.length > 0) {
        console.error("❌ Missing DOM elements:", missingElements);
        alert(`Lỗi giao diện: Không tìm thấy ${missingElements.join(', ')}`);
        return;
    }

    // ========== GLOBAL STATE ==========
    let myChart = null;
    let projectsCache = {};
    let tasksCache = {};
    let allEntries = [];
    let isLoading = false;

    // ========== EVENTBUS INTEGRATION ==========
    
    function setupEventBusListeners() {
        if (typeof eventBus === 'undefined') return;

        console.log('📡 Setting up EventBus listeners for Statistics...');

        // Listen to timer events
        eventBus.on(Events.TIMER_STOPPED, async (data) => {
            console.log('🔔 Timer stopped - refreshing statistics');
            await loadStatistics();
            showNotification('✅ Đã cập nhật thống kê mới', 'success', 2000);
        });

        // Listen to entry events
        eventBus.on(Events.ENTRY_CREATED, async (data, event) => {
            if (event.source === 'current_tab') return;
            console.log('🔔 Entry created in another tab');
            await loadStatistics();
        });

        eventBus.on(Events.ENTRY_DELETED, async (data, event) => {
            if (event.source === 'current_tab') return;
            console.log('🔔 Entry deleted in another tab');
            await loadStatistics();
        });

        eventBus.on(Events.ENTRY_BULK_DELETED, async (data, event) => {
            if (event.source === 'current_tab') return;
            console.log('🔔 Bulk delete in another tab');
            await loadStatistics();
        });

        // Listen to project events
        eventBus.on(Events.PROJECT_CREATED, async (data) => {
            console.log('🔔 Project created');
            await loadProjectsAndTasksCache();
            await loadStatistics();
        });

        eventBus.on(Events.PROJECT_DELETED, async (data) => {
            console.log('🔔 Project deleted');
            await loadProjectsAndTasksCache();
            await loadStatistics();
        });

        eventBus.on(Events.PROJECT_UPDATED, async (data) => {
            console.log('🔔 Project updated');
            await loadProjectsAndTasksCache();
            // Update display without full reload
            processAndRenderData(allEntries);
        });

        console.log('✅ EventBus listeners registered for Statistics');
    }

    // ========== INITIALIZATION ==========
    setupEventListeners();
    setupEventBusListeners(); // 🔥 NEW: Setup EventBus
    await loadProjectsAndTasksCache();
    setThisWeek();
    await loadStatistics();

    // ========== EVENT LISTENERS ==========
    function setupEventListeners() {
        if (dom.logoutBtn) {
            dom.logoutBtn.addEventListener('click', handleLogout);
        }

        if (dom.filterBtn) {
            dom.filterBtn.addEventListener('click', debounce(handleFilterClick, 300));
        }

        if (dom.thisWeekBtn) {
            dom.thisWeekBtn.addEventListener('click', handleThisWeekClick);
        }

        if (dom.thisMonthBtn) {
            dom.thisMonthBtn.addEventListener('click', handleThisMonthClick);
        }

        if (dom.startDate) {
            dom.startDate.addEventListener('change', validateDateRange);
        }
        if (dom.endDate) {
            dom.endDate.addEventListener('change', validateDateRange);
        }

        [dom.startDate, dom.endDate].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleFilterClick();
                    }
                });
            }
        });
    }

    // ========== EVENT HANDLERS ==========
    function handleLogout() {
        if (confirm("Bạn có chắc muốn đăng xuất?")) {
            api.logout();
        }
    }

    async function handleFilterClick() {
        if (validateDateRange() && !isLoading) {
            await loadStatistics();
        }
    }

    async function handleThisWeekClick() {
        setThisWeek();
        if (!isLoading) await loadStatistics();
    }

    async function handleThisMonthClick() {
        setThisMonth();
        if (!isLoading) await loadStatistics();
    }

    // ========== VALIDATION ==========
    function validateDateRange() {
        const start = dom.startDate.value;
        const end = dom.endDate.value;

        if (!start || !end) {
            showNotification("📅 Vui lòng chọn cả ngày bắt đầu và kết thúc", "warning");
            return false;
        }

        if (new Date(start) > new Date(end)) {
            showNotification("⚠️ Ngày kết thúc phải sau ngày bắt đầu!", "error");
            dom.endDate.value = start;
            return false;
        }

        const daysDiff = Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
        if (daysDiff > 365) {
            if (!confirm("📊 Khoảng thời gian lớn hơn 1 năm. Có thể mất thời gian tải. Tiếp tục?")) {
                return false;
            }
        }

        return true;
    }

    // ========== DATA LOADING ==========
    
    async function loadProjectsAndTasksCache() {
        try {
            const [projects, allTasks] = await Promise.all([
                api.getProjects().catch(() => []),
                api.getTasks().catch(() => [])
            ]);

            projectsCache = {};
            projects.forEach(p => {
                projectsCache[p.id] = {
                    name: p.name,
                    color: p.color || generateColorFromId(p.id)
                };
            });

            tasksCache = {};
            allTasks.forEach(t => {
                tasksCache[t.id] = {
                    title: t.title,
                    project_id: t.project_id
                };
            });

            console.log('✅ Cached:', projects.length, 'projects,', allTasks.length, 'tasks');

        } catch (error) {
            console.warn("⚠️ Không thể load cache:", error);
        }
    }

    async function loadStatistics() {
        if (isLoading) {
            console.log('⏳ Already loading, skipping...');
            return;
        }

        const start = dom.startDate.value;
        const end = dom.endDate.value;

        if (!start || !end) {
            showNotification("📅 Vui lòng chọn khoảng thời gian", "warning");
            return;
        }

        isLoading = true;
        showLoadingState();

        try {
            console.log(`🔄 Loading statistics from ${start} to ${end}...`);
            
            // ✅ Load with proper date filtering
            const response = await api.request(`/time-entries/?start_date=${start}&end_date=${end}&limit=200`);
            
            let entries;
            if (hasUtils && Utils.normalizeEntriesResponse) {
                entries = Utils.normalizeEntriesResponse(response);
            } else {
                entries = Array.isArray(response) ? response : (response.data || []);
            }

            // ✅ Filter out running entries (no end_time)
            entries = entries.filter(e => e.end_time && e.duration > 0);

            allEntries = entries;
            
            console.log(`✅ Loaded ${entries.length} completed entries`);
            
            processAndRenderData(entries);
            
            if (entries.length > 0) {
                showNotification(`✅ Đã tải ${entries.length} bản ghi`, "success", 2000);
            }

        } catch (error) {
            console.error("❌ Load statistics error:", error);
            showErrorState(error.message || "Lỗi tải dữ liệu");
            
            if (error.message?.includes('401') || error.message?.includes('Phiên')) {
                setTimeout(() => api.logout(), 2000);
            }
        } finally {
            isLoading = false;
        }
    }

    // ========== DATA PROCESSING ==========
    
    function processAndRenderData(entries) {
        const metrics = calculateMetrics(entries);
        const projectStats = groupByProjects(entries);
        
        renderStatsCards(metrics);
        renderProjectTable(projectStats, metrics.totalHours);
        renderChart(projectStats);
    }

    function calculateMetrics(entries) {
        let totalSeconds = 0;
        let uniqueDays = new Set();
        let uniqueProjects = new Set();
        let validEntries = 0;

        entries.forEach(entry => {
            const duration = entry.duration || 0;
            
            if (duration === 0 || !entry.end_time) return;
            
            validEntries++;
            totalSeconds += duration;
            
            let dateStr;
            if (hasUtils && Utils.parseISOToTimestamp) {
                const timestamp = Utils.parseISOToTimestamp(entry.start_time);
                dateStr = new Date(timestamp).toLocaleDateString('vi-VN');
            } else {
                dateStr = getLocalDateFromISO(entry.start_time);
            }
            uniqueDays.add(dateStr);
            
            const projectId = getProjectIdFromEntry(entry);
            if (projectId) uniqueProjects.add(projectId);
        });

        return {
            totalHours: totalSeconds / 3600,
            workingDays: uniqueDays.size,
            totalProjects: uniqueProjects.size,
            totalEntries: validEntries
        };
    }

    function groupByProjects(entries) {
        const projectGroups = {};

        entries.forEach(entry => {
            const duration = entry.duration || 0;
            if (duration === 0 || !entry.end_time) return;

            const projectId = getProjectIdFromEntry(entry);
            const projectKey = projectId || 'unknown';
            
            if (!projectGroups[projectKey]) {
                projectGroups[projectKey] = {
                    id: projectKey,
                    name: getProjectName(projectId, entry),
                    color: getProjectColor(projectId),
                    totalSeconds: 0,
                    entriesCount: 0
                };
            }

            projectGroups[projectKey].totalSeconds += duration;
            projectGroups[projectKey].entriesCount++;
        });

        const statsArray = Object.values(projectGroups);
        statsArray.sort((a, b) => b.totalSeconds - a.totalSeconds);

        return statsArray;
    }

    function getProjectIdFromEntry(entry) {
        if (entry.project_id) {
            return entry.project_id;
        }

        if (entry.task_id && tasksCache[entry.task_id]) {
            return tasksCache[entry.task_id].project_id;
        }

        if (entry.task_id) {
            return `task_${entry.task_id}`;
        }

        return null;
    }

    function getProjectName(projectId, entry = null) {
        if (projectId && projectsCache[projectId]) {
            return projectsCache[projectId].name;
        }

        if (typeof projectId === 'string' && projectId.startsWith('task_')) {
            const taskId = parseInt(projectId.replace('task_', ''));
            if (tasksCache[taskId]) {
                const taskProjectId = tasksCache[taskId].project_id;
                if (projectsCache[taskProjectId]) {
                    return projectsCache[taskProjectId].name;
                }
                return `📌 ${tasksCache[taskId].title}`;
            }
        }

        return projectId ? `Project #${projectId}` : 'Chưa phân loại';
    }

    function getProjectColor(projectId) {
        if (projectId && projectsCache[projectId]) {
            return projectsCache[projectId].color;
        }
        
        return generateColorFromId(projectId);
    }

    function generateColorFromId(id) {
        const colors = [
            '#3498db', '#2ecc71', '#f39c12', 
            '#e74c3c', '#9b59b6', '#1abc9c',
            '#34495e', '#e67e22', '#95a5a6',
            '#16a085', '#c0392b', '#8e44ad'
        ];
        
        if (!id) return colors[0];
        
        let hash = 0;
        const str = String(id);
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }

    // ========== UI RENDERING ==========
    
    function renderStatsCards(metrics) {
        animateValue(dom.totalHours, 0, metrics.totalHours, 800, 1);
        animateValue(dom.workingDays, 0, metrics.workingDays, 600, 0);
        animateValue(dom.totalProjects, 0, metrics.totalProjects, 600, 0);
        animateValue(dom.totalTasks, 0, metrics.totalEntries, 600, 0);
    }

    function animateValue(element, start, end, duration, decimals = 0) {
        if (!element) return;
        
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = current.toFixed(decimals);
        }, 16);
    }

    function renderProjectTable(projectStats, totalHours) {
        if (!dom.projectStatsBody) return;

        if (projectStats.length === 0) {
            dom.projectStatsBody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center" style="padding: 40px; color: #999;">
                        <i class="fa-solid fa-inbox fa-3x" style="display: block; margin-bottom: 15px; opacity: 0.2;"></i>
                        <strong>Không có dữ liệu</strong><br>
                        <small style="color: #bbb;">Thử chọn khoảng thời gian khác</small>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        projectStats.forEach((project, index) => {
            const hours = project.totalSeconds / 3600;
            const percent = totalHours > 0 ? (hours / totalHours * 100) : 0;

            const delay = index * 50;

            html += `
                <tr style="animation: slideIn 0.3s ease ${delay}ms both;">
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 10px; height: 10px; border-radius: 50%; background: ${project.color}; box-shadow: 0 0 8px ${project.color}80;"></div>
                            <div>
                                <div style="font-weight: 600; color: #2c3e50; font-size: 0.95rem;">
                                    ${escapeHtml(project.name)}
                                </div>
                                ${project.entriesCount > 1 ? `
                                    <small style="color: #95a5a6; font-size: 0.75rem;">
                                        ${project.entriesCount} phiên làm việc
                                    </small>
                                ` : ''}
                            </div>
                        </div>
                    </td>
                    <td style="text-align: right; font-weight: 700; color: #34495e; font-size: 1.05rem;">
                        ${hours.toFixed(2)} <small style="font-weight: 400; color: #95a5a6;">giờ</small>
                    </td>
                    <td>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" 
                                     style="width: 0%; background: ${project.color}; transition: width 0.8s ease ${delay}ms;"
                                     data-width="${percent.toFixed(1)}"></div>
                            </div>
                            <div class="progress-text">${percent.toFixed(1)}%</div>
                        </div>
                    </td>
                </tr>
            `;
        });

        dom.projectStatsBody.innerHTML = html;

        setTimeout(() => {
            document.querySelectorAll('.progress-fill').forEach(bar => {
                bar.style.width = bar.dataset.width + '%';
            });
        }, 100);
    }

    function renderChart(projectStats) {
        if (!dom.chartContainer) return;

        const topProjects = projectStats.slice(0, 5);
        
        if (topProjects.length === 0) {
            dom.chartContainer.innerHTML = `
                <div style="text-align: center; color: #cbd5e0; padding: 40px;">
                    <i class="fa-solid fa-chart-simple fa-4x" style="margin-bottom: 20px; opacity: 0.3;"></i>
                    <p style="font-size: 1.1rem; margin: 0;">Chưa có dữ liệu để hiển thị biểu đồ</p>
                    <small style="color: #a0aec0;">Chọn khoảng thời gian có dữ liệu</small>
                </div>
            `;
            return;
        }

        const labels = topProjects.map(p => p.name);
        const data = topProjects.map(p => (p.totalSeconds / 3600).toFixed(2));
        const colors = topProjects.map(p => p.color);

        let canvas = document.getElementById('statsChart');
        if (!canvas) {
            dom.chartContainer.innerHTML = '<canvas id="statsChart"></canvas>';
            dom.chartContainer.style.cssText = 'background: white; border: none; padding: 20px; min-height: 300px;';
            canvas = document.getElementById('statsChart');
        }

        if (myChart) {
            myChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Giờ làm việc',
                    data: data,
                    backgroundColor: colors.map(c => c + 'CC'),
                    borderColor: colors,
                    borderWidth: 2,
                    borderRadius: 8,
                    barThickness: 60
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        padding: 14,
                        titleFont: { size: 15, weight: 'bold' },
                        bodyFont: { size: 14 },
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const hours = context.parsed.y;
                                const percent = (hours / data.reduce((a,b) => parseFloat(a) + parseFloat(b), 0) * 100).toFixed(1);
                                return [
                                    `Tổng: ${hours} giờ`,
                                    `Tỷ lệ: ${percent}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + 'h';
                            },
                            font: { size: 12, weight: '500' }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: { size: 12, weight: '600' },
                            color: '#2c3e50'
                        }
                    }
                }
            }
        });
    }

    // ========== UI STATES ==========
    
    function showLoadingState() {
        const skeletonHTML = '<div class="skeleton-loader"></div>';
        
        if (dom.totalHours) dom.totalHours.innerHTML = skeletonHTML;
        if (dom.workingDays) dom.workingDays.innerHTML = skeletonHTML;
        if (dom.totalProjects) dom.totalProjects.innerHTML = skeletonHTML;
        if (dom.totalTasks) dom.totalTasks.innerHTML = skeletonHTML;

        if (dom.projectStatsBody) {
            dom.projectStatsBody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center" style="padding: 50px;">
                        <div class="spinner-container">
                            <i class="fa-solid fa-spinner fa-spin fa-3x" style="color: #3498db;"></i>
                        </div>
                        <div style="margin-top: 15px; color: #7f8c8d; font-size: 1.05rem;">
                            Đang phân tích dữ liệu...
                        </div>
                    </td>
                </tr>
            `;
        }

        if (dom.filterBtn) {
            dom.filterBtn.disabled = true;
            dom.filterBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';
        }
    }

    function showErrorState(message) {
        if (dom.projectStatsBody) {
            dom.projectStatsBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 50px;">
                        <i class="fa-solid fa-triangle-exclamation fa-3x" 
                           style="display: block; margin-bottom: 20px; color: #e74c3c;"></i>
                        <strong style="font-size: 1.2rem; color: #e74c3c;">Lỗi tải dữ liệu</strong><br>
                        <small style="color: #95a5a6; margin-top: 10px; display: block;">${escapeHtml(message)}</small>
                        <button class="btn btn-primary" onclick="location.reload()" 
                                style="margin-top: 20px;">
                            <i class="fa-solid fa-rotate-right"></i> Tải lại trang
                        </button>
                    </td>
                </tr>
            `;
        }

        if (dom.totalHours) dom.totalHours.textContent = '0.0';
        if (dom.workingDays) dom.workingDays.textContent = '0';
        if (dom.totalProjects) dom.totalProjects.textContent = '0';
        if (dom.totalTasks) dom.totalTasks.textContent = '0';

        if (dom.filterBtn) {
            dom.filterBtn.disabled = false;
            dom.filterBtn.innerHTML = '<i class="fa-solid fa-filter"></i> Lọc dữ liệu';
        }
    }

    // ========== DATE HELPERS ==========
    
    function setThisWeek() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today);
        monday.setDate(diff);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        dom.startDate.value = formatDate(monday);
        dom.endDate.value = formatDate(sunday);
    }

    function setThisMonth() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        dom.startDate.value = formatDate(firstDay);
        dom.endDate.value = formatDate(lastDay);
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getLocalDateFromISO(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('vi-VN');
    }

    // ========== UTILITY FUNCTIONS ==========
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function showNotification(message, type = 'info', duration = 3000) {
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };

        const notification = document.createElement('div');
        notification.className = 'toast-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 16px 24px;
            border-radius: 10px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 350px;
            font-weight: 500;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    window.addEventListener('beforeunload', () => {
        if (myChart) {
            myChart.destroy();
        }
    });
});

// ========== CSS ANIMATIONS ==========
const statisticsStyles = document.createElement('style');
statisticsStyles.textContent = `
    @keyframes slideIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
    
    .skeleton-loader {
        height: 40px;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 8px;
    }
    
    @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
    
    .spinner-container {
        animation: pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    .progress-container {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .progress-bar {
        flex: 1;
        height: 20px;
        background: #f0f0f0;
        border-radius: 10px;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        border-radius: 10px;
    }
    
    .progress-text {
        min-width: 50px;
        text-align: right;
        font-weight: 600;
        color: #2c3e50;
    }
`;
document.head.appendChild(statisticsStyles);

console.log('✅ Statistics.js with EventBus loaded');
console.log('📡 EventBus:', typeof eventBus !== 'undefined' ? 'Available ✓' : 'Not loaded');