class KanbanTodoApp {
    constructor() {
        this.tasks = this.loadTasks();
        this.taskIdCounter = this.getNextId();
        this.currentFilters = {
            tags: [],
            priority: 'all',
            search: ''
        };
        this.isDarkMode = this.loadTheme();
        
        this.initializeElements();
        this.bindEvents();
        this.applyTheme();
        this.render();
    }

    initializeElements() {
        this.taskForm = document.getElementById('task-form');
        this.taskTitle = document.getElementById('task-title');
        this.taskDescription = document.getElementById('task-description');
        this.taskDueDate = document.getElementById('task-due-date');
        this.taskPriority = document.getElementById('task-priority');
        this.taskTags = document.getElementById('task-tags');
        
        this.todoList = document.getElementById('todo-list');
        this.inProgressList = document.getElementById('in_progress-list');
        this.doneList = document.getElementById('done-list');
        
        this.tagFilters = document.getElementById('tag-filters');
        this.priorityFilters = document.querySelectorAll('.priority-filters .filter-btn');
        this.searchInput = document.getElementById('search-input');
        
        this.themeToggle = document.getElementById('theme-toggle');
        this.statsToggle = document.getElementById('stats-toggle');
        this.statsPanel = document.getElementById('stats-panel');
        
        this.editModal = document.getElementById('edit-modal');
        this.editForm = document.getElementById('edit-form');
        this.modalClose = document.getElementById('modal-close');
        this.cancelEdit = document.getElementById('cancel-edit');
    }

    bindEvents() {
        this.taskForm.addEventListener('submit', (e) => this.handleAddTask(e));
        
        this.priorityFilters.forEach(btn => {
            btn.addEventListener('click', () => this.handlePriorityFilter(btn.dataset.priority));
        });
        
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.statsToggle.addEventListener('click', () => this.toggleStats());
        
        this.modalClose.addEventListener('click', () => this.closeEditModal());
        this.cancelEdit.addEventListener('click', () => this.closeEditModal());
        this.editForm.addEventListener('submit', (e) => this.handleEditTask(e));
        
        this.editModal.addEventListener('click', (e) => {
            if (e.target === this.editModal) this.closeEditModal();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeEditModal();
        });
        
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        [this.todoList, this.inProgressList, this.doneList].forEach(list => {
            list.addEventListener('dragover', (e) => this.handleDragOver(e));
            list.addEventListener('drop', (e) => this.handleDrop(e));
            list.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            list.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        });
    }

    handleAddTask(e) {
        e.preventDefault();
        
        const title = this.taskTitle.value.trim();
        if (!title) return;

        const newTask = {
            id: this.taskIdCounter++,
            title,
            description: this.taskDescription.value.trim(),
            status: 'todo',
            priority: this.taskPriority.value,
            dueDate: this.taskDueDate.value || null,
            tags: this.taskTags.value.split(',').map(tag => tag.trim()).filter(tag => tag),
            createdAt: new Date().toISOString()
        };

        this.tasks.push(newTask);
        this.saveTasks();
        this.render();
        this.taskForm.reset();
        this.taskTitle.focus();
    }

    handleEditTask(e) {
        e.preventDefault();
        
        const taskId = parseInt(document.getElementById('edit-task-id').value);
        const task = this.tasks.find(t => t.id === taskId);
        
        if (task) {
            task.title = document.getElementById('edit-task-title').value.trim();
            task.description = document.getElementById('edit-task-description').value.trim();
            task.dueDate = document.getElementById('edit-task-due-date').value || null;
            task.priority = document.getElementById('edit-task-priority').value;
            task.tags = document.getElementById('edit-task-tags').value
                .split(',').map(tag => tag.trim()).filter(tag => tag);
            
            this.saveTasks();
            this.render();
            this.closeEditModal();
        }
    }

    openEditModal(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        document.getElementById('edit-task-id').value = task.id;
        document.getElementById('edit-task-title').value = task.title;
        document.getElementById('edit-task-description').value = task.description || '';
        document.getElementById('edit-task-due-date').value = task.dueDate || '';
        document.getElementById('edit-task-priority').value = task.priority;
        document.getElementById('edit-task-tags').value = task.tags.join(', ');
        
        this.editModal.style.display = 'flex';
        document.getElementById('edit-task-title').focus();
    }

    closeEditModal() {
        this.editModal.style.display = 'none';
    }

    deleteTask(taskId) {
        if (confirm('このタスクを削除しますか？')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.render();
        }
    }

    moveTask(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const oldStatus = task.status;
            task.status = newStatus;
            
            if (newStatus === 'done' && oldStatus !== 'done') {
                this.showCompletionCelebration();
            }
            
            this.saveTasks();
            this.render();
        }
    }

    showCompletionCelebration() {
        const celebration = document.createElement('div');
        celebration.className = 'completion-celebration';
        celebration.textContent = '🎉';
        document.body.appendChild(celebration);
        
        setTimeout(() => {
            document.body.removeChild(celebration);
        }, 2000);
    }

    handleDragStart(e, taskId) {
        e.dataTransfer.setData('text/plain', taskId);
        e.target.classList.add('dragging');
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.task-list').forEach(list => {
            list.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
    }

    handleDragEnter(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        const taskId = parseInt(e.dataTransfer.getData('text/plain'));
        const newStatus = e.currentTarget.dataset.status;
        
        e.currentTarget.classList.remove('drag-over');
        this.moveTask(taskId, newStatus);
    }

    handlePriorityFilter(priority) {
        this.currentFilters.priority = priority;
        this.priorityFilters.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.priority === priority);
        });
        this.render();
    }

    handleTagFilter(tag) {
        const index = this.currentFilters.tags.indexOf(tag);
        if (index > -1) {
            this.currentFilters.tags.splice(index, 1);
        } else {
            this.currentFilters.tags.push(tag);
        }
        this.renderTagFilters();
        this.render();
    }

    handleSearch(query) {
        this.currentFilters.search = query.toLowerCase();
        this.render();
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.saveTheme();
        this.applyTheme();
    }

    applyTheme() {
        document.body.dataset.theme = this.isDarkMode ? 'dark' : 'light';
    }

    toggleStats() {
        const isVisible = this.statsPanel.style.display !== 'none';
        this.statsPanel.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            this.updateStats();
        }
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.status === 'done').length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('completed-tasks').textContent = completedTasks;
        document.getElementById('completion-rate').textContent = `${completionRate}%`;
    }

    filterTasks() {
        return this.tasks.filter(task => {
            const matchesPriority = this.currentFilters.priority === 'all' || 
                                  task.priority === this.currentFilters.priority;
            
            const matchesTags = this.currentFilters.tags.length === 0 ||
                              this.currentFilters.tags.some(tag => task.tags.includes(tag));
            
            const matchesSearch = !this.currentFilters.search ||
                                task.title.toLowerCase().includes(this.currentFilters.search) ||
                                (task.description && task.description.toLowerCase().includes(this.currentFilters.search));
            
            return matchesPriority && matchesTags && matchesSearch;
        });
    }

    getAllTags() {
        const tags = new Set();
        this.tasks.forEach(task => {
            task.tags.forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    }

    renderTagFilters() {
        const allTags = this.getAllTags();
        this.tagFilters.innerHTML = allTags.map(tag => `
            <button class="tag-filter ${this.currentFilters.tags.includes(tag) ? 'active' : ''}"
                    onclick="kanbanApp.handleTagFilter('${tag}')">
                ${this.escapeHtml(tag)}
            </button>
        `).join('');
    }

    formatDueDate(dueDate) {
        if (!dueDate) return '';
        
        const due = new Date(dueDate);
        const now = new Date();
        const diffTime = due - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let className = '';
        if (diffDays < 0) className = 'overdue';
        else if (diffDays <= 3) className = 'due-soon';
        
        const formatted = due.toLocaleDateString('ja-JP', { 
            month: 'short', 
            day: 'numeric' 
        });
        
        return `<span class="task-due-date ${className}">📅 ${formatted}</span>`;
    }

    render() {
        const filteredTasks = this.filterTasks();
        
        this.renderTaskList('todo', filteredTasks.filter(t => t.status === 'todo'));
        this.renderTaskList('in_progress', filteredTasks.filter(t => t.status === 'in_progress'));
        this.renderTaskList('done', filteredTasks.filter(t => t.status === 'done'));
        
        this.updateTaskCounts();
        this.renderTagFilters();
    }

    renderTaskList(status, tasks) {
        const list = document.getElementById(`${status}-list`);
        
        if (tasks.length === 0) {
            list.innerHTML = '<div class="empty-state">タスクがありません</div>';
            return;
        }

        list.innerHTML = tasks.map(task => `
            <div class="task-card" 
                 draggable="true"
                 ondragstart="kanbanApp.handleDragStart(event, ${task.id})"
                 onragend="kanbanApp.handleDragEnd(event)">
                <div class="task-actions">
                    <button class="task-action-btn" onclick="kanbanApp.openEditModal(${task.id})" title="編集">✏️</button>
                    <button class="task-action-btn" onclick="kanbanApp.deleteTask(${task.id})" title="削除">🗑️</button>
                </div>
                
                <div class="task-title">${this.escapeHtml(task.title)}</div>
                
                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                
                <div class="task-meta">
                    <span class="task-priority priority-${task.priority}">${this.getPriorityLabel(task.priority)}</span>
                    ${this.formatDueDate(task.dueDate)}
                </div>
                
                ${task.tags.length > 0 ? `
                    <div class="task-tags">
                        ${task.tags.map(tag => `<span class="task-tag">${this.escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    updateTaskCounts() {
        const filteredTasks = this.filterTasks();
        document.getElementById('todo-count').textContent = filteredTasks.filter(t => t.status === 'todo').length;
        document.getElementById('in_progress-count').textContent = filteredTasks.filter(t => t.status === 'in_progress').length;
        document.getElementById('done-count').textContent = filteredTasks.filter(t => t.status === 'done').length;
    }

    getPriorityLabel(priority) {
        const labels = { high: '高', medium: '中', low: '低' };
        return labels[priority] || priority;
    }

    loadTasks() {
        try {
            const saved = localStorage.getItem('kanbanTasks');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('タスクの読み込みに失敗しました:', error);
            return [];
        }
    }

    saveTasks() {
        try {
            localStorage.setItem('kanbanTasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('タスクの保存に失敗しました:', error);
        }
    }

    loadTheme() {
        return localStorage.getItem('kanbanTheme') === 'dark';
    }

    saveTheme() {
        localStorage.setItem('kanbanTheme', this.isDarkMode ? 'dark' : 'light');
    }

    getNextId() {
        return this.tasks.length > 0 ? Math.max(...this.tasks.map(t => t.id)) + 1 : 1;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const kanbanApp = new KanbanTodoApp();