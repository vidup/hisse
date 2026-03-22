interface ElectronAPI {
  pickFolder: (defaultPath?: string) => Promise<string | null>;
  getWorkspacePath: () => Promise<string>;
  changeWorkspace: () => Promise<string | null>;
}

interface Window {
  electron?: ElectronAPI;
}
