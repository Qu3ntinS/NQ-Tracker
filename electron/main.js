const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const db = require("./db");
const { autoUpdater } = require("electron-updater");

const isDev = !app.isPackaged;
let mainWindow;

function sendUpdateStatus(text) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send("update:status", text);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 900,
    backgroundColor: "#0b0b10",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow = win;

  if (isDev) {
    win.loadURL("http://localhost:3000");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "../build/index.html"));
  }
}

function initAutoUpdate() {
  if (isDev) return;
  autoUpdater.autoDownload = true;
  autoUpdater.on("checking-for-update", () => sendUpdateStatus("Update wird gesucht…"));
  autoUpdater.on("update-available", (info) => sendUpdateStatus(`Update verfügbar: ${info.version}`));
  autoUpdater.on("update-not-available", () => sendUpdateStatus("Kein Update verfügbar"));
  autoUpdater.on("error", (err) => sendUpdateStatus(`Update Fehler: ${err?.message || err}`));
  autoUpdater.on("download-progress", (p) => sendUpdateStatus(`Update lädt… ${Math.round(p.percent)}%`));
  autoUpdater.on("update-downloaded", () => {
    sendUpdateStatus("Update bereit – App startet neu");
    setTimeout(() => autoUpdater.quitAndInstall(), 800);
  });

  autoUpdater.checkForUpdatesAndNotify().catch((e) => sendUpdateStatus(`Update Fehler: ${e?.message || e}`));
}

app.whenReady().then(() => {
  db.initDb();

  ipcMain.handle("db:init", async () => db.getSettings());
  ipcMain.handle("db:listEntries", async (_e, from, to) => db.listEntries(from, to));
  ipcMain.handle("db:createEntry", async (_e, entry) => db.createEntry(entry));
  ipcMain.handle("db:updateEntry", async (_e, id, patch) => db.updateEntry(id, patch));
  ipcMain.handle("db:deleteEntry", async (_e, id) => db.deleteEntry(id));
  ipcMain.handle("db:listProjects", async () => db.listProjects());
  ipcMain.handle("db:addProject", async (_e, name) => db.addProject(name));
  ipcMain.handle("db:getSettings", async () => db.getSettings());
  ipcMain.handle("db:updateSettings", async (_e, patch) => db.updateSettings(patch));
  ipcMain.handle("update:check", async () => {
    if (isDev) return null;
    return autoUpdater.checkForUpdatesAndNotify();
  });
  ipcMain.handle("app:version", async () => app.getVersion());

  createWindow();
  initAutoUpdate();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
