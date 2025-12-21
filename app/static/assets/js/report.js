document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Report.js initializing...');
    
    // ============ ENVIRONMENT CHECK ============
    if (typeof api === 'undefined') {
        console.error("❌ Error: api.js not loaded");
        alert("Lỗi: Chưa load api.js. Vui lòng kiểm tra lại!");
        return;
    }
    
    const token = api.getToken();
    if (!token) {
        console.warn('⚠️ No token found, redirecting to login...');
        window.location.href = 'login.html';
        return;
    }

    console.log('✅ API loaded, token present');

    if (typeof eventBus === 'undefined') {
        console.warn('⚠️ EventBus not loaded - real-time sync disabled');
    } else {
        console.log('✅ EventBus loaded');
    }

    // --- DOM ELEMENTS ---
    const dom = {
        reportDate: document.getElementById('reportDate'),
        filterBtn: document.getElementById('filterBtn'),
        tableBody: document.getElementById('reportTableBody'),
        totalHours: document.getElementById('totalHoursDay'),
        exportBtn: document.getElementById('exportCsvBtn'),
        logoutBtn: document.getElementById('logoutBtn')
    };

    // Validate DOM elements
    const missingElements = Object.entries(dom)
        .filter(([key, el]) => !el)
        .map(([key]) => key);
    
    if (missingElements.length > 0) {
        console.error('❌ Missing DOM elements:', missingElements);
        alert(`Lỗi giao diện: Không tìm thấy ${missingElements.join(', ')}`);
        return;
    }

    console.log('✅ All DOM elements found');

    // State management
    let allEntries = [];
    let currentFilter = null;

    // --- INITIALIZATION ---
    initPage();
    setupEventBusListeners();

    function initPage() {
        console.log('📋 Initializing page...');
        
        const today = getTodayDateString();
        console.log('📅 Today date:', today);
        
        if (dom.reportDate) {
            dom.reportDate.value = today;
            currentFilter = today;
            console.log('✅ Date input set to:', today);
        }

        setupEventListeners();
        loadData();
    }

    // ============ EVENTBUS INTEGRATION ============
    
    function setupEventBusListeners() {
        if (typeof eventBus === 'undefined') {
            console.warn('⚠️ EventBus not available, skipping listeners');
            return;
        }

        console.log('📡 Setting up EventBus listeners for Report...');

        // Listen to timer events (most important for report page)
        eventBus.on(Events.TIMER_STOPPED, async (data, event) => {
            console.log('🔔 Timer stopped event received:', data);
            console.log('📌 Event source:', event.source);
            
            // Reload data to get the newly created entry
            await loadData();
            showNotification('✅ Đã cập nhật dữ liệu mới', 'success', 2000);
        });

        // Listen to entry events
        eventBus.on(Events.ENTRY_CREATED, async (data, event) => {
            if (event.source === 'current_tab') {
                console.log('🔔 Entry created in current tab (skipping reload)');
                return;
            }
            console.log('🔔 Entry created in another tab:', data);
            await loadData();
        });

        eventBus.on(Events.ENTRY_UPDATED, async (data, event) => {
            if (event.source === 'current_tab') return;
            console.log('🔔 Entry updated in another tab:', data);
            
            // Update specific entry without full reload
            const entry = allEntries.find(e => e.id === data.entryId);
            if (entry && data.note !== undefined) {
                entry.note = data.note;
                renderTable();
            }
        });

        eventBus.on(Events.ENTRY_DELETED, async (data, event) => {
            if (event.source === 'current_tab') return;
            console.log('🔔 Entry deleted in another tab:', data);
            await loadData();
        });

        eventBus.on(Events.ENTRY_BULK_DELETED, async (data, event) => {
            if (event.source === 'current_tab') return;
            console.log('🔔 Bulk delete in another tab:', data);
            await loadData();
        });

        console.log('✅ EventBus listeners registered for Report');
    }

    // --- UTILITY FUNCTIONS ---
    
    function getTodayDateString() {
        const today = new Date();
        return formatDateToYYYYMMDD(today);
    }

    function formatDateToYYYYMMDD(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getLocalDateFromISO(isoString) {
        const date = new Date(isoString);
        return formatDateToYYYYMMDD(date);
    }

    function formatDuration(seconds) {
        if (!seconds || seconds === 0) return '0.00';
        return (seconds / 3600).toFixed(2);
    }

    function formatTime(isoString) {
        return new Date(isoString).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    // --- EVENT LISTENERS SETUP ---
    
    function setupEventListeners() {
        console.log('🎯 Setting up event listeners...');
        
        if (dom.filterBtn) {
            dom.filterBtn.addEventListener('click', handleFilterClick);
        }

        if (dom.exportBtn) {
            dom.exportBtn.addEventListener('click', handleExport);
        }

        if (dom.logoutBtn) {
            dom.logoutBtn.addEventListener('click', handleLogout);
        }

        if (dom.reportDate) {
            dom.reportDate.addEventListener('change', () => {
                currentFilter = dom.reportDate.value;
                console.log('📅 Date changed to:', currentFilter);
                renderTable();
            });
        }

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                handleExport();
            }
        });

        console.log('✅ Event listeners setup complete');
    }

    // --- EVENT HANDLERS ---
    
    function handleFilterClick() {
        currentFilter = dom.reportDate.value;
        console.log('🔍 Filter button clicked, date:', currentFilter);
        showLoadingState();
        
        setTimeout(() => {
            renderTable();
        }, 200);
    }

    function handleLogout() {
        if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
            api.logout();
        }
    }

    async function handleExport() {
        try {
            const date = dom.reportDate.value;
            const dataToExport = filterEntriesByDate(date);
            
            if (dataToExport.length === 0) {
                showNotification('Không có dữ liệu để xuất file cho ngày này', 'warning');
                return;
            }
            
            exportToCSV(dataToExport, date);
            showNotification('Đã xuất file CSV thành công!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showNotification('Lỗi khi xuất file: ' + error.message, 'error');
        }
    }

    // --- CORE FUNCTIONS ---

    async function loadData() {
        showLoadingState();
        
        try {
            console.log('🔄 Loading report data...');
            console.log('📡 API endpoint: /time-entries/?limit=200');
            
            // ✅ Load with higher limit to ensure we get enough data
            const response = await api.request('/time-entries/?limit=200');
            
            console.log('📥 Raw API response:', response);
            console.log('📦 Response type:', Array.isArray(response) ? 'Array' : 'Object');
            
            // ✅ Handle both array and paginated response
            if (Array.isArray(response)) {
                allEntries = response;
                console.log('✅ Response is array, using directly');
            } else if (response && response.data && Array.isArray(response.data)) {
                allEntries = response.data;
                console.log('✅ Response is paginated object, using .data property');
                console.log('📊 Pagination info:', {
                    total: response.total,
                    page: response.page,
                    has_next: response.has_next
                });
            } else {
                console.warn('⚠️ Unknown response format:', response);
                allEntries = [];
            }
            
            console.log(`✅ Loaded ${allEntries.length} entries`);
            
            // Debug: Log first few entries
            if (allEntries.length > 0) {
                console.log('📝 First entry sample:', allEntries[0]);
                console.log('📝 First entry start_time:', allEntries[0].start_time);
                console.log('📝 First entry end_time:', allEntries[0].end_time);
                console.log('📝 First entry duration:', allEntries[0].duration);
            }
            
            // Sort by start_time descending (newest first)
            allEntries.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
            
            console.log('✅ Entries sorted by start_time');
            
            renderTable();
            
        } catch (error) {
            console.error('❌ Load data error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
            showErrorState(`Lỗi kết nối: ${error.message}`);
        }
    }

    function filterEntriesByDate(dateStr) {
        if (!allEntries || allEntries.length === 0) {
            console.log('⚠️ No entries to filter');
            return [];
        }
        
        console.log(`🔍 Filtering ${allEntries.length} entries for date: ${dateStr}`);
        console.log('📅 Filter date (YYYY-MM-DD):', dateStr);
        
        const filtered = allEntries.filter((entry, index) => {
            const entryDate = getLocalDateFromISO(entry.start_time);
            const match = entryDate === dateStr;
            
            // Debug log for each entry
            if (index < 5) { // Log first 5 entries
                console.log(`Entry ${index}:`, {
                    id: entry.id,
                    start_time: entry.start_time,
                    parsed_date: entryDate,
                    filter_date: dateStr,
                    match: match
                });
            }
            
            if (match) {
                console.log(`✓ Match found: Entry #${entry.id} - ${entry.start_time} -> ${entryDate}`);
            }
            
            return match;
        });
        
        console.log(`✅ Found ${filtered.length} entries for ${dateStr}`);
        
        if (filtered.length === 0) {
            console.warn('⚠️ No entries match the selected date!');
            console.warn('💡 This could be due to:');
            console.warn('   1. No entries exist for this date');
            console.warn('   2. Timezone mismatch between server and client');
            console.warn('   3. Date format parsing issue');
            
            // Show some sample dates from entries
            if (allEntries.length > 0) {
                const sampleDates = allEntries.slice(0, 5).map(e => ({
                    id: e.id,
                    start_time: e.start_time,
                    local_date: getLocalDateFromISO(e.start_time)
                }));
                console.log('📅 Sample entry dates:', sampleDates);
            }
        }
        
        return filtered;
    }

    function calculateTotalDuration(entries) {
        return entries.reduce((total, entry) => {
            return total + (entry.duration || 0);
        }, 0);
    }

    function renderTable() {
        const selectedDate = dom.reportDate.value;
        const filtered = filterEntriesByDate(selectedDate);

        console.log(`📊 Rendering table for ${selectedDate}: ${filtered.length} entries`);

        if (filtered.length === 0) {
            showEmptyState(selectedDate);
            updateTotalHours(0);
            return;
        }

        const totalSeconds = calculateTotalDuration(filtered);

        dom.tableBody.innerHTML = filtered.map(entry => createTableRow(entry)).join('');

        attachActionListeners();

        updateTotalHours(totalSeconds);
        
        console.log('✅ Table rendered successfully');
    }

    function createTableRow(entry) {
        const startTime = formatTime(entry.start_time);
        const isRunning = !entry.end_time;
        
        let endTime, durationDisplay;
        
        if (isRunning) {
            endTime = '<span style="color:#27ae60; font-weight:bold"><i class="fa-solid fa-circle-play"></i> Đang chạy</span>';
            durationDisplay = '<span style="color:#999">--</span>';
        } else {
            endTime = formatTime(entry.end_time);
            durationDisplay = formatDuration(entry.duration) + ' h';
        }

        const note = entry.note || '<span style="color:#ccc; font-style:italic">Không có ghi chú</span>';

        return `
            <tr data-entry-id="${entry.id}">
                <td style="text-align:center; font-weight:bold; color:#7f8c8d;">#${entry.task_id || entry.id}</td>
                <td>${startTime}</td>
                <td>${endTime}</td>
                <td style="font-weight:600; color:#2c3e50;">${durationDisplay}</td>
                <td style="max-width: 250px;">
                    <div class="note-content" title="${escapeHtml(entry.note || '')}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${note}
                    </div>
                </td>
                <td style="text-align:center;">
                    <button class="action-btn btn-edit" data-action="edit" data-id="${entry.id}" title="Sửa ghi chú">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="action-btn btn-delete" data-action="delete" data-id="${entry.id}" title="Xóa bản ghi">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function attachActionListeners() {
        const actionButtons = dom.tableBody.querySelectorAll('.action-btn');
        
        actionButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const action = button.dataset.action;
                const entryId = parseInt(button.dataset.id);
                
                if (action === 'edit') {
                    await handleEditNote(entryId);
                } else if (action === 'delete') {
                    await handleDeleteEntry(entryId);
                }
            });
        });
    }

    async function handleEditNote(entryId) {
        const entry = allEntries.find(e => e.id === entryId);
        if (!entry) return;

        const currentNote = entry.note || '';
        const newNote = prompt("📝 Cập nhật ghi chú công việc:", currentNote);
        
        if (newNote === null) return;
        
        const oldNote = entry.note;
        entry.note = newNote;
        renderTable();

        try {
            await api.request(`/time-entries/${entryId}`, {
                method: 'PUT',
                body: JSON.stringify({ note: newNote })
            });
            
            // ✅ Broadcast update event
            if (typeof eventBus !== 'undefined') {
                eventBus.emit(Events.ENTRY_UPDATED, { 
                    entryId: entryId,
                    note: newNote 
                });
            }
            
            showNotification('Đã cập nhật ghi chú', 'success');
            
        } catch (error) {
            entry.note = oldNote;
            renderTable();
            
            console.error('Update note error:', error);
            showNotification('Lỗi cập nhật: ' + error.message, 'error');
        }
    }

    async function handleDeleteEntry(entryId) {
        if (!confirm("⚠️ Cảnh báo:\nBạn có chắc chắn muốn xóa bản ghi thời gian này không?")) {
            return;
        }

        const entryIndex = allEntries.findIndex(e => e.id === entryId);
        if (entryIndex === -1) return;

        const deletedEntry = allEntries.splice(entryIndex, 1)[0];
        renderTable();

        try {
            await api.request(`/time-entries/${entryId}`, {
                method: 'DELETE'
            });
            
            // ✅ Broadcast delete event
            if (typeof eventBus !== 'undefined') {
                eventBus.emit(Events.ENTRY_DELETED, { entryId: entryId });
            }
            
            showNotification('Đã xóa bản ghi', 'success');
            
        } catch (error) {
            allEntries.splice(entryIndex, 0, deletedEntry);
            renderTable();
            
            console.error('Delete error:', error);
            showNotification('Lỗi khi xóa: ' + error.message, 'error');
        }
    }

    function exportToCSV(dataToExport, date) {
        let csvContent = "\uFEFF";
        
        csvContent += "BÁO CÁO THỜI GIAN LÀM VIỆC\n";
        csvContent += `Ngày: ${formatDateDisplay(date)}\n`;
        csvContent += `Xuất lúc: ${new Date().toLocaleString('vi-VN')}\n\n`;
        
        csvContent += "ID,Bắt đầu,Kết thúc,Thời lượng (Giờ),Ghi chú\n";
        
        dataToExport.forEach(entry => {
            const start = formatTime(entry.start_time);
            const end = entry.end_time ? formatTime(entry.end_time) : 'Đang chạy';
            const duration = formatDuration(entry.duration);
            const note = (entry.note || '')
                .replace(/"/g, '""')
                .replace(/\n/g, ' ');
            
            csvContent += `${entry.task_id || entry.id},"${start}","${end}",${duration},"${note}"\n`;
        });
        
        const totalSeconds = calculateTotalDuration(dataToExport);
        const totalHours = formatDuration(totalSeconds);
        csvContent += `\nTÓM TẮT\n`;
        csvContent += `Tổng số bản ghi,${dataToExport.length}\n`;
        csvContent += `Tổng thời gian,${totalHours} giờ\n`;
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", `TimeTracking_Report_${date}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    function formatDateDisplay(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function updateTotalHours(totalSeconds) {
        const hours = formatDuration(totalSeconds);
        dom.totalHours.innerHTML = `${hours} <small>giờ</small>`;
    }

    // --- UI STATE FUNCTIONS ---
    
    function showLoadingState() {
        dom.tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #888;">
                    <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <div style="margin-top: 10px;">Đang tải dữ liệu...</div>
                </td>
            </tr>`;
        updateTotalHours(0);
    }

    function showEmptyState(date) {
        dom.tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding: 40px; color: #999;">
                    <i class="fa-regular fa-folder-open fa-2x" style="margin-bottom:10px; display:block"></i>
                    Không có dữ liệu làm việc trong ngày <strong>${formatDateDisplay(date)}</strong>
                    <div style="margin-top: 15px; font-size: 0.9rem; color: #bbb;">
                        💡 Kiểm tra Console (F12) để xem log debug
                    </div>
                </td>
            </tr>`;
    }

    function showErrorState(message) {
        dom.tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; color:#e74c3c; padding: 40px;">
                    <i class="fa-solid fa-triangle-exclamation fa-2x" style="margin-bottom:10px; display:block;"></i>
                    ${message}
                    <div style="margin-top: 15px;">
                        <button class="btn btn-primary" onclick="location.reload()">
                            <i class="fa-solid fa-rotate-right"></i> Thử lại
                        </button>
                    </div>
                </td>
            </tr>`;
        updateTotalHours(0);
    }

    function showNotification(message, type = 'info', duration = 3000) {
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            font-weight: 500;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    console.log('✅ Report.js initialization complete');
});

console.log('✅ Report.js with EventBus loaded');
console.log('📡 EventBus:', typeof eventBus !== 'undefined' ? 'Available ✓' : 'Not loaded');