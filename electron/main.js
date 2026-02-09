const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const db = require("./db");

const isDev = !app.isPackaged;

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

  if (isDev) {
    win.loadURL("http://localhost:3000");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "../build/index.html"));
  }
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

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
