const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const taskCount = document.getElementById("taskCount");
const searchInput = document.getElementById("searchInput");
const noteForm = document.getElementById("noteForm");
const noteTitle = document.getElementById("noteTitle");
const noteText = document.getElementById("noteText");
const notesList = document.getElementById("notesList");

let tasks = JSON.parse(localStorage.getItem("tasknest_tasks")) || [];
let notes = JSON.parse(localStorage.getItem("tasknest_notes")) || [];
let currentFilter = "all";

function save() {
  localStorage.setItem("tasknest_tasks", JSON.stringify(tasks));
  localStorage.setItem("tasknest_notes", JSON.stringify(notes));
}

function renderTasks() {
  const search = searchInput.value.toLowerCase().trim();
  const filtered = tasks.filter(task => {
    const matchesSearch = task.text.toLowerCase().includes(search);
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "pending" && !task.completed) ||
      (currentFilter === "completed" && task.completed);
    return matchesSearch && matchesFilter;
  });

  taskList.innerHTML = filtered.length ? "" : '<div class="empty">No tasks found.</div>';

  filtered.forEach(task => {
    const item = document.createElement("div");
    item.className = `task ${task.completed ? "done" : ""}`;
    item.innerHTML = `
      <input class="check" type="checkbox" ${task.completed ? "checked" : ""} aria-label="Complete task">
      <span class="task-text"></span>
      <button class="delete">Delete</button>
    `;
    item.querySelector(".task-text").textContent = task.text;

    item.querySelector(".check").addEventListener("change", () => {
      task.completed = !task.completed;
      save();
      renderTasks();
    });

    item.querySelector(".delete").addEventListener("click", () => {
      tasks = tasks.filter(t => t.id !== task.id);
      save();
      renderTasks();
    });

    taskList.appendChild(item);
  });

  taskCount.textContent = tasks.filter(t => !t.completed).length;
}

function renderNotes() {
  notesList.innerHTML = notes.length ? "" : '<div class="empty">No notes yet.</div>';

  notes.forEach(note => {
    const card = document.createElement("article");
    card.className = "note";
    card.innerHTML = `<button class="delete">Delete</button><h3></h3><p></p>`;
    card.querySelector("h3").textContent = note.title;
    card.querySelector("p").textContent = note.text;

    card.querySelector(".delete").addEventListener("click", () => {
      notes = notes.filter(n => n.id !== note.id);
      save();
      renderNotes();
    });

    notesList.appendChild(card);
  });
}

taskForm.addEventListener("submit", e => {
  e.preventDefault();
  tasks.unshift({ id: Date.now(), text: taskInput.value.trim(), completed: false });
  taskInput.value = "";
  save();
  renderTasks();
  taskInput.focus();
});

noteForm.addEventListener("submit", e => {
  e.preventDefault();
  notes.unshift({ id: Date.now(), title: noteTitle.value.trim(), text: noteText.value.trim() });
  noteTitle.value = "";
  noteText.value = "";
  save();
  renderNotes();
});

searchInput.addEventListener("input", renderTasks);

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    currentFilter = button.dataset.filter;
    renderTasks();
  });
});

renderTasks();
renderNotes();
