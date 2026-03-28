interface WorkspaceStateSnapshot {
  currentPath: string;
  recentPaths: string[];
}

interface ElectronAPI {
  pickFolder: (defaultPath?: string) => Promise<string | null>;
  getWorkspaceState: () => Promise<WorkspaceStateSnapshot>;
  getWorkspacePath: () => Promise<string>;
  changeWorkspace: () => Promise<WorkspaceStateSnapshot | null>;
  switchWorkspace: (path: string) => Promise<WorkspaceStateSnapshot>;
}

interface Window {
  electron?: ElectronAPI;
}
