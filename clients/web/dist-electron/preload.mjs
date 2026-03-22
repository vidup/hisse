"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  pickFolder: (defaultPath) => electron.ipcRenderer.invoke("dialog:openDirectory", defaultPath),
  getWorkspacePath: () => electron.ipcRenderer.invoke("workspace:getPath"),
  changeWorkspace: () => electron.ipcRenderer.invoke("workspace:change")
});
