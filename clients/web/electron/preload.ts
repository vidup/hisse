import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  pickFolder: (): Promise<string | null> => ipcRenderer.invoke("dialog:openDirectory"),
});
