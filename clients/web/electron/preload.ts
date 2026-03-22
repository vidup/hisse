import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  pickFolder: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke("dialog:openDirectory", defaultPath),
  getWorkspacePath: (): Promise<string> =>
    ipcRenderer.invoke("workspace:getPath"),
  changeWorkspace: (): Promise<string | null> =>
    ipcRenderer.invoke("workspace:change"),
});
