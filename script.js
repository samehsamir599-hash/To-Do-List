document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const smartInput = document.getElementById('smartInput');
    const smartAddBtn = document.getElementById('smartAddBtn');
    const smartLoading = document.getElementById('smartLoading');
    
    // Stats elements
    const statsSection = document.getElementById('statsSection');
    const totalCount = document.getElementById('totalCount');
    const completedCount = document.getElementById('completedCount');
    const activeCount = document.getElementById('activeCount');
    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');

    // Load tasks from local storage
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // Update tasks counter and progress bar
    function updateCounters() {
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;
        const active = total - completed;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        totalCount.textContent = total;
        completedCount.textContent = completed;
        activeCount.textContent = active;
        progressText.textContent = `${percentage}%`;
        progressBar.style.width = `${percentage}%`;

        if (total > 0) {
            statsSection.classList.add('visible');
        } else {
            statsSection.classList.remove('visible');
        }
    }

    // Render tasks
    function renderTasks() {
        updateCounters();
        taskList.innerHTML = '';
        
        if (tasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>لا توجد مهام حالياً. أضف مهمتك الأولى!</p>
                </div>
            `;
            return;
        }

        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            let metaHtml = '';
            if (task.date || task.time) {
                metaHtml = '<div class="task-meta">';
                if (task.date) metaHtml += `<span class="task-badge"><i class="far fa-calendar"></i> ${escapeHTML(task.date)}</span>`;
                if (task.time) metaHtml += `<span class="task-badge"><i class="far fa-clock"></i> ${escapeHTML(task.time)}</span>`;
                metaHtml += '</div>';
            }
            
            li.innerHTML = `
                <div class="task-content">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-index="${index}">
                    <div class="task-details">
                        <span class="task-text">${escapeHTML(task.text)}</span>
                        ${metaHtml}
                    </div>
                </div>
                <button class="delete-btn" data-index="${index}" aria-label="حذف المهمة">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            taskList.appendChild(li);
        });
    }

    // Add new task
    function addTask() {
        const text = taskInput.value.trim();
        if (text) {
            tasks.push({ text, completed: false });
            saveTasks();
            renderTasks();
            taskInput.value = '';
            taskInput.focus();
        }
    }

    // Save tasks to local storage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // Toggle task completion
    function toggleTask(index) {
        tasks[index].completed = !tasks[index].completed;
        saveTasks();
        renderTasks();
    }

    // Delete task
    function deleteTask(index) {
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
    }

    // Add Smart Tasks using Backend API
    async function addSmartTask() {
        const text = smartInput.value.trim();
        if (!text) return;

        smartAddBtn.style.display = 'none';
        smartLoading.style.display = 'flex';

        try {
            const response = await fetch('http://127.0.0.1:8001/api/extract-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                throw new Error('فشل الاتصال بالسيرفر');
            }

            const data = await response.json();
            
            if (data.tasks && data.tasks.length > 0) {
                data.tasks.forEach(t => {
                    tasks.push({
                        text: t.title,
                        date: t.date,
                        time: t.time,
                        completed: false
                    });
                });
                
                saveTasks();
                renderTasks();
                smartInput.value = '';
            }
        } catch (error) {
            alert('حدث خطأ أثناء معالجة الطلب: ' + error.message);
        } finally {
            smartAddBtn.style.display = 'flex';
            smartLoading.style.display = 'none';
        }
    }

    // Event listeners
    addTaskBtn.addEventListener('click', addTask);
    smartAddBtn.addEventListener('click', addSmartTask);

    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    taskList.addEventListener('click', (e) => {
        // Handle checkbox click
        if (e.target.classList.contains('task-checkbox')) {
            const index = e.target.getAttribute('data-index');
            toggleTask(index);
        }
        
        // Handle delete button click
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const index = deleteBtn.getAttribute('data-index');
            deleteTask(index);
        }
    });

    // Helper function to prevent XSS
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Initial render
    renderTasks();
});
