// taskStore.js
// ─────────────────────────────────────────────
//  Simple JSON-file persistence layer for tasks
//  Each user gets their own isolated task list
// ─────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');

// ── Helpers ──────────────────────────────────

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeAll(data) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Public API ───────────────────────────────

/**
 * Get all tasks for a user.
 * @param {string|number} userId
 * @returns {Array<{id:number, text:string, done:boolean, createdAt:string}>}
 */
function getTasks(userId) {
  const all = readAll();
  return all[userId] ?? [];
}

/**
 * Add a new task for a user.
 * @param {string|number} userId
 * @param {string} text
 * @returns {{ id:number, text:string, done:boolean, createdAt:string }}
 */
function addTask(userId, text) {
  const all   = readAll();
  const tasks = all[userId] ?? [];
  const maxId = tasks.reduce((m, t) => Math.max(m, t.id), 0);

  const task = {
    id:        maxId + 1,
    text:      text.trim(),
    done:      false,
    createdAt: new Date().toISOString(),
  };

  all[userId] = [...tasks, task];
  writeAll(all);
  return task;
}

/**
 * Remove a task by ID for a user.
 * @param {string|number} userId
 * @param {number} taskId
 * @returns {boolean} true if removed, false if not found
 */
function removeTask(userId, taskId) {
  const all    = readAll();
  const tasks  = all[userId] ?? [];
  const before = tasks.length;

  all[userId] = tasks.filter((t) => t.id !== Number(taskId));
  writeAll(all);
  return all[userId].length < before;
}

/**
 * Toggle done status for a task.
 * @param {string|number} userId
 * @param {number} taskId
 * @returns {object|null} updated task or null
 */
function toggleTask(userId, taskId) {
  const all   = readAll();
  const tasks = all[userId] ?? [];
  const task  = tasks.find((t) => t.id === Number(taskId));
  if (!task) return null;

  task.done   = !task.done;
  all[userId] = tasks;
  writeAll(all);
  return task;
}

/**
 * Count total tasks across all users (for admin stats).
 */
function totalTaskCount() {
  const all = readAll();
  return Object.values(all).reduce((sum, arr) => sum + arr.length, 0);
}

/**
 * Count unique users who have tasks.
 */
function uniqueUserCount() {
  return Object.keys(readAll()).length;
}

module.exports = { getTasks, addTask, removeTask, toggleTask, totalTaskCount, uniqueUserCount };
