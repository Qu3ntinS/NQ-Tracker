const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nqApi", {
  init: () => ipcRenderer.invoke("db:init"),
  listEntries: (from, to) => ipcRenderer.invoke("db:listEntries", from, to),
  createEntry: (entry) => ipcRenderer.invoke("db:createEntry", entry),
  updateEntry: (id, patch) => ipcRenderer.invoke("db:updateEntry", id, patch),
  deleteEntry: (id) => ipcRenderer.invoke("db:deleteEntry", id),
  listProjects: () => ipcRenderer.invoke("db:listProjects"),
  addProject: (name) => ipcRenderer.invoke("db:addProject", name),
  getSettings: () => ipcRenderer.invoke("db:getSettings"),
  updateSettings: (patch) => ipcRenderer.invoke("db:updateSettings", patch)
});
