class TimeTrackingApp {
    constructor() {
        this.currentProjectId = null;
        this.timerInterval = null;
        this.seconds = 0;
        this.runningTaskId = null; // ID của task đang chạy
        
        // Khởi tạo app khi DOM load xong
        this.init();
    }

    async init() {
        // 1. Kiểm tra đăng nhập (Sử dụng AuthManager)
        if (!window.authManager || !window.authManager.isLoggedIn()) {
            console.log("Chưa đăng nhập hoặc AuthManager chưa tải.");
            return;
        }
        
        // 2. Setup các event listeners (Dropdown, Form...)
        this.setupEventListeners();
        
        // 3. Load danh sách Project ban đầu vào Dropdown
        await this.loadProjects();
    }

    setupEventListeners() {
        // Sự kiện khi chọn Project từ dropdown
        const boardSelect = document.getElementById('boardSelect');
        if (boardSelect) {
            boardSelect.addEventListener('change', (e) => {
                this.switchProject(e.target.value);
            });
        }

        // Sự kiện Submit form tạo Task mới
        const taskForm = document.getElementById('taskForm'); // Đảm bảo ID này khớp với modal trong index.html (cần thêm nếu chưa có)
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => this.handleCreateTask(e));
        }
    }

    // --- QUẢN LÝ PROJECT ---

    async loadProjects() {
        try {
            // Gọi API lấy danh sách project của user
            // Endpoint này bạn đã tạo ở Giai đoạn 2: GET /projects/
            const projects = await api.request('/projects/'); 
            
            const boardSelect = document.getElementById('boardSelect');
            // Reset dropdown
            boardSelect.innerHTML = '<option value="">-- Chọn Project để bắt đầu --</option>';
            
            projects.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = p.name;
                boardSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Lỗi tải danh sách projects:", error);
        }
    }

    async switchProject(projectId) {
        if (!projectId) {
            document.getElementById('kanbanBoard').classList.add('hidden');
            document.getElementById('emptyState').classList.remove('hidden');
            return;
        }

        this.currentProjectId = projectId;
        
        // Hiển thị giao diện chính, ẩn màn hình chờ
        document.getElementById('kanbanBoard').classList.remove('hidden');
        const emptyState = document.getElementById('emptyState');
        if(emptyState) emptyState.classList.add('hidden');
        
        // Cập nhật tên Project trên Header
        const select = document.getElementById('boardSelect');
        const projectName = select.options[select.selectedIndex].text;
        document.getElementById('boardTitle').textContent = projectName;

        // Load Tasks của project này
        await this.loadTasks(projectId);
    }

    // --- QUẢN LÝ TASK ---

    async loadTasks(projectId) {
        try {
            // Gọi API lấy task theo project_id (đã update trong api.js)
            const tasks = await api.getTasks(projectId);
            this.renderTasks(tasks);
        } catch (error) {
            alert('Không thể tải danh sách task: ' + error.message);
        }
    }

    renderTasks(tasks) {
        const tbody = document.getElementById('taskListBody');
        tbody.innerHTML = '';

        if (tasks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Chưa có task nào. Hãy tạo mới!</td></tr>';
            return;
        }

        tasks.forEach(task => {
            const tr = document.createElement('tr');
            tr.className = 'task-row';
            
            // Format tổng thời gian (Giây -> HH:MM:SS)
            const formattedTime = this.formatTime(task.total_time);
            
            // Logic xác định trạng thái nút bấm
            // Lưu ý: Logic này đơn giản ở Client. 
            // Để chính xác tuyệt đối, API getTasks nên trả về field "is_running"
            const isRunning = this.runningTaskId === task.id;
            
            const btnClass = isRunning ? 'btn-stop' : 'btn-play';
            const btnIcon = isRunning ? '⏹' : '▶'; // Icon Stop hoặc Play
            const btnTitle = isRunning ? 'Dừng bấm giờ' : 'Bắt đầu bấm giờ';
            // Action tương ứng
            const btnAction = isRunning ? `app.handleStop(${task.id})` : `app.handleStart(${task.id})`;

            tr.innerHTML = `
                <td>
                    <strong style="color:#2c3e50; font-size: 1.1em;">${task.title}</strong><br>
                    <small style="color:#7f8c8d;">${task.description || ''}</small>
                </td>
                <td>
                    <span style="background:#ecf0f1; padding:4px 8px; border-radius:4px; font-size:12px; color:#2c3e50; font-weight:600;">
                        ${task.status.toUpperCase()}
                    </span>
                </td>
                <td class="time-cell" style="font-family:'Courier New', monospace; font-weight:bold; font-size: 1.1em; color:#2980b9;" id="time-${task.id}">
                    ${formattedTime}
                </td>
                <td style="text-align: right;">
                    <button class="btn-icon ${btnClass}" onclick="${btnAction}" title="${btnTitle}">
                        ${btnIcon}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- LOGIC BẤM GIỜ (TIME TRACKING) ---
    
    // 1. Xử lý khi bấm Start
    async handleStart(taskId) {
        try {
            // Gọi API Start (Backend Giai đoạn 3)
            await api.startTimer(taskId);
            
            // Cập nhật trạng thái UI
            this.runningTaskId = taskId;
            
            // Bắt đầu đếm giây ở client (Hiệu ứng hình ảnh)
            this.startLocalTimer(); 
            
            // Reload lại list để cập nhật nút bấm (Chuyển từ Play -> Stop)
            this.loadTasks(this.currentProjectId); 
            
        } catch (error) {
            alert('Lỗi khởi động timer: ' + error.message);
        }
    }

    // 2. Xử lý khi bấm Stop
    async handleStop(taskId) {
        try {
            // Gọi API Stop (Backend tính toán thời gian thực)
            const result = await api.stopTimer();
            
            // Dừng UI
            this.stopLocalTimer();
            this.runningTaskId = null;
            
            // Reload lại list để lấy tổng thời gian chính xác mới nhất từ server
            await this.loadTasks(this.currentProjectId);
            
            // Thông báo nhỏ (Optional)
            console.log(`Đã dừng! Session vừa rồi: ${result.duration} giây.`);
        } catch (error) {
            alert('Lỗi dừng timer: ' + error.message);
        }
    }

    // --- HELPER: ĐỒNG HỒ ĐẾM GIÂY (HEADER) ---
    startLocalTimer() {
        this.stopLocalTimer(); // Clear timer cũ nếu có để tránh trùng lặp
        
        const timerDisplay = document.getElementById('timerDisplay');
        const globalTimer = document.getElementById('globalTimer');
        
        if(globalTimer) globalTimer.classList.remove('hidden');

        this.seconds = 0; 
        // Tạo bộ đếm mỗi giây tăng 1 lần (Client side only)
        this.timerInterval = setInterval(() => {
            this.seconds++;
            // Format thành HH:MM:SS để hiển thị trên header
            const timeString = this.formatTime(this.seconds);
            if(timerDisplay) timerDisplay.textContent = timeString;
        }, 1000);
    }

    stopLocalTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        const globalTimer = document.getElementById('globalTimer');
        if(globalTimer) globalTimer.classList.add('hidden');
        
        // Reset text về 00:00:00
        const timerDisplay = document.getElementById('timerDisplay');
        if(timerDisplay) timerDisplay.textContent = "00:00:00";
    }

    // Helper format giây thành HH:MM:SS
    formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        // Pad with leading zeros (e.g., 01:05:09)
        return [hours, minutes, seconds]
            .map(val => val.toString().padStart(2, '0'))
            .join(':');
    }
    
    // --- MODAL TẠO TASK ---
    showNewTaskModal() {
        if (!this.currentProjectId) {
            alert("Vui lòng chọn Project trước khi tạo Task!");
            return;
        }
        const modal = document.getElementById('taskModal');
        // Reset form khi mở
        const form = document.getElementById('taskForm');
        if(form) form.reset();
        
        if(modal) modal.classList.remove('hidden');
    }

    closeTaskModal() {
        const modal = document.getElementById('taskModal');
        if(modal) modal.classList.add('hidden');
    }

    async handleCreateTask(e) {
        e.preventDefault();
        const titleInput = document.getElementById('taskTitle');
        const descInput = document.getElementById('taskDescription');
        
        const taskData = {
            title: titleInput.value,
            description: descInput.value,
            project_id: this.currentProjectId,
            status: "todo"
        };

        try {
            await api.createTask(taskData);
            this.closeTaskModal();
            // Reload list để thấy task mới
            this.loadTasks(this.currentProjectId);
        } catch (error) {
            alert('Lỗi tạo task: ' + error.message);
        }
    }
}

// Khởi tạo ứng dụng khi trang web load xong
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TimeTrackingApp();
});