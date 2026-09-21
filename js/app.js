(function () {
  'use strict';
  const state = { tasks: [], filter: 'all' };
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const priority = document.getElementById('task-priority');
  const list = document.getElementById('task-list');

  async function registerSW() {
    if ('serviceWorker' in navigator) {
      try { await navigator.serviceWorker.register('/sw.js'); } catch (e) { console.error(e); }
    }
  }

  async function loadTasks() {
    state.tasks = await taskDB.getAll();
    render();
  }

  function render() {
    list.innerHTML = state.tasks.map(t => `
      <div class="task-item">
        <span>${t.title} (${t.priority})</span>
        <button onclick="window.removeTask('${t.id}')">Excluir</button>
      </div>
    `).join('');
    document.getElementById('stat-total').textContent = state.tasks.length;
  }

  window.removeTask = async function(id) {
    await taskDB.delete(id);
    loadTasks();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!input.value.trim()) return;
    const newTask = { id: Date.now().toString(), title: input.value, priority: priority.value };
    await taskDB.add(newTask);
    input.value = '';
    loadTasks();
  });

  registerSW();
  loadTasks();
})();
