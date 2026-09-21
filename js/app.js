(function () {
  'use strict';

  const state = {
    tasks: [],
    filter: 'all',
    searchQuery: ''
  };

  const elements = {
    form: document.getElementById('task-form'),
    input: document.getElementById('task-input'),
    dateInput: document.getElementById('task-date'),
    priority: document.getElementById('task-priority'),
    searchInput: document.getElementById('search-input'),
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

  async function addTask(title, dueDate, priorityVal) {
    const task = {
      id: Date.now().toString(),
      title: title.trim(),
      dueDate: dueDate || '',
      priority: priorityVal || 'medium',
      completed: false,
      createdAt: new Date().toISOString()
    };
    try {
      await taskDB.add(task);
      state.tasks.unshift(task);
      renderTasks();
      updateStats();
      showToast('>> Registo inserido com sucesso.');
    } catch (error) {
      console.error('[App] Erro ao adicionar:', error);
      showToast('Erro ao inserir registo', 'error');
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
      showToast(task.completed ? '>> Tarefa concluída.' : '>> Tarefa reativada.');
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
      showToast('>> Registo eliminado.');
    } catch (error) {
      console.error('[App] Erro ao deletar:', error);
    }
  }

  // Relatório PDF com Estilo Executivo (Preto e Dourado)
  async function exportTasksData() {
    try {
      const allTasks = await taskDB.getAll();
      const activeTasks = allTasks.filter(t => !t.completed);
      const completedTasks = allTasks.filter(t => t.completed);
      const currentDate = new Date().toLocaleDateString('pt-BR');

      let printContainer = document.getElementById('print-area');
      if (!printContainer) {
        printContainer = document.createElement('div');
        printContainer.id = 'print-area';
        document.body.appendChild(printContainer);
      }

      printContainer.innerHTML = `
        <div style="font-family: 'Courier New', Courier, monospace; padding: 30px; color: #000; background: #fff;">
          <h1 style="text-align: center; margin-bottom: 5px; font-size: 1.5rem; letter-spacing: 2px;">TASKFLOW // RELATÓRIO EXECUTIVO</h1>
          <div style="text-align: center; color: #555; font-size: 0.8rem; margin-bottom: 25px;">DATA DE EMISSÃO: ${currentDate}</div>

          <div style="display: flex; justify-content: space-around; background: #f4f4f4; padding: 12px; border: 1px solid #000; margin-bottom: 20px; text-align: center; font-size: 0.85rem;">
            <div>TOTAL: <br><strong>${allTasks.length}</strong></div>
            <div>PENDENTES: <br><strong>${activeTasks.length}</strong></div>
            <div>CONCLUÍDAS: <br><strong>${completedTasks.length}</strong></div>
          </div>

          <h2 style="border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 20px; font-size: 1rem;">[ TAREFAS PENDENTES ]</h2>
          <ul style="list-style: none; padding: 0; font-size: 0.85rem;">
            ${activeTasks.length > 0 ? activeTasks.map(t => `
              <li style="padding: 6px 0; border-bottom: 1px dashed #ccc; display: flex; justify-content: space-between;">
                <span>[ ] ${escapeHtml(t.title)}${t.dueDate ? '(' + t.dueDate + ')' : ''}</span>
                <strong>${t.priority.toUpperCase()}</strong>
              </li>
            `).join('') : '<p style="font-style: italic; color: #666;">Nenhum registo pendente.</p>'}
          </ul>

          <h2 style="border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 20px; font-size: 1rem;">[ TAREFAS CONCLUÍDAS ]</h2>
          <ul style="list-style: none; padding: 0; font-size: 0.85rem;">
            ${completedTasks.length > 0 ? completedTasks.map(t => `
              <li style="padding: 6px 0; border-bottom: 1px dashed #ccc; display: flex; justify-content: space-between; text-decoration: line-through; color: #555;">
                <span>[X] ${escapeHtml(t.title)}</span>
                <strong>${t.priority.toUpperCase()}</strong>
              </li>
            `).join('') : '<p style="font-style: italic; color: #666;">Nenhum registo concluído.</p>'}
          </ul>
        </div>
      `;

      let styleTag = document.getElementById('print-temp-style');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'print-temp-style';
        styleTag.innerHTML = `
          @media print {
            body * { visibility: hidden !important; }
            #print-area, #print-area * { visibility: visible !important; }
            #print-area { position: absolute; left: 0; top: 0; width: 100%; display: block !important; background: white; }
          }
        `;
        document.head.appendChild(styleTag);
      }

      showToast('>> A compilar relatório PDF...');
      setTimeout(() => {
        window.print();
      }, 300);

    } catch (error) {
      console.error('[App] Erro ao gerar PDF:', error);
      showToast('Erro ao exportar PDF', 'error');
    }
  }

  function getFilteredTasks() {
    let tasks = state.tasks;

    // Filtro de estado
    if (state.filter === 'active') tasks = tasks.filter(t => !t.completed);
    if (state.filter === 'completed') tasks = tasks.filter(t => t.completed);

    // Filtro de pesquisa por texto
    if (state.searchQuery.trim() !== '') {
      const q = state.searchQuery.toLowerCase();
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q));
    }

    return tasks;
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
      <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; overflow: hidden;">
          <input type="checkbox" ${task.completed ? 'checked' : ''} class="task-checkbox" data-action="toggle" data-id="${task.id}" style="width: 16px; height: 16px; cursor: pointer;">
          <div style="overflow: hidden;">
            <div style="font-size: 0.85rem; word-break: break-all; text-decoration: ${task.completed ? 'line-through' : 'none'}; color: ${task.completed ? '#888' : '#fff'}">
              ${escapeHtml(task.title)}
            </div>
            <div style="font-size: 0.65rem; color: #d4af37; margin-top: 2px;">
              PRIORIDADE: ${task.priority.toUpperCase()} ${task.dueDate ? ' | PRAZO: ' + task.dueDate : ''}
            </div>
          </div>
        </div>
        <button class="btn-delete" data-action="delete" data-id="${task.id}" style="background: transparent; border: none; color: #e74c3c; cursor: pointer; font-weight: bold; font-family: 'Courier New'; font-size: 0.75rem; padding: 6px;">[X]</button>
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

  function setupEventListeners() {
    elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = elements.input.value;
      const dateVal = elements.dateInput.value;
      if (val.trim()) {
        addTask(val, dateVal, elements.priority.value);
        elements.input.value = '';
        elements.dateInput.value = '';
        elements.input.focus();
      }
    });

    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderTasks();
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

    if (elements.btnExport) {
      elements.btnExport.addEventListener('click', exportTasksData);
    }
  }

  registerSW();
  loadTasks();
  setupEventListeners();
})();
