class TimeTrackingApp {
    // Hàm chuyển đổi giữa các dự án
    async switchProject(projectId) {
        const kanbanBoard = document.getElementById("kanbanBoard");
        const emptyState = document.getElementById("emptyState");
        const boardTitle = document.getElementById("boardTitle");

        if (!projectId) {
            if (kanbanBoard) kanbanBoard.classList.add("hidden");
            if (emptyState) emptyState.classList.remove("hidden");
            return;
        }

        this.currentProjectId = Number(projectId);

        if (kanbanBoard) kanbanBoard.classList.remove("hidden");
        if (emptyState) emptyState.classList.add("hidden");

        if (boardTitle) {
            const projectName = document.getElementById("boardSelect").options[document.getElementById("boardSelect").selectedIndex]?.text || "Project";
            boardTitle.textContent = projectName;
        }

        await this.loadTasks(this.currentProjectId); // Tải các task của dự án
    }

    // Tải các công việc (task) của dự án
    async loadTasks(projectId) {
        try {
            const tasks = await api.getTasks(projectId);
            this.renderTasks(tasks);
        } catch (error) {
            console.error(error);
            alert("Không thể tải danh sách task: " + error.message);
        }
    }

    // Hiển thị danh sách task
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
                    <button class="btn-icon btn-play" onclick="app.handleStart(${task.id})" title="Bắt đầu bấm giờ">▶</button>
                    <button class="btn-icon btn-stop" onclick="app.handleStop(${task.id})" title="Dừng bấm giờ">⏹</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Hàm xử lý bắt đầu công việc
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

    // Hàm xử lý dừng công việc
    async handleStop(taskId) {
        try {
            await api.stopTimer();
            this.stopLocalTimer();
            this.runningTaskId = null;
            await this.loadTasks(this.currentProjectId);
        } catch (error) {
            console.error(error);
            alert("Lỗi dừng timer: " + error.message);
        }
    }

    // Chạy đồng hồ thời gian
    startLocalTimer() {
        this.stopLocalTimer();
        this.seconds = 0;
        this.timerInterval = setInterval(() => {
            this.seconds++;
            const timeString = this.formatTime(this.seconds);
            const timerDisplay = document.getElementById("timerDisplay");
            if (timerDisplay) timerDisplay.textContent = timeString;
        }, 1000);
    }

    // Dừng đồng hồ thời gian
    stopLocalTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        const timerDisplay = document.getElementById("timerDisplay");
        if (timerDisplay) timerDisplay.textContent = "00:00:00";
    }

    // Hàm định dạng thời gian
    formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return [hours, minutes, seconds].map(val => val.toString().padStart(2, '0')).join(":");
    }
}
