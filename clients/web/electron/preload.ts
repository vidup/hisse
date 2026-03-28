import { contextBridge, ipcRenderer } from "electron";

interface WorkspaceStateSnapshot {
  currentPath: string;
  recentPaths: string[];
}

contextBridge.exposeInMainWorld("electron", {
  pickFolder: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke("dialog:openDirectory", defaultPath),
  getWorkspaceState: (): Promise<WorkspaceStateSnapshot> =>
    ipcRenderer.invoke("workspace:getState"),
  getWorkspacePath: (): Promise<string> =>
    ipcRenderer.invoke("workspace:getPath"),
  changeWorkspace: (): Promise<WorkspaceStateSnapshot | null> =>
    ipcRenderer.invoke("workspace:change"),
  switchWorkspace: (path: string): Promise<WorkspaceStateSnapshot> =>
    ipcRenderer.invoke("workspace:setCurrent", path),
});
