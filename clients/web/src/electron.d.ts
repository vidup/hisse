interface WorkspaceStateSnapshot {
  currentPath: string;
  recentPaths: string[];
}

type DesktopEditor = "vscode" | "cursor";

interface ElectronAPI {
  pickFolder: (defaultPath?: string) => Promise<string | null>;
  getWorkspaceState: () => Promise<WorkspaceStateSnapshot>;
  getWorkspacePath: () => Promise<string>;
  changeWorkspace: () => Promise<WorkspaceStateSnapshot | null>;
  switchWorkspace: (path: string) => Promise<WorkspaceStateSnapshot>;
  openInEditor: (editor: DesktopEditor, targetPath: string) => Promise<{ ok: boolean }>;
  openInFileManager: (targetPath: string) => Promise<{ ok: boolean }>;
}

interface Window {
  electron?: ElectronAPI;
}
