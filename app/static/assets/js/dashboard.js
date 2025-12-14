document.addEventListener('DOMContentLoaded', async () => {
    // ============ ENVIRONMENT CHECK ============
    if (typeof api === 'undefined') {
        console.error('❌ Lỗi: Chưa load api.js');
        alert('Hệ thống chưa tải đúng thư viện. Vui lòng refresh trang.');
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

    const hasUtils = typeof Utils !== 'undefined';
    if (!hasUtils) {
        console.warn('⚠️ Utils.js not loaded - using fallback methods');
    }

    // ============ DOM ELEMENTS ============
    const dom = {
        welcomeUser: document.getElementById('welcomeUser'),
        totalHoursToday: document.getElementById('totalHoursToday'),
        totalProjects: document.getElementById('totalProjects'),
        totalEntries: document.getElementById('totalEntries'),
        statusCardWrapper: document.getElementById('statusCardWrapper'),
        runningStatus: document.getElementById('runningStatus'),
        onboardingCard: document.getElementById('onboardingCard'),
        recentActivities: document.getElementById('recentActivities'),
        logoutBtn: document.getElementById('logoutBtn'),
        startTrackingBtn: document.getElementById('startTrackingBtn'),
        manageProjectsBtn: document.getElementById('manageProjectsBtn'),
        viewReportBtn: document.getElementById('viewReportBtn'),
        goProjectsBtn: document.getElementById('goProjectsBtn'),
        goTrackingBtn: document.getElementById('goTrackingBtn')
    };

    // ============ STATE MANAGEMENT ============
    let refreshInterval = null;
    let currentTimer = null;
    let allEntries = [];

    // ============ EVENTBUS INTEGRATION ============
    
    /**
     * Setup EventBus listeners for real-time updates
     */
    function setupEventBusListeners() {
        if (typeof eventBus === 'undefined') return;

        console.log('📡 Setting up EventBus listeners for Dashboard...');

        // Listen to timer events
        eventBus.on(Events.TIMER_STARTED, async (data) => {
            console.log('🔔 Timer started event received:', data);
            await loadDashboardData();
        });

        eventBus.on(Events.TIMER_STOPPED, async (data) => {
            console.log('🔔 Timer stopped event received:', data);
            await loadDashboardData();
        });

        // Listen to project/task events
        eventBus.on(Events.PROJECT_CREATED, async (data) => {
            console.log('🔔 Project created:', data);
            const projects = await api.getProjects();
            updateOnboardingCard(projects);
            updateStatsCards(projects, allEntries);
        });

        eventBus.on(Events.PROJECT_DELETED, async (data) => {
            console.log('🔔 Project deleted:', data);
            const projects = await api.getProjects();
            updateOnboardingCard(projects);
            updateStatsCards(projects, allEntries);
        });

        eventBus.on(Events.TASK_CREATED, async (data) => {
            console.log('🔔 Task created:', data);
            // Refresh nếu task thuộc project đang hiển thị
            await loadDashboardData();
        });

        // Listen to time entry events
        eventBus.on(Events.ENTRY_CREATED, async (data) => {
            console.log('🔔 Entry created:', data);
            await loadDashboardData();
        });

        eventBus.on(Events.ENTRY_UPDATED, async (data) => {
            console.log('🔔 Entry updated:', data);
            const entries = await api.getTimeEntries({ limit: 100 });
            allEntries = entries;
            renderRecentActivities(entries);
            calculateTodayHours(entries);
        });

        eventBus.on(Events.ENTRY_DELETED, async (data) => {
            console.log('🔔 Entry deleted:', data);
            await loadDashboardData();
        });

        eventBus.on(Events.ENTRY_BULK_DELETED, async (data) => {
            console.log('🔔 Bulk entries deleted:', data);
            await loadDashboardData();
        });

        // Listen to refresh events
        eventBus.on(Events.DATA_REFRESH, async () => {
            console.log('🔔 Data refresh requested');
            await loadDashboardData();
        });

        console.log('✅ EventBus listeners registered');
    }

    // ============ INITIALIZATION ============
    initUserInfo();
    await loadDashboardData();
    setupEventListeners();
    setupVisibilityListener();
    setupEventBusListeners(); // ✅ NEW: Setup EventBus

    // ============ CORE FUNCTIONS ============

    function initUserInfo() {
        const userInfo = api.getUserInfo();
        if (dom.welcomeUser && userInfo) {
            const name = userInfo.full_name || userInfo.username || 'Bạn';
            dom.welcomeUser.textContent = `Xin chào, ${name}!`;
        }
    }

    async function loadDashboardData() {
        try {
            showLoadingState();

            const [projects, timer, entries] = await Promise.all([
                api.getProjects().catch(err => {
                    console.error('getProjects error:', err);
                    return [];
                }),
                api.getCurrentTimer().catch(err => {
                    console.error('getCurrentTimer error:', err);
                    return null;
                }),
                api.getTimeEntries({ limit: 100 }).catch(err => {
                    console.error('getTimeEntries error:', err);
                    return [];
                })
            ]);

            currentTimer = timer;
            allEntries = entries;

            updateOnboardingCard(projects);
            updateStatsCards(projects, entries);
            updateStatusCard(timer);
            renderRecentActivities(entries);
            calculateTodayHours(entries);

            setupAutoRefresh();

        } catch (error) {
            console.error('❌ Dashboard Load Error:', error);
            showErrorState(error.message);
            
            if (error.message.includes('401') || error.message.includes('Phiên')) {
                setTimeout(() => api.logout(), 2000);
            }
        }
    }

    function updateOnboardingCard(projects) {
        if (!dom.onboardingCard) return;
        dom.onboardingCard.style.display = projects.length === 0 ? 'block' : 'none';
    }

    function updateStatsCards(projects, entries) {
        if (dom.totalProjects) {
            dom.totalProjects.textContent = projects.length;
        }
        
        if (dom.totalEntries) {
            dom.totalEntries.textContent = entries.length;
        }
    }

    function calculateTodayHours(entries) {
        if (!dom.totalHoursToday) return;

        try {
            let todayEntries;
            
            if (hasUtils) {
                todayEntries = entries.filter(e => {
                    if (!e.end_time) return false;
                    return Utils.isToday(e.start_time);
                });
            } else {
                const today = new Date().toDateString();
                todayEntries = entries.filter(e => {
                    if (!e.end_time) return false;
                    return new Date(e.start_time).toDateString() === today;
                });
            }

            const totalSeconds = todayEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
            
            if (hasUtils) {
                dom.totalHoursToday.textContent = Utils.formatDurationHours(totalSeconds);
            } else {
                dom.totalHoursToday.textContent = (totalSeconds / 3600).toFixed(1);
            }

        } catch (error) {
            console.error('Today hours calculation error:', error);
            dom.totalHoursToday.textContent = '0.0';
        }
    }

    function updateStatusCard(timer) {
        if (!dom.runningStatus || !dom.statusCardWrapper) return;

        if (timer && timer.start_time) {
            dom.statusCardWrapper.classList.remove('card-stopped');
            dom.statusCardWrapper.classList.add('card-running');

            let elapsed, elapsedStr, timeStr;

            if (hasUtils) {
                const startTimestamp = Utils.parseISOToTimestamp(timer.start_time);
                elapsed = Utils.calculateElapsed(startTimestamp);
                elapsedStr = Utils.formatDuration(elapsed);
                timeStr = Utils.formatTimeLocal(startTimestamp, false);
            } else {
                const startTime = new Date(timer.start_time);
                elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
                elapsedStr = formatDurationFallback(elapsed);
                timeStr = startTime.toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            dom.runningStatus.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; color: #27ae60; font-weight: bold; font-size: 1.2rem; justify-content: center;">
                    <i class="fa-solid fa-circle" style="font-size: 0.5rem; animation: blink 1.5s infinite;"></i>
                    Đang chạy
                </div>
                <div style="margin-top: 12px;">
                    <div style="font-size: 2rem; font-weight: bold; color: #27ae60; font-family: 'Courier New', monospace;">
                        ${elapsedStr}
                    </div>
                    <small class="text-muted">Task #${timer.task_id}</small>
                    <div style="font-size: 0.85rem; color: #95a5a6; margin-top: 4px;">
                        Bắt đầu lúc ${timeStr}
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <a href="tracking.html" class="btn btn-sm btn-success" style="text-decoration: none;">
                        <i class="fa-solid fa-stop"></i> Dừng Timer
                    </a>
                </div>
            `;

        } else {
            dom.statusCardWrapper.classList.remove('card-running');
            dom.statusCardWrapper.classList.add('card-stopped');

            dom.runningStatus.innerHTML = `
                <div style="color: #95a5a6; font-size: 1.1rem; margin-bottom: 15px;">
                    <i class="fa-solid fa-pause-circle"></i> Đang nghỉ ngơi
                </div>
                <div style="font-size: 0.9rem; color: #aaa; margin-bottom: 15px;">
                    Nhấn nút bên dưới để bắt đầu tracking
                </div>
                <div>
                    <a href="tracking.html" class="btn btn-sm btn-primary" style="text-decoration: none;">
                        <i class="fa-solid fa-play"></i> Bắt đầu Timer
                    </a>
                </div>
            `;
        }
    }

    function renderRecentActivities(entries) {
        if (!dom.recentActivities) return;

        if (entries.length === 0) {
            dom.recentActivities.innerHTML = `
                <p class="text-muted text-center" style="padding: 30px;">
                    <i class="fa-solid fa-inbox" style="font-size: 2rem; opacity: 0.3; display: block; margin-bottom: 10px;"></i>
                    Chưa có hoạt động nào
                </p>
            `;
            return;
        }

        const recent = entries.slice(0, 5);
        
        const html = recent.map(e => {
            let dateFormatted, durationStr;

            if (hasUtils) {
                const timestamp = Utils.parseISOToTimestamp(e.start_time);
                dateFormatted = new Date(timestamp).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit'
                });
            } else {
                dateFormatted = new Date(e.start_time).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit'
                });
            }

            if (e.end_time && e.duration) {
                if (hasUtils) {
                    durationStr = Utils.formatDurationHuman(e.duration);
                } else {
                    const minutes = Math.floor(e.duration / 60);
                    durationStr = minutes > 0 ? `${minutes}p` : '<1p';
                }
            } else {
                durationStr = '<span style="color:#27ae60; font-weight: 600;">⏱️ Running</span>';
            }

            let noteText = e.note || 'Không có ghi chú';
            if (hasUtils) {
                noteText = Utils.escapeHtml(noteText);
            } else {
                noteText = escapeHtmlFallback(noteText);
            }

            const iconClass = ['bg-blue', 'bg-green', 'bg-orange'][e.id % 3];

            return `
                <div class="activity-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 10px; border-bottom: 1px solid #f0f0f0;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="icon-box ${iconClass}" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
                            <i class="fa-solid fa-check"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #2c3e50; font-size: 0.95rem;">
                                Task #${e.task_id}
                            </div>
                            <div style="font-size: 0.85rem; color: #888; margin-top: 2px;">
                                ${noteText}
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div class="badge" style="font-weight: 600; font-size: 0.85rem;">
                            ${durationStr}
                        </div>
                        <div style="font-size: 0.75rem; color: #aaa; margin-top: 4px;">
                            ${dateFormatted}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        dom.recentActivities.innerHTML = html;
    }

    function setupAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }

        if (currentTimer && currentTimer.start_time) {
            refreshInterval = setInterval(() => {
                updateStatusCard(currentTimer);
            }, 1000);
            
            console.log('🔄 Auto-refresh: 1s (timer running)');
        } else {
            refreshInterval = setInterval(async () => {
                const timer = await api.getCurrentTimer().catch(() => null);
                
                if (timer && !currentTimer) {
                    console.log('🔄 New timer detected - reloading...');
                    await loadDashboardData();
                } else if (!timer && currentTimer) {
                    console.log('🔄 Timer stopped - reloading...');
                    await loadDashboardData();
                }
            }, 30000);
            
            console.log('🔄 Auto-refresh: 30s (timer stopped)');
        }
    }

    function setupEventListeners() {
        if (dom.logoutBtn) {
            dom.logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Bạn có chắc muốn đăng xuất?')) {
                    api.logout();
                }
            });
        }

        const navMap = {
            'manageProjectsBtn': 'projects.html',
            'startTrackingBtn': 'tracking.html',
            'viewReportBtn': 'report.html',
            'goProjectsBtn': 'projects.html',
            'goTrackingBtn': 'tracking.html'
        };

        for (const [btnId, url] of Object.entries(navMap)) {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.href = url;
                });
            }
        }
    }

    function setupVisibilityListener() {
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
                console.log('👁️ Tab visible - checking for updates...');
                
                const latestTimer = await api.getCurrentTimer().catch(() => null);
                
                const timerChanged = (
                    (latestTimer && !currentTimer) ||
                    (!latestTimer && currentTimer) ||
                    (latestTimer?.id !== currentTimer?.id)
                );

                if (timerChanged) {
                    console.log('🔄 Timer state changed - reloading dashboard');
                    await loadDashboardData();
                }
            }
        });
    }

    window.addEventListener('beforeunload', () => {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    });

    // ============ UI STATE HELPERS ============

    function showLoadingState() {
        if (dom.recentActivities) {
            dom.recentActivities.innerHTML = `
                <div class="text-center" style="padding: 30px;">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: #3498db;"></i>
                    <p class="text-muted" style="margin-top: 10px;">Đang tải dữ liệu...</p>
                </div>
            `;
        }
    }

    function showErrorState(message) {
        if (dom.recentActivities) {
            dom.recentActivities.innerHTML = `
                <div class="text-center" style="padding: 30px;">
                    <i class="fa-solid fa-exclamation-triangle" style="font-size: 2rem; color: #e74c3c;"></i>
                    <p class="text-muted" style="margin-top: 10px;">Lỗi: ${message}</p>
                    <button class="btn btn-primary btn-sm" onclick="location.reload()" style="margin-top: 15px;">
                        <i class="fa-solid fa-rotate-right"></i> Thử lại
                    </button>
                </div>
            `;
        }
    }

    // ============ FALLBACK FUNCTIONS ============

    function formatDurationFallback(seconds) {
        if (seconds < 0) seconds = 0;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    function pad(num) {
        return String(num).padStart(2, '0');
    }

    function escapeHtmlFallback(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});

// ============ GLOBAL STYLES ============
const dashboardStyles = document.createElement('style');
dashboardStyles.textContent = `
    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.2; }
    }
    
    .activity-item {
        transition: all 0.2s ease;
        border-radius: 8px;
    }
    
    .activity-item:hover {
        background: #f8f9fa;
        transform: translateX(3px);
    }
    
    .badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
        background: #e3f2fd;
        color: #3498db;
    }
    
    .bg-blue { background: #e3f2fd; color: #3498db; }
    .bg-green { background: #e8f5e9; color: #27ae60; }
    .bg-orange { background: #fff3e0; color: #f39c12; }
`;
document.head.appendChild(dashboardStyles);

console.log('✅ Dashboard.js with EventBus loaded');
console.log('📦 EventBus:', typeof eventBus !== 'undefined' ? 'Available ✓' : 'Not loaded');
console.log('🔐 Authenticated:', api.getToken() ? 'Yes ✓' : 'No ✗');