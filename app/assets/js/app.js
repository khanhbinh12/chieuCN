class TimeTrackingApp {
    constructor() {
        this.currentProjectId = null;
        this.timerInterval = null;
        this.seconds = 0;
        this.runningTaskId = null;

        this.init();
    }

    async init() {
        // Kiểm tra nếu chưa đăng nhập
        if (!window.authManager || !window.authManager.isLoggedIn()) {
            console.log("Chưa đăng nhập hoặc AuthManager chưa tải.");
            return;
        }

        this.setupEventListeners();
        await this.loadProjects();

        // Kiểm tra nếu có project đã chọn trước đó
        const savedProjectId = localStorage.getItem("current_project_id");
        if (savedProjectId) {
            const boardSelect = document.getElementById("boardSelect");
            if (boardSelect) {
                boardSelect.value = savedProjectId;
                await this.switchProject(savedProjectId);
            }
        }
    }

    setupEventListeners() {
        const boardSelect = document.getElementById("boardSelect");
        if (boardSelect) {
            boardSelect.addEventListener("change", async (e) => {
                const projectId = e.target.value;
                if (projectId) {
                    localStorage.setItem("current_project_id", projectId);
                } else {
                    localStorage.removeItem("current_project_id");
                }
                await this.switchProject(projectId);
            });
        }

        const taskForm = document.getElementById("taskForm");
        if (taskForm) {
            taskForm.addEventListener("submit", (e) => this.handleCreateTask(e));
        }

        const projectForm = document.getElementById("projectForm");
        if (projectForm) {
            projectForm.addEventListener("submit", (e) => this.handleCreateProject(e));
        }

        const createProjectBtn = document.getElementById("createProjectBtn");
        if (createProjectBtn) {
            createProjectBtn.addEventListener("click", () => this.showNewProjectModal());
        }
    }

    // Load danh sách Project
    async loadProjects() {
        try {
            const projects = await api.getProjects();
            const boardSelect = document.getElementById("boardSelect");
            if (!boardSelect) return;

            // Kiểm tra nếu không có project nào
            if (projects.length === 0) {
                alert("Chưa có dự án nào. Hãy tạo một dự án mới!");
            }

            boardSelect.innerHTML = '<option value="">-- Chọn Project để bắt đầu --</option>';
            projects.forEach((p) => {
                const option = document.createElement("option");
                option.value = p.id;
                option.textContent = p.name;
                boardSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Lỗi tải danh sách projects:", error);
            alert("Không thể tải danh sách project: " + error.message);
        }
    }

    // Chuyển đổi giữa các project
    async switchProject(projectId) {
        const kanbanBoard = document.getElementById("kanbanBoard");
        const emptyState = document.getElementById("emptyState");
        const boardTitle = document.getElementById("boardTitle");

        if (!projectId) {
            if (kanbanBoard) kanbanBoard.classList.add("hidden");
            if (emptyState) emptyState.classList.remove("hidden");

            this.stopLocalTimer();
            this.runningTaskId = null;
            this.currentProjectId = null;
            return;
        }

        this.currentProjectId = Number(projectId);

        if (kanbanBoard) kanbanBoard.classList.remove("hidden");
        if (emptyState) emptyState.classList.add("hidden");

        if (boardTitle) {
            const projectName = document.getElementById("boardSelect").options[document.getElementById("boardSelect").selectedIndex]?.text || "Project";
            boardTitle.textContent = projectName;
        }

        this.stopLocalTimer();
        this.runningTaskId = null;

        await this.loadTasks(this.currentProjectId);
    }

    // Hiển thị modal tạo dự án mới
    showNewProjectModal() {
        const modal = document.getElementById("projectModal");
        if (modal) modal.classList.remove("hidden");
    }

    // Đóng modal tạo dự án mới
    closeProjectModal() {
        const modal = document.getElementById("projectModal");
        if (modal) modal.classList.add("hidden");
    }

    // Tạo dự án mới
    async handleCreateProject(e) {
        e.preventDefault();

        const projectName = document.getElementById("projectName").value;
        const projectDescription = document.getElementById("projectDescription").value;

        if (!projectName) {
            alert("Tên dự án không được để trống!");
            return;
        }

        const projectData = {
            name: projectName,
            description: projectDescription,
        };

        try {
            const newProject = await api.createProject(projectData);
            this.closeProjectModal();
            await this.loadProjects();

            // Auto chọn luôn project vừa tạo (nếu muốn)
            if (newProject && newProject.id) {
                const boardSelect = document.getElementById("boardSelect");
                if (boardSelect) {
                    boardSelect.value = newProject.id;
                    localStorage.setItem("current_project_id", newProject.id);
                    await this.switchProject(newProject.id);
                }
            }

            alert("Dự án đã được tạo thành công!");
        } catch (error) {
            console.error("Error creating project:", error);
            alert("Lỗi tạo dự án: " + error.message);
        }
    }

    // --- QUẢN LÝ TASK ---
    async loadTasks(projectId) {
        try {
            const tasks = await api.getTasks(projectId);
            this.renderTasks(tasks);
        } catch (error) {
            console.error(error);
            alert("Không thể tải danh sách task: " + error.message);
        }
    }

    renderTasks(tasks) {
        const tbody = document.getElementById("taskListBody");
        if (!tbody) {
            console.warn("Không tìm thấy #taskListBody trong DOM");
            return;
        }

        tbody.innerHTML = "";

        if (!tasks || tasks.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="4" style="text-align:center; padding: 20px;">Chưa có task nào. Hãy tạo mới!</td></tr>';
            return;
        }

        tasks.forEach((task) => {
            const tr = document.createElement("tr");
            tr.className = "task-row";

            // Format tổng thời gian (Giây -> HH:MM:SS)
            const formattedTime = this.formatTime(task.total_time || 0);

            // Logic xác định trạng thái nút bấm (client side)
            const isRunning = this.runningTaskId === task.id;

            const btnClass = isRunning ? "btn-stop" : "btn-play";
            const btnIcon = isRunning ? "⏹" : "▶";
            const btnTitle = isRunning ? "Dừng bấm giờ" : "Bắt đầu bấm giờ";
            const btnAction = isRunning
                ? `app.handleStop(${task.id})`
                : `app.handleStart(${task.id})`;

            tr.innerHTML = `
                <td>
                    <strong style="color:#2c3e50; font-size: 1.1em;">${task.title}</strong><br>
                    <small style="color:#7f8c8d;">${task.description || ""}</small>
                </td>
                <td>
                    <span style="background:#ecf0f1; padding:4px 8px; border-radius:4px; font-size:12px; color:#2c3e50; font-weight:600;">
                        ${String(task.status || "").toUpperCase()}
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
    async handleStart(taskId) {
        try {
            await api.startTimer(taskId);

            this.runningTaskId = taskId;
            this.startLocalTimer();

            await this.loadTasks(this.currentProjectId);
        } catch (error) {
            console.error(error);
            alert("Lỗi khởi động timer: " + error.message);
        }
    }

    async handleStop(taskId) {
        try {
            const result = await api.stopTimer();

            this.stopLocalTimer();
            this.runningTaskId = null;

            await this.loadTasks(this.currentProjectId);

            if (result && typeof result.duration === "number") {
                console.log(`Đã dừng! Session vừa rồi: ${result.duration} giây.`);
            }
        } catch (error) {
            console.error(error);
            alert("Lỗi dừng timer: " + error.message);
        }
    }

    startLocalTimer() {
        this.stopLocalTimer();

        const timerDisplay = document.getElementById("timerDisplay");
        const globalTimer = document.getElementById("globalTimer");

        if (globalTimer) globalTimer.classList.remove("hidden");

        this.seconds = 0;
        this.timerInterval = setInterval(() => {
            this.seconds++;
            const timeString = this.formatTime(this.seconds);
            if (timerDisplay) timerDisplay.textContent = timeString;
        }, 1000);
    }

    stopLocalTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        const globalTimer = document.getElementById("globalTimer");
        if (globalTimer) globalTimer.classList.add("hidden");

        const timerDisplay = document.getElementById("timerDisplay");
        if (timerDisplay) timerDisplay.textContent = "00:00:00";
    }

    formatTime(totalSeconds) {
        const secondsNum = Number(totalSeconds) || 0;
        const hours = Math.floor(secondsNum / 3600);
        const minutes = Math.floor((secondsNum % 3600) / 60);
        const seconds = secondsNum % 60;

        return [hours, minutes, seconds]
            .map((val) => val.toString().padStart(2, "0"))
            .join(":");
    }

    showNewTaskModal() {
        if (!this.currentProjectId) {
            alert("Vui lòng chọn Project trước khi tạo Task!");
            return;
        }
        const modal = document.getElementById("taskModal");
        const form = document.getElementById("taskForm");

        if (form) form.reset();
        if (modal) modal.classList.remove("hidden");
    }

    closeTaskModal() {
        const modal = document.getElementById("taskModal");
        if (modal) modal.classList.add("hidden");
    }

    async handleCreateTask(e) {
        e.preventDefault();
        if (!this.currentProjectId) {
            alert("Chưa chọn Project!");
            return;
        }

        const titleInput = document.getElementById("taskTitle");
        const descInput = document.getElementById("taskDescription");

        const taskData = {
            title: titleInput?.value || "",
            description: descInput?.value || "",
            project_id: this.currentProjectId,
            status: "todo",
        };

        try {
            await api.createTask(taskData);
            this.closeTaskModal();
            await this.loadTasks(this.currentProjectId);
        } catch (error) {
            console.error("Error creating task:", error);
            alert("Lỗi tạo task: " + error.message);
        }
    }
}

// Khởi tạo ứng dụng khi trang web load xong
document.addEventListener("DOMContentLoaded", () => {
    window.app = new TimeTrackingApp();
});
