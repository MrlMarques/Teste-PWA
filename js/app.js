(function () {
  'use strict';

  const state = {
    tasks: [],
    filter: 'all' // 'all', 'active', 'completed'
  };

  const elements = {
    form: document.getElementById('task-form'),
    input: document.getElementById('task-input'),
    priority: document.getElementById('task-priority'),
    list: document.getElementById('task-list'),
    emptyState: document.getElementById('empty-state'),
    filterButtons: document.querySelectorAll('.filter-btn'),
    statTotal: document.getElementById('stat-total'),
    statActive: document.getElementById('stat-active'),
    statCompleted: document.getElementById('stat-completed'),
    toast: document.getElementById('toast'),
    btnExport: document.getElementById('btn-export')
  };

  async function registerSW() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (e) {
        console.error('[App] Erro ao registar SW:', e);
      }
    }
  }

  async function loadTasks() {
    try {
      state.tasks = await taskDB.getAll();
      renderTasks();
      updateStats();
    } catch (error) {
      console.error('[App] Erro ao carregar tarefas:', error);
    }
  }

  async function addTask(title, priorityVal) {
    const task = {
      id: Date.now().toString(),
      title: title.trim(),
      priority: priorityVal || 'medium',
      completed: false,
      createdAt: new Date().toISOString()
    };
    try {
      await taskDB.add(task);
      state.tasks.unshift(task);
      renderTasks();
      updateStats();
      showToast('Tarefa adicionada com sucesso!');
    } catch (error) {
      console.error('[App] Erro ao adicionar:', error);
      showToast('Erro ao adicionar tarefa', 'error');
    }
  }

  async function toggleTask(id) {
    try {
      const task = state.tasks.find(t => t.id == id);
      if (!task) return;
      task.completed = !task.completed;
      await taskDB.update(task);
      renderTasks();
      updateStats();
      showToast(task.completed ? 'Tarefa concluída!' : 'Tarefa reativada!');
    } catch (error) {
      console.error('[App] Erro ao atualizar:', error);
    }
  }

  async function deleteTask(id) {
    try {
      await taskDB.delete(id);
      state.tasks = state.tasks.filter(t => t.id !== id);
      renderTasks();
      updateStats();
      showToast('Tarefa removida!');
    } catch (error) {
      console.error('[App] Erro ao deletar:', error);
    }
  }

  // ======= NOVA FUNÇÃO DE EXPORTAÇÃO =======
  async function exportTasksData() {
    try {
      const allTasks = await taskDB.getAll();
      
      const activeTasks = allTasks.filter(t => !t.completed);
      const completedTasks = allTasks.filter(t => t.completed);

      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        totalTarefas: allTasks.length,
        pendentes: activeTasks,
        concluidas: completedTasks
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`);
      
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Tarefas exportadas com sucesso!');
    } catch (error) {
      console.error('[App] Erro ao exportar:', error);
      showToast('Erro ao exportar dados', 'error');
    }
  }

  function getFilteredTasks() {
    switch (state.filter) {
      case 'active': return state.tasks.filter(t => !t.completed);
      case 'completed': return state.tasks.filter(t => t.completed);
      default: return state.tasks;
    }
  }

  function renderTasks() {
    const filtered = getFilteredTasks();

    if (filtered.length === 0) {
      elements.list.innerHTML = '';
      elements.emptyState.classList.remove('hidden');
      return;
    }

    elements.emptyState.classList.add('hidden');

    elements.list.innerHTML = filtered.map(task => `
      <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 14px; background: #1e293b; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid ${task.completed ? '#22c55e' : '#6366f1'}">
        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
          <input type="checkbox" ${task.completed ? 'checked' : ''} class="task-checkbox" data-action="toggle" data-id="${task.id}" style="width: 18px; height: 18px; cursor: pointer;">
          <div>
            <div style="font-size: 0.95rem; font-weight: 500; text-decoration: ${task.completed ? 'line-through' : 'none'}; color: ${task.completed ? '#94a3b8' : '#f1f5f9'}">
              ${escapeHtml(task.title)}
            </div>
            <span style="font-size: 0.7rem; color: #94a3b8; text-transform: uppercase;">Prioridade: ${task.priority}</span>
          </div>
        </div>
        <button class="btn-delete" data-action="delete" data-id="${task.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-weight: bold; padding: 6px;">Excluir</button>
      </div>
    `).join('');
  }

  function updateStats() {
    const total = state.tasks.length;
    const active = state.tasks.filter(t => !t.completed).length;
    const completed = state.tasks.filter(t => t.completed).length;

    if (elements.statTotal) elements.statTotal.textContent = total;
    if (elements.statActive) elements.statActive.textContent = active;
    if (elements.statCompleted) elements.statCompleted.textContent = completed;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.className = 'toast show';
    setTimeout(() => {
      elements.toast.className = 'toast';
    }, 3000);
  }

  // Event Listeners
  function setupEventListeners() {
    elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = elements.input.value;
      if (val.trim()) {
        addTask(val, elements.priority.value);
        elements.input.value = '';
        elements.input.focus();
      }
    });

    elements.list.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      const checkbox = e.target.closest('input[type="checkbox"]');

      if (btn && btn.dataset.action === 'delete') {
        deleteTask(btn.dataset.id);
      } else if (checkbox && checkbox.dataset.action === 'toggle') {
        toggleTask(checkbox.dataset.id);
      }
    });

    elements.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filter = btn.dataset.filter;
        renderTasks();
      });
    });

    // Event listener para o botão de exportação
    if (elements.btnExport) {
      elements.btnExport.addEventListener('click', exportTasksData);
    }
  }

  // Inicialização
  registerSW();
  loadTasks();
  setupEventListeners();
})();
