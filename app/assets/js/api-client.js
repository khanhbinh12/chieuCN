class TimeTrackingApp {
    constructor() {
        this.currentProjectId = null;
        this.timerInterval = null;
        this.seconds = 0;
        this.runningTaskId = null;

        this.init();
    }

    async init() {
        // Ensure the user is logged in before proceeding
        if (!window.authManager || !window.authManager.isLoggedIn()) {
            console.log("User not logged in.");
            return;
        }

        this.setupEventListeners();
        await this.loadProjects();

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
            hourly_rate: 0  // Ensure this field is included
        };

        try {
            const newProject = await api.createProject(projectData);
            console.log("Project Created Successfully", newProject);
            alert("Dự án đã được tạo thành công!");

            // Load updated projects list
            await this.loadProjects();
        } catch (error) {
            console.error("Error creating project:", error);
            alert("Lỗi tạo dự án: " + error.message);
        }
    }

    // Load Projects (this method is responsible for updating the project list)
    async loadProjects() {
        try {
            const projects = await api.getProjects();
            const boardSelect = document.getElementById("boardSelect");
            if (!boardSelect) return;

            boardSelect.innerHTML = '<option value="">-- Chọn Project để bắt đầu --</option>';
            projects.forEach((p) => {
                const option = document.createElement("option");
                option.value = p.id;
                option.textContent = p.name;
                boardSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading projects:", error);
            alert("Không thể tải danh sách project: " + error.message);
        }
    }

    showNewProjectModal() {
        const modal = document.getElementById("projectModal");
        if (modal) modal.classList.remove("hidden");
    }

    closeProjectModal() {
        const modal = document.getElementById("projectModal");
        if (modal) modal.classList.add("hidden");
    }
}

// Initialize the app when the page loads
document.addEventListener("DOMContentLoaded", () => {
    window.app = new TimeTrackingApp();
});
