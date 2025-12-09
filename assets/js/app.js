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
        // Kiểm tra đăng nhập (Sử dụng AuthManager)
        if (!window.authManager || !window.authManager.isLoggedIn()) {
            console.log("Chưa đăng nhập hoặc AuthManager chưa tải.");
            return;
        }

        // Setup các event listeners (Dropdown, Form...)
        this.setupEventListeners();

        // Load danh sách Project ban đầu vào Dropdown
        await this.loadProjects();

        // Nếu có project đã chọn trước đó thì auto chọn lại
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
        // Sự kiện khi chọn Project từ dropdown
        const boardSelect = document.getElementById("boardSelect");
        if (boardSelect) {
            boardSelect.addEventListener("change", async (e) => {
                const projectId = e.target.value;
                // Lưu lại project đã chọn
                if (projectId) {
                    localStorage.setItem("current_project_id", projectId);
                } else {
                    localStorage.removeItem("current_project_id");
                }
                await this.switchProject(projectId);
            });
        }

        // Sự kiện Submit form tạo Task mới
        const taskForm = document.getElementById("taskForm");
        if (taskForm) {
            taskForm.addEventListener("submit", (e) => this.handleCreateTask(e));
        }

        // Sự kiện khi nhấn nút tạo dự án mới
        const createProjectBtn = document.getElementById("createProjectBtn");
        if (createProjectBtn) {
            createProjectBtn.addEventListener("click", () => this.showNewProjectModal());
        }
    }

    // --- QUẢN LÝ PROJECT ---

    async loadProjects() {
        try {
            const projects = await api.getProjects();
            const boardSelect = document.getElementById("boardSelect");
            if (!boardSelect) {
                console.warn("Không tìm thấy #boardSelect trong DOM");
                return;
            }

            // Reset dropdown
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

    async switchProject(projectId) {
        const kanbanBoard = document.getElementById("kanbanBoard");
        const emptyState = document.getElementById("emptyState");
        const boardTitle = document.getElementById("boardTitle");
        const select = document.getElementById("boardSelect");

        if (!projectId) {
            // Nếu không có dự án, ẩn board và hiển thị empty state
            if (kanbanBoard) kanbanBoard.classList.add("hidden");
            if (emptyState) emptyState.classList.remove("hidden");

            // Reset timer khi thoát khỏi project
            this.stopLocalTimer();
            this.runningTaskId = null;
            this.currentProjectId = null;
            return;
        }

        // Đảm bảo là số (nếu cần)
        this.currentProjectId = Number(projectId);

        // Hiển thị giao diện chính, ẩn màn hình chờ
        if (kanbanBoard) kanbanBoard.classList.remove("hidden");
        if (emptyState) emptyState.classList.add("hidden");

        // Cập nhật tên Project trên Header
        if (select && boardTitle) {
            const projectName = select.options[select.selectedIndex]?.text || "Project";
            boardTitle.textContent = projectName;
        }

        // Khi đổi project thì tắt timer local & trạng thái chạy
        this.stopLocalTimer();
        this.runningTaskId = null;

        // Load Tasks của project này
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
            alert("Dự án đã được tạo thành công!");
        } catch (error) {
            console.error(error);
            alert("Lỗi tạo dự án: " + error.message);
        }
    }
}

// Khởi tạo ứng dụng khi trang web load xong
document.addEventListener("DOMContentLoaded", () => {
    window.app = new TimeTrackingApp();
});
