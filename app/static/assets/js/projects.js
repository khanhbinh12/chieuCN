// app/static/assets/js/projects.js

document.addEventListener('DOMContentLoaded', () => {
    const app = window.TimeTrackingApp || {};
    const { CONFIG, Auth, Storage, Utils } = app;

    // =========================
    // 1. BẢO VỆ ROUTE PROJECTS
    // =========================
    if (!Utils || !Utils.requireAuth || !Utils.requireAuth()) {
        // requireAuth sẽ tự redirect nếu chưa đăng nhập
        return;
    }

    // =========================
    // 2. NÚT ĐĂNG XUẤT
    // =========================
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                if (Auth && typeof Auth.logout === 'function') {
                    Auth.logout();
                } else {
                    // fallback nếu Auth chưa định nghĩa đầy đủ
                    localStorage.removeItem(CONFIG?.STORAGE_KEYS?.TOKEN || 'access_token');
                    localStorage.removeItem(CONFIG?.STORAGE_KEYS?.USER_DATA || 'tt_user_data');
                    window.location.href = 'login.html';
                }
            }
        });
    }

    // =========================
    // 3. LẤY CÁC PHẦN TỬ DOM
    // =========================
    const form = document.getElementById('createProjectForm');
    const projectNameInput = document.getElementById('projectName');
    const projectDescriptionInput = document.getElementById('projectDescription');
    const projectListEl = document.getElementById('projectList'); // nơi render danh sách

    if (!Storage) {
        console.error('Thiếu Storage trong TimeTrackingApp. Không thể dùng trang Projects.');
        if (projectListEl) {
            projectListEl.innerHTML = '<p>Không thể tải dữ liệu (Storage chưa được khởi tạo).</p>';
        }
        return;
    }

    // =========================
    // 4. XỬ LÝ FORM TẠO PROJECT
    // =========================
    if (!form) {
        console.warn('Không tìm thấy form với id="createProjectForm"');
    } else {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = projectNameInput ? projectNameInput.value.trim() : '';
            const description = projectDescriptionInput ? projectDescriptionInput.value.trim() : '';

            if (!name) {
                Utils && Utils.showAlert
                    ? Utils.showAlert('Vui lòng nhập tên project', 'error')
                    : alert('Vui lòng nhập tên project');
                return;
            }

            const newProject = { name, description };

            // Lưu localStorage qua Storage
            const created = Storage.addProject(newProject);

            if (Utils && Utils.showAlert) {
                Utils.showAlert('Project đã được tạo thành công!', 'success');
            } else {
                alert('Project đã được tạo thành công!');
            }

            form.reset();
            renderProjectList();
            renderProjectOptions(); // Cập nhật lại project cho dropdown trong task

            console.log('Project created:', created);
        });
    }

    // =========================
    // 5. HÀM RENDER DANH SÁCH PROJECTS
    // =========================
    function renderProjectList() {
        if (!projectListEl) {
            console.warn('Không tìm thấy phần tử chứa danh sách project (id="projectList")');
            return;
        }

        const projects = Storage.getProjects();
        const allTasks = Storage.getTasks ? Storage.getTasks() : [];

        if (!projects || projects.length === 0) {
            projectListEl.innerHTML = '<p>Chưa có project nào. Hãy tạo mới một project.</p>';
            return;
        }

        const html = projects
            .map((project) => {
                const createdAtText = project.createdAt
                    ? new Date(project.createdAt).toLocaleString()
                    : '';

                // Đếm số task thuộc project (nếu có Storage.getTasks)
                const taskCount = allTasks.filter((t) => t.projectId === project.id).length;

                return `
                    <div class="list-item" data-id="${project.id}">
                        <div>
                            <h4>${project.name}</h4>
                            <p>${project.description || ''}</p>
                            <p style="font-size: 12px; color: #7f8c8d;">
                                Tạo lúc: ${createdAtText}
                                ${taskCount ? ` | Tasks: ${taskCount}` : ''}
                            </p>
                        </div>
                        <div class="list-actions">
                            <button class="btn btn-danger" onclick="deleteProject('${project.id}')">
                                Xóa
                            </button>
                        </div>
                    </div>
                `;
            })
            .join('');

        projectListEl.innerHTML = html;
    }

    // =========================
    // 6. HÀM XOÁ PROJECT (GẮN RA WINDOW)
    // =========================
    function handleDeleteProject(projectId) {
        if (!projectId) return;

        const confirmDelete = confirm(
            'Bạn có chắc muốn xóa project này? (sẽ xóa luôn các task & time entries liên quan trong localStorage)'
        );
        if (!confirmDelete) return;

        Storage.deleteProject(projectId);

        if (Utils && Utils.showAlert) {
            Utils.showAlert('Project đã được xóa!', 'success');
        } else {
            alert('Project đã được xóa!');
        }

        renderProjectList();
    }

    // Gắn vào window để dùng trong onclick="deleteProject('...')"
    window.deleteProject = handleDeleteProject;

    // =========================
    // 7. KHỞI TẠO LẦN ĐẦU
    // =========================
    renderProjectList();

    console.log('Projects page initialized');
});