document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const taskList = document.getElementById('task-list');
  const taskForm = document.getElementById('todo-form');
  const taskInput = document.getElementById('task-input');
  const descInput = document.getElementById('desc-input');
  const dateInput = document.getElementById('date-input');
  const timeInput = document.getElementById('time-input');
  const addButton = document.getElementById('add');
  const viewButton = document.getElementById('view-btn');
  const listContainer = document.getElementById('list-container');
  const mainSection = document.getElementById('main');
  const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));

  // Data
  let tasks = readTasks();
  let currentFilter = 'all';
  let countdownIntervals = {};
  let editingTaskId = null; // track task being edited

  // Init
  setDateMinToday();
  adjustTimeMin();
  showTaskListView();
  renderTasks();

  // Header actions
  addButton.addEventListener('click', showAddTaskView);
  viewButton.addEventListener('click', showTaskListView);

  // Form submit
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleFormSubmission();
  });

  // Filters
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  dateInput.addEventListener('change', adjustTimeMin);

  // Functions
  function setDateMinToday() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
  }

  function adjustTimeMin() {
    const selected = dateInput.value;
    if (!selected) {
      timeInput.min = '';
      return;
    }
    const today = new Date();
    const sel = new Date(selected + 'T00:00');
    const sameDay =
      sel.getFullYear() === today.getFullYear() &&
      sel.getMonth() === today.getMonth() &&
      sel.getDate() === today.getDate();

    if (sameDay) {
      const now = new Date(today.getTime() + 60 * 1000);
      const hh = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      timeInput.min = `${hh}:${mi}`;
    } else {
      timeInput.min = '';
    }
  }

  function showAddTaskView() {
    mainSection.style.display = 'block';
    listContainer.style.display = 'none';
    addButton.style.display = 'none';
    viewButton.style.display = 'block';
    document.getElementById('add-btn').textContent = editingTaskId ? 'Save Changes' : 'Add Task';
  }

  function showTaskListView() {
    mainSection.style.display = 'none';
    listContainer.style.display = 'block';
    addButton.style.display = 'block';
    viewButton.style.display = 'none';
    renderTasks();
  }

  function handleFormSubmission() {
    const title = taskInput.value.trim();
    const desc = descInput.value.trim();
    const date = dateInput.value;
    const time = timeInput.value;

    if (!title) return alert('Please enter a task title.');
    if (!desc) return alert('Please enter a task description.');
    if (!date) return alert('Please select a due date.');
    if (!time) return alert('Please select a due time.');

    const due = new Date(`${date}T${time}`);
    if (due <= new Date()) return alert('Please choose a future date and time.');

    if (editingTaskId) {
      // update task
      const task = tasks.find(t => t.id === editingTaskId);
      task.title = title;
      task.description = desc;
      task.date = date;
      task.time = time;
      editingTaskId = null;
    } else {
      // new task
      tasks.push({
        id: Date.now(),
        title,
        description: desc,
        date,
        time,
        completed: false,
        createdAt: new Date().toISOString(),
      });
    }

    writeTasks(tasks);
    taskForm.reset();
    showTaskListView();
  }

  function renderTasks() {
    Object.values(countdownIntervals).forEach(id => clearInterval(id));
    countdownIntervals = {};
    updateTaskStats();

    let filtered = [...tasks];
    if (currentFilter === 'active') filtered = filtered.filter(t => !t.completed);
    if (currentFilter === 'completed') filtered = filtered.filter(t => t.completed);

    taskList.innerHTML = '';
    if (!filtered.length) {
      taskList.innerHTML = `<div class="empty-state">No tasks.</div>`;
      return;
    }

    filtered.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;
      li.dataset.id = task.id;

      li.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <div class="task-content">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-description">${escapeHtml(task.description)}</div>
          <div class="task-date">Due: ${formatDate(task.date)} ${formatTime(task.time)}</div>
        </div>
        <div class="task-actions">
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </div>
      `;
      taskList.appendChild(li);

      // Add countdown if needed
      startCountdown(task.id);
    });

    taskList.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('change', e => {
        const id = parseInt(e.target.closest('.task-item').dataset.id, 10);
        const task = tasks.find(t => t.id === id);
        task.completed = e.target.checked;
        writeTasks(tasks);
        renderTasks();
      });
    });

    taskList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = parseInt(e.target.closest('.task-item').dataset.id, 10);
        tasks = tasks.filter(t => t.id !== id);
        writeTasks(tasks);
        renderTasks();
      });
    });

    taskList.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = parseInt(e.target.closest('.task-item').dataset.id, 10);
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        // preload task into form
        taskInput.value = task.title;
        descInput.value = task.description;
        dateInput.value = task.date;
        timeInput.value = task.time;

        editingTaskId = id; // mark as editing
        showAddTaskView();
      });
    });
  }

  function updateTaskStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length >= 3) {
      statNumbers[0].textContent = total;
      statNumbers[1].textContent = active;
      statNumbers[2].textContent = completed;
    }
  }

  function startCountdown(taskId) {
    // optional: countdown logic here
  }

  // Helpers
  function formatDate(dateString) {
    if (!dateString) return 'No date';
    const opts = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, opts);
  }

  function formatTime(timeString) {
    if (!timeString) return '';
    let [h, m] = timeString.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  function readTasks() {
    try { return JSON.parse(localStorage.getItem('tasks')) || []; } catch { return []; }
  }

  function writeTasks(arr) { localStorage.setItem('tasks', JSON.stringify(arr)); }

  function escapeHtml(str) {
    return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }
});
