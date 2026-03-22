interface ElectronAPI {
  pickFolder: () => Promise<string | null>;
}

interface Window {
  electron?: ElectronAPI;
}
