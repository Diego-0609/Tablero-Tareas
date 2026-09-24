/* ==========================================================
   Tablero de Tareas — Lógica integrada (Integrante 4)
   ----------------------------------------------------------
   Este archivo une el HTML (Integrante 1), el CSS (Integrante 2)
   y la lógica base (Integrante 3), corrigiendo los puntos donde
   no coincidían, y agrega el modo oscuro (tarea de Integrante 4).

   Reemplaza al "app.js" original: el HTML ya carga este archivo
   como <script src="script.js">, así que debe guardarse con
   exactamente ese nombre, en la misma carpeta que index.html.
   ========================================================== */

(() => {
  'use strict';

  /* ---------- SELECTORES (contrato real con el HTML de Integrante 1) ---------- */
  const SEL = {
    form: 'task-form',
    inputEditingId: 'task-editing-id', // hidden input agregado para poder editar
    inputTitle: 'task-title',
    selectCategory: 'task-category',   // estado inicial: todo | in-progress | done
    selectPriority: 'task-priority',   // low | medium | high
    submitBtn: 'btn-add-task',

    search: 'search-input',
    filterButtons: '.btn-filter',      // botones con data-filter, no un <select>

    lists: { todo: 'list-todo', 'in-progress': 'list-in-progress', done: 'list-done' },
    counts: { todo: 'count-todo', 'in-progress': 'count-in-progress', done: 'count-done' },

    totalCount: 'total-tasks-count',
    pendingCount: 'pending-tasks-count',
    completedCount: 'completed-tasks-count',
    progressBar: 'progress-bar',
    progressText: 'progress-text',

    themeToggle: 'theme-toggle',
  };

  const STORAGE_KEY = 'tablero-tareas-v1';
  const THEME_KEY = 'tablero-tema';

  // OJO: estos valores deben ser IDÉNTICOS a los que usa el HTML
  // (categorías del <select> y clases CSS de prioridad).
  const STATUSES = ['todo', 'in-progress', 'done'];
  const STATUS_LABEL = { todo: 'Por hacer', 'in-progress': 'En proceso', done: 'Terminado' };
  const PRIORITY_LABEL = { low: 'Baja', medium: 'Media', high: 'Alta' };

  /* ---------- ESTADO EN MEMORIA ---------- */
  let tasks = load();
  const state = { search: '', statusFilter: 'all' };

  /* ---------- HELPERS DOM ---------- */
  const $ = (id) => document.getElementById(id);

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else node.setAttribute(k, v);
    });
    children.forEach((c) => node.append(c));
    return node;
  }

  /* ---------- PERSISTENCIA (localStorage) ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('No se pudo leer localStorage:', err);
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error('No se pudo guardar en localStorage:', err);
    }
  }

  /* ---------- CRUD ---------- */
  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function addTask({ title, priority, status }) {
    const clean = title.trim();
    if (!clean) return null;
    const task = {
      id: newId(),
      title: clean,
      priority: PRIORITY_LABEL[priority] ? priority : 'medium',
      status: STATUSES.includes(status) ? status : 'todo',
      createdAt: Date.now(),
    };
    tasks.push(task);
    commit();
    return task;
  }

  function updateTask(id, changes) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (changes.title !== undefined) {
      const clean = changes.title.trim();
      if (!clean) return;
      changes.title = clean;
    }
    Object.assign(task, changes);
    commit();
  }

  function deleteTask(id, card) {
    const remove = () => {
      tasks = tasks.filter((t) => t.id !== id);
      commit();
    };
    // Espera a que termine la animación de salida (ver .removing en styles.css)
    if (card) {
      card.classList.add('removing');
      let done = false;
      const finish = () => { if (!done) { done = true; remove(); } };
      card.addEventListener('animationend', finish, { once: true });
      setTimeout(finish, 400); // respaldo por si el navegador no dispara el evento
    } else {
      remove();
    }
  }

  function commit() {
    save();
    render();
  }

  /* ---------- FILTROS ---------- */
  function visibleTasks() {
    const q = state.search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (state.statusFilter !== 'all' && t.status !== state.statusFilter) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  /* ---------- RENDER DE TARJETAS ----------
     Estructura tomada del ejemplo que dejó Integrante 1 comentado
     en el HTML, para que calce exactamente con el CSS de Integrante 2. */
  function createCard(task) {
    const badge = el('span', {
      class: 'badge priority-tag',
      text: PRIORITY_LABEL[task.priority],
    });

    const content = el('div', { class: 'card-content' }, [
      el('h3', { text: task.title }),
      badge,
    ]);

    const actions = el('div', { class: 'card-actions' }, [
      el('button', {
        type: 'button', class: 'btn-action btn-check', text: '✓',
        title: 'Marcar completada', 'aria-label': 'Marcar completada',
        dataset: { action: 'complete' },
        ...(task.status === 'done' ? { disabled: '' } : {}),
      }),
      el('button', {
        type: 'button', class: 'btn-action btn-edit', text: '✏️',
        title: 'Editar', 'aria-label': 'Editar tarea',
        dataset: { action: 'edit' },
      }),
      el('button', {
        type: 'button', class: 'btn-action btn-delete', text: '🗑️',
        title: 'Eliminar', 'aria-label': 'Eliminar tarea',
        dataset: { action: 'delete' },
      }),
    ]);

    return el(
      'li',
      {
        class: `task-card priority-${task.priority}`,
        draggable: 'true',
        dataset: { id: task.id },
      },
      [content, actions]
    );
  }

  function render() {
    const shown = visibleTasks();

    STATUSES.forEach((status) => {
      const list = $(SEL.lists[status]);
      if (!list) return;
      list.replaceChildren();

      const inColumn = shown.filter((t) => t.status === status);
      inColumn.forEach((t) => list.append(createCard(t)));

      if (inColumn.length === 0) {
        list.append(el('p', { class: 'empty-msg', text: 'Sin tareas' }));
      }

      const counter = $(SEL.counts[status]);
      if (counter) counter.textContent = inColumn.length;
    });

    renderStats();
  }

  function renderStats() {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'done').length;
    const pending = total - completed;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    const set = (id, value) => { const n = $(id); if (n) n.textContent = value; };
    set(SEL.totalCount, total);
    set(SEL.pendingCount, pending);
    set(SEL.completedCount, completed);
    set(SEL.progressText, `${percent}% completado`);

    const bar = $(SEL.progressBar);
    if (bar) { bar.max = 100; bar.value = percent; }
  }

  /* ---------- FORMULARIO (crear / editar) ---------- */
  function startEdit(task) {
    $(SEL.inputEditingId).value = task.id;
    $(SEL.inputTitle).value = task.title;
    $(SEL.selectCategory).value = task.status;
    $(SEL.selectPriority).value = task.priority;
    const submit = $(SEL.submitBtn);
    if (submit) submit.textContent = '💾 Guardar Cambios';
    $(SEL.inputTitle).focus();
    if (typeof $(SEL.form).scrollIntoView === 'function') {
      $(SEL.form).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function resetForm() {
    const form = $(SEL.form);
    form.reset();
    $(SEL.inputEditingId).value = '';
    const submit = $(SEL.submitBtn);
    if (submit) submit.textContent = '+ Agregar Tarea';
  }

  function onSubmit(e) {
    e.preventDefault();
    const data = {
      title: $(SEL.inputTitle).value,
      status: $(SEL.selectCategory).value,
      priority: $(SEL.selectPriority).value,
    };
    if (!data.title.trim()) {
      $(SEL.inputTitle).focus();
      return;
    }
    const editingId = $(SEL.inputEditingId).value;
    if (editingId) updateTask(editingId, data);
    else addTask(data);
    resetForm();
  }

  /* ---------- EVENTOS DEL TABLERO (click en ✓ / ✏️ / 🗑️) ---------- */
  function onBoardClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const card = btn.closest('.task-card');
    if (!card) return;
    const id = card.dataset.id;

    switch (btn.dataset.action) {
      case 'complete':
        updateTask(id, { status: 'done' });
        break;
      case 'edit': {
        const task = tasks.find((t) => t.id === id);
        if (task) startEdit(task);
        break;
      }
      case 'delete':
        deleteTask(id, card);
        break;
    }
  }

  /* ---------- DRAG & DROP ENTRE COLUMNAS ---------- */
  function onDragStart(e) {
    const card = e.target.closest('.task-card');
    if (!card) return;
    e.dataTransfer.setData('text/plain', card.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('dragging');
  }

  function onDragEnd(e) {
    const card = e.target.closest('.task-card');
    if (card) card.classList.remove('dragging');
  }

  function setupDragAndDrop() {
    STATUSES.forEach((status) => {
      const list = $(SEL.lists[status]);
      if (!list) return;

      list.addEventListener('dragover', (e) => {
        e.preventDefault();
        list.classList.add('drag-over');
      });
      list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
      list.addEventListener('drop', (e) => {
        e.preventDefault();
        list.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');
        if (id) updateTask(id, { status });
      });
    });
  }

  /* ---------- FILTROS DE ESTADO (botones, no <select>) ---------- */
  function setupFilterButtons() {
    const buttons = document.querySelectorAll(SEL.filterButtons);
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.statusFilter = btn.dataset.filter;
        render();
      });
    });
  }

  /* ---------- MODO OSCURO (tarea de Integrante 4) ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = $(SEL.themeToggle);
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (err) { /* no-op */ }
  }

  function setupTheme() {
    let saved = 'light';
    try { saved = localStorage.getItem(THEME_KEY) || 'light'; } catch (err) { /* no-op */ }
    applyTheme(saved);
    const btn = $(SEL.themeToggle);
    if (btn) btn.addEventListener('click', toggleTheme);
  }

  /* ---------- INICIO ---------- */
  function init() {
    const form = $(SEL.form);
    if (!form) {
      console.error(`No se encontró el formulario #${SEL.form}. Revisa los IDs del HTML.`);
      return;
    }

    form.addEventListener('submit', onSubmit);

    const search = $(SEL.search);
    if (search) search.addEventListener('input', (e) => { state.search = e.target.value; render(); });

    setupFilterButtons();
    setupTheme();

    STATUSES.forEach((status) => {
      const list = $(SEL.lists[status]);
      if (!list) return;
      list.addEventListener('click', onBoardClick);
      list.addEventListener('dragstart', onDragStart);
      list.addEventListener('dragend', onDragEnd);
    });
    setupDragAndDrop();

    resetForm();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---------- API PÚBLICA (útil para pruebas de QA desde la consola) ---------- */
  window.TaskApp = {
    getTasks: () => tasks.map((t) => ({ ...t })),
    addTask,
    updateTask,
    deleteTask: (id) => deleteTask(id),
    render,
    STATUS_LABEL,
    PRIORITY_LABEL,
  };
})();
