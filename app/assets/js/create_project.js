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

        const projectForm = document.getElementById("projectForm");
        if (projectForm) {
            projectForm.addEventListener("submit", (e) => this.handleCreateProject(e));
        }

        const createProjectBtn = document.getElementById("createProjectBtn");
        if (createProjectBtn) {
            createProjectBtn.addEventListener("click", () => this.showNewProjectModal());
        }
    }

    // Load danh sách dự án
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
            // Gửi yêu cầu tạo dự án
            const newProject = await api.createProject(projectData);
            this.closeProjectModal();
            
            // Lưu project_id vào localStorage
            if (newProject && newProject.id) {
                localStorage.setItem("current_project_id", newProject.id);
                alert("Dự án đã được tạo thành công!");

                // Chuyển tới trang quản lý dự án
                await this.switchProject(newProject.id);
            }
        } catch (error) {
            console.error("Error creating project:", error);
            alert("Lỗi tạo dự án: " + error.message);
        }
    }
}
