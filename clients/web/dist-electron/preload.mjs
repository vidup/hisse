"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  pickFolder: () => electron.ipcRenderer.invoke("dialog:openDirectory")
});
