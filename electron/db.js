const path = require("path");
const Database = require("better-sqlite3");
const { app } = require("electron");

let db;

function initDb() {
  const dbPath = path.join(app.getPath("userData"), "nq-tracker.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      start TEXT NOT NULL,
      end TEXT NOT NULL,
      projectId TEXT,
      comment TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  const defaultProject = db.prepare("SELECT id FROM projects WHERE id=?").get("default");
  if (!defaultProject) {
    db.prepare("INSERT INTO projects (id,name,color) VALUES (?,?,?)").run("default", "General", "#8b4dff");
  }

  const settings = db.prepare("SELECT key, value FROM settings").all();
  if (!settings.length) {
    db.prepare("INSERT INTO settings (key,value) VALUES (?,?)").run("minEntryMinutes", "15");
    db.prepare("INSERT INTO settings (key,value) VALUES (?,?)").run("dailyGoalHours", "8");
  }
}

function getSettings() {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  return rows.reduce((acc, r) => ({ ...acc, [r.key]: Number(r.value) }), {});
}

function updateSettings(patch) {
  Object.entries(patch).forEach(([k, v]) => {
    db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)").run(k, String(v));
  });
  return getSettings();
}

function toIso(val) {
  if (!val) return null;
  if (typeof val === "string") return val;
  try {
    return new Date(val).toISOString();
  } catch (e) {
    return String(val);
  }
}

function listEntries(from, to) {
  const f = toIso(from);
  const t = toIso(to);
  if (!f || !t) {
    return db.prepare("SELECT * FROM entries ORDER BY start ASC").all();
  }
  return db.prepare("SELECT * FROM entries WHERE start >= ? AND start <= ? ORDER BY start ASC").all(f, t);
}

function createEntry(entry) {
  const id = entry.id || `e_${Date.now()}`;
  db.prepare("INSERT INTO entries (id,start,end,projectId,comment,createdAt) VALUES (?,?,?,?,?,?)")
    .run(id, entry.start, entry.end, entry.projectId, entry.comment || "", new Date().toISOString());
  return db.prepare("SELECT * FROM entries WHERE id=?").get(id);
}

function updateEntry(id, patch) {
  const existing = db.prepare("SELECT * FROM entries WHERE id=?").get(id);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  db.prepare("UPDATE entries SET start=?, end=?, projectId=?, comment=? WHERE id=?")
    .run(next.start, next.end, next.projectId, next.comment || "", id);
  return db.prepare("SELECT * FROM entries WHERE id=?").get(id);
}

function deleteEntry(id) {
  db.prepare("DELETE FROM entries WHERE id=?").run(id);
  return true;
}

function listProjects() {
  return db.prepare("SELECT * FROM projects ORDER BY name ASC").all();
}

function addProject(name) {
  const id = `p_${Date.now()}`;
  db.prepare("INSERT INTO projects (id,name,color) VALUES (?,?,?)").run(id, name, "#8b4dff");
  return db.prepare("SELECT * FROM projects WHERE id=?").get(id);
}

module.exports = {
  initDb,
  getSettings,
  updateSettings,
  listEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  listProjects,
  addProject
};
