document.addEventListener('DOMContentLoaded', async () => {
    
    let isDeleting = false;
    let editTimeout = null;

    // ============ ENVIRONMENT CHECK ============
    if (typeof api === 'undefined') {
        console.error("❌ Lỗi: Chưa load api.js");
        alert("Hệ thống chưa tải được thư viện kết nối.");
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

    // ============ DOM ELEMENTS ============
    const dom = {
        createProjectForm: document.getElementById('createProjectForm'),
        projectNameInput: document.getElementById('projectName'),
        projectDescInput: document.getElementById('projectDescription'),
        projectListContainer: document.getElementById('projectList'),
        
        taskForm: document.getElementById('taskForm'),
        taskProjectSelect: document.getElementById('taskProjectSelect'),
        taskNameInput: document.getElementById('taskName'),
        taskDescInput: document.getElementById('taskDescription'),
        taskListContainer: document.getElementById('taskList')
    };

    const requiredElements = Object.keys(dom);
    const missingElements = requiredElements.filter(key => !dom[key]);
    
    if (missingElements.length > 0) {
        console.error("❌ Thiếu các element:", missingElements);
        alert(`Lỗi giao diện: Không tìm thấy ${missingElements.join(', ')}`);
        return;
    }

    // ============ EVENTBUS INTEGRATION ============
    
    function setupEventBusListeners() {
        if (typeof eventBus === 'undefined') return;

        console.log('📡 Setting up EventBus listeners for Projects...');

        // Listen to project events from other tabs
        eventBus.on(Events.PROJECT_CREATED, async (data) => {
            console.log('🔔 Project created in another tab:', data);
            await initPageData();
        });

        eventBus.on(Events.PROJECT_UPDATED, async (data) => {
            console.log('🔔 Project updated in another tab:', data);
            await initPageData();
        });

        eventBus.on(Events.PROJECT_DELETED, async (data) => {
            console.log('🔔 Project deleted in another tab:', data);
            await initPageData();
        });

        // Listen to task events
        eventBus.on(Events.TASK_CREATED, async (data) => {
            console.log('🔔 Task created in another tab:', data);
            // Reload tasks if viewing the same project
            const currentProjectId = dom.taskProjectSelect.value;
            if (data.project_id && currentProjectId == data.project_id) {
                await loadTasksByProjectId(currentProjectId);
            }
        });

        eventBus.on(Events.TASK_DELETED, async (data) => {
            console.log('🔔 Task deleted in another tab:', data);
            const currentProjectId = dom.taskProjectSelect.value;
            if (currentProjectId) {
                await loadTasksByProjectId(currentProjectId);
            }
        });

        eventBus.on(Events.TASK_UPDATED, async (data) => {
            console.log('🔔 Task updated in another tab:', data);
            const currentProjectId = dom.taskProjectSelect.value;
            if (currentProjectId) {
                await loadTasksByProjectId(currentProjectId);
            }
        });

        console.log('✅ EventBus listeners registered');
    }

    // ============ INIT DATA ============
    await initPageData();
    setupEventBusListeners(); // ✅ NEW: Setup EventBus

    async function initPageData() {
        try {
            showLoading(dom.projectListContainer, "Đang tải dự án...");
            
            const projects = await api.getProjects();
            
            renderProjectsList(projects);
            updateProjectSelectDropdown(projects);

            if (projects.length > 0) {
                const firstProjectId = projects[0].id;
                dom.taskProjectSelect.value = firstProjectId;
                await loadTasksByProjectId(firstProjectId);
            } else {
                showEmptyState(dom.taskListContainer, "Bạn chưa có dự án nào.", "fa-folder-open");
            }

        } catch (error) {
            console.error("❌ Init Error:", error);
            showError(dom.projectListContainer, `Lỗi tải dữ liệu: ${error.message}`);
        }
    }

    async function loadTasksByProjectId(projectId) {
        if (!projectId) {
            showEmptyState(dom.taskListContainer, "Chọn một dự án để xem công việc", "fa-arrow-left");
            return;
        }

        showLoading(dom.taskListContainer, "Đang tải công việc...");

        try {
            const tasks = await api.request(`/tasks/project/${projectId}`);
            renderTasksList(tasks);
        } catch (error) {
            console.error("❌ Load Tasks Error:", error);
            showError(dom.taskListContainer, "Không tải được danh sách công việc.");
        }
    }

    // ============ RENDER FUNCTIONS ============

    function renderProjectsList(projects) {
        if (!dom.projectListContainer) return;

        if (projects.length === 0) {
            showEmptyState(dom.projectListContainer, "Danh sách trống. Hãy tạo dự án đầu tiên!", "fa-folder-plus");
            return;
        }

        dom.projectListContainer.innerHTML = projects.map(p => `
            <div class="list-item theme-project" id="project-row-${p.id}" data-project-id="${p.id}">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div style="flex-grow: 1; margin-right: 10px;">
                        <div id="display-mode-${p.id}" 
                             style="cursor:pointer;" 
                             onclick="enableInlineEdit(${p.id})" 
                             title="Click để sửa tên">
                            <h4 style="margin:0; color:#2980b9; font-weight:600;">
                                ${escapeHtml(p.name)} 
                                <i class="fa-solid fa-pencil" style="font-size:11px; color:#ddd; margin-left:5px;"></i>
                            </h4>
                            <p style="font-size:0.9rem; color:#666; margin-top:4px; margin-bottom:0;">
                                ${p.description ? escapeHtml(p.description) : '<em style="color:#bbb">Chưa có mô tả</em>'}
                            </p>
                        </div>

                        <div id="edit-mode-${p.id}" style="display:none;">
                            <input type="text" 
                                   id="input-name-${p.id}"
                                   class="form-control" 
                                   value="${escapeHtml(p.name)}" 
                                   style="margin-bottom:5px; font-weight:bold; height: 30px;"
                                   onkeydown="handleInlineEditKey(event, ${p.id})">
                            
                            <input type="text" 
                                   id="input-desc-${p.id}"
                                   class="form-control" 
                                   value="${p.description ? escapeHtml(p.description) : ''}" 
                                   placeholder="Mô tả..."
                                   style="height: 28px; font-size: 0.9rem;"
                                   onkeydown="handleInlineEditKey(event, ${p.id})">
                            
                            <div style="font-size:0.75rem; color:#888; margin-top:3px;">
                                Nhấn <b>Enter</b> để lưu, <b>Esc</b> để hủy.
                            </div>
                        </div>
                    </div>

                    <div class="item-actions" style="min-width: 80px; text-align: right;">
                        <button class="btn btn-sm btn-info" 
                                onclick="selectProjectToView(${p.id})" 
                                title="Xem công việc">
                            <i class="fa-solid fa-list"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" 
                                onclick="deleteProjectFunc(${p.id})" 
                                title="Xóa dự án"
                                id="delete-btn-${p.id}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function renderTasksList(tasks) {
        if (!dom.taskListContainer) return;

        if (tasks.length === 0) {
            showEmptyState(dom.taskListContainer, "Chưa có công việc nào trong dự án này.", "fa-clipboard-check");
            return;
        }

        tasks.sort((a, b) => b.id - a.id);

        dom.taskListContainer.innerHTML = tasks.map(t => {
            const badgeInfo = getTaskBadgeInfo(t.status);
            
            return `
            <div class="list-item theme-task" id="task-row-${t.id}" data-task-id="${t.id}">
                <div style="display:flex; justify-content:space-between; align-items: start;">
                    <div style="flex-grow:1;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                            <strong style="font-size:1rem;">${escapeHtml(t.title)}</strong> 
                            <span class="badge ${badgeInfo.class}">${badgeInfo.text}</span>
                        </div>
                        <div style="font-size: 0.9rem; color: #666;">
                            ${t.description ? escapeHtml(t.description) : '<em style="color:#bbb">Không có mô tả</em>'}
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="deleteTaskFunc(${t.id})" 
                                title="Xóa công việc"
                                id="delete-task-btn-${t.id}">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            </div>
        `}).join('');
    }

    function updateProjectSelectDropdown(projects) {
        if (!dom.taskProjectSelect) return;
        
        const currentSelectedId = dom.taskProjectSelect.value;
        
        let html = '<option value="">-- Chọn Dự Án --</option>';
        html += projects.map(p => 
            `<option value="${p.id}">${escapeHtml(p.name)}</option>`
        ).join('');
        
        dom.taskProjectSelect.innerHTML = html;
        
        if (currentSelectedId && projects.find(p => p.id == currentSelectedId)) {
            dom.taskProjectSelect.value = currentSelectedId;
        }
    }

    // ============ EVENT LISTENERS ============

    // CREATE PROJECT with EventBus broadcast
    if (dom.createProjectForm) {
        dom.createProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            
            const name = dom.projectNameInput.value.trim();
            const desc = dom.projectDescInput.value.trim();

            if (!name) {
                showToast("Vui lòng nhập tên dự án!", "error");
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo...';
                
                const newProject = await api.createProject(name, desc);
                
                // ✅ Broadcast event to other tabs
                if (typeof eventBus !== 'undefined') {
                    eventBus.emit(Events.PROJECT_CREATED, { 
                        projectId: newProject.id,
                        name: newProject.name 
                    });
                }
                
                dom.createProjectForm.reset();
                await initPageData();
                
                showToast("Tạo dự án thành công!", "success");
                
            } catch (err) {
                console.error("❌ Create Project Error:", err);
                showToast(`Lỗi: ${err.message}`, "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    // CREATE TASK with EventBus broadcast
    if (dom.taskForm) {
        dom.taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            
            const selectedProjectId = dom.taskProjectSelect.value;
            const title = dom.taskNameInput.value.trim();
            const desc = dom.taskDescInput.value.trim();

            if (!selectedProjectId) {
                showToast("Vui lòng chọn một Dự án trước!", "error");
                return;
            }
            if (!title) {
                showToast("Tên công việc không được để trống!", "error");
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo...';
                
                const newTask = await api.request('/tasks/', {
                    method: 'POST',
                    body: JSON.stringify({
                        title: title,
                        description: desc,
                        status: 'todo',
                        project_id: parseInt(selectedProjectId)
                    })
                });
                
                // ✅ Broadcast event to other tabs
                if (typeof eventBus !== 'undefined') {
                    eventBus.emit(Events.TASK_CREATED, { 
                        taskId: newTask.id,
                        title: newTask.title,
                        project_id: selectedProjectId
                    });
                }
                
                dom.taskNameInput.value = '';
                dom.taskDescInput.value = '';
                
                await loadTasksByProjectId(selectedProjectId);
                
                setTimeout(() => {
                    const newTaskRow = document.getElementById(`task-row-${newTask.id}`);
                    if (newTaskRow) {
                        newTaskRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        newTaskRow.style.backgroundColor = '#e8f5e9';
                        setTimeout(() => {
                            newTaskRow.style.backgroundColor = '';
                        }, 2000);
                    }
                }, 100);
                
                showToast("Tạo task thành công!", "success");

            } catch (err) {
                console.error("❌ Create Task Error:", err);
                showToast(`Lỗi: ${err.message}`, "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    if (dom.taskProjectSelect) {
        dom.taskProjectSelect.addEventListener('change', async (e) => {
            const newId = e.target.value;
            if (newId) {
                await loadTasksByProjectId(newId);
            } else {
                showEmptyState(dom.taskListContainer, "Chọn một dự án để xem công việc", "fa-folder");
            }
        });
    }

    // ============ GLOBAL FUNCTIONS ============

    window.enableInlineEdit = (id) => {
        document.getElementById(`display-mode-${id}`).style.display = 'none';
        document.getElementById(`edit-mode-${id}`).style.display = 'block';
        document.getElementById(`input-name-${id}`).focus();
    };

    window.handleInlineEditKey = async (event, id) => {
        if (event.key === 'Escape') {
            document.getElementById(`display-mode-${id}`).style.display = 'block';
            document.getElementById(`edit-mode-${id}`).style.display = 'none';
            return;
        }
        
        if (event.key === 'Enter') {
            clearTimeout(editTimeout);
            editTimeout = setTimeout(async () => {
                await saveInlineEdit(id);
            }, 300);
        }
    };

    async function saveInlineEdit(id) {
        const newName = document.getElementById(`input-name-${id}`).value.trim();
        const newDesc = document.getElementById(`input-desc-${id}`).value.trim();
        
        if (!newName) {
            showToast("Tên dự án không được để trống!", "error");
            return;
        }

        try {
            await api.request(`/projects/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: newName, description: newDesc })
            });

            // ✅ Broadcast update event
            if (typeof eventBus !== 'undefined') {
                eventBus.emit(Events.PROJECT_UPDATED, { 
                    projectId: id,
                    name: newName 
                });
            }

            const displayDiv = document.getElementById(`display-mode-${id}`);
            const h4 = displayDiv.querySelector('h4');
            const p = displayDiv.querySelector('p');

            h4.innerHTML = `${escapeHtml(newName)} <i class="fa-solid fa-pencil" style="font-size:11px; color:#ddd; margin-left:5px;"></i>`;
            p.innerHTML = newDesc ? escapeHtml(newDesc) : '<em style="color:#bbb">Chưa có mô tả</em>';

            document.getElementById(`display-mode-${id}`).style.display = 'block';
            document.getElementById(`edit-mode-${id}`).style.display = 'none';
            
            const option = dom.taskProjectSelect.querySelector(`option[value="${id}"]`);
            if (option) option.text = newName;

            showToast("Cập nhật thành công!", "success");

        } catch (err) {
            console.error("❌ Update Project Error:", err);
            showToast(`Lỗi: ${err.message}`, "error");
        }
    }

    window.deleteProjectFunc = async (id) => {
        if (isDeleting) {
            showToast("Đang xử lý, vui lòng đợi...", "warning");
            return;
        }

        if (!confirm("Cảnh báo: Xóa dự án sẽ xóa toàn bộ Task bên trong.\nBạn có chắc chắn không?")) {
            return;
        }
        
        isDeleting = true;
        const deleteBtn = document.getElementById(`delete-btn-${id}`);
        const originalHTML = deleteBtn?.innerHTML;
        
        try {
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            }

            await api.deleteProject(id);
            
            // ✅ Broadcast delete event
            if (typeof eventBus !== 'undefined') {
                eventBus.emit(Events.PROJECT_DELETED, { projectId: id });
            }
            
            const row = document.getElementById(`project-row-${id}`);
            if (row) row.remove();
            
            if (dom.taskProjectSelect.value == id) {
                dom.taskProjectSelect.value = "";
                showEmptyState(dom.taskListContainer, "Dự án đã bị xóa.", "fa-trash");
            }

            const option = dom.taskProjectSelect.querySelector(`option[value="${id}"]`);
            if (option) option.remove();

            showToast("Xóa dự án thành công!", "success");

        } catch (err) {
            console.error("❌ Delete Project Error:", err);
            
            if (err.message && err.message.includes("404")) {
                await initPageData();
            } else {
                showToast(`Lỗi: ${err.message}`, "error");
                if (deleteBtn) {
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = originalHTML;
                }
            }
        } finally {
            isDeleting = false;
        }
    };

    window.deleteTaskFunc = async (id) => {
        if (!confirm("Bạn muốn xóa công việc này?")) return;
        
        const deleteBtn = document.getElementById(`delete-task-btn-${id}`);
        const originalHTML = deleteBtn?.innerHTML;
        
        try {
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            }

            await api.request(`/tasks/${id}`, { method: 'DELETE' });
            
            // ✅ Broadcast delete event
            if (typeof eventBus !== 'undefined') {
                eventBus.emit(Events.TASK_DELETED, { taskId: id });
            }
            
            const row = document.getElementById(`task-row-${id}`);
            if (row) row.remove();
            
            if (dom.taskListContainer.querySelectorAll('.list-item').length === 0) {
                showEmptyState(dom.taskListContainer, "Chưa có công việc nào.", "fa-clipboard-check");
            }

            showToast("Xóa task thành công!", "success");

        } catch (err) {
            console.error("❌ Delete Task Error:", err);
            showToast(`Lỗi: ${err.message}`, "error");
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = originalHTML;
            }
        }
    };

    window.selectProjectToView = async (id) => {
        if (dom.taskProjectSelect) {
            dom.taskProjectSelect.value = id;
            await loadTasksByProjectId(id);
            dom.taskListContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // ============ HELPER FUNCTIONS ============

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function getTaskBadgeInfo(status) {
        const badges = {
            'todo': { class: 'status-todo', text: 'Cần làm' },
            'in_progress': { class: 'status-in_progress', text: 'Đang làm' },
            'done': { class: 'status-done', text: 'Hoàn thành' }
        };
        return badges[status] || badges['todo'];
    }

    function showLoading(container, message = "Đang tải...") {
        if (!container) return;
        container.innerHTML = `
            <div style="text-align:center; padding:30px; color:#999;">
                <i class="fa-solid fa-spinner fa-spin fa-2x" style="margin-bottom:10px;"></i>
                <div>${message}</div>
            </div>`;
    }

    function showEmptyState(container, message, iconClass = "fa-inbox") {
        if (!container) return;
        container.innerHTML = `
            <div style="text-align:center; padding:30px; border:2px dashed #eee; border-radius:8px; color:#999;">
                <i class="fa-solid ${iconClass} fa-2x" style="margin-bottom:10px; display:block; color:#ddd;"></i>
                ${message}
            </div>`;
    }

    function showError(container, message) {
        if (!container) return;
        container.innerHTML = `
            <div style="text-align:center; padding:20px; color:#e74c3c;">
                <i class="fa-solid fa-exclamation-triangle"></i> ${message}
            </div>`;
    }

    function showToast(message, type = "info") {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

});

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
    .badge {
        display: inline-block;
        padding: 3px 8px;
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: 4px;
        text-transform: uppercase;
    }
    .status-todo { background: #f39c12; color: white; }
    .status-in_progress { background: #3498db; color: white; }
    .status-done { background: #27ae60; color: white; }
`;
document.head.appendChild(style);

console.log('✅ Projects.js with EventBus loaded');
console.log('📡 EventBus:', typeof eventBus !== 'undefined' ? 'Available ✓' : 'Not loaded');