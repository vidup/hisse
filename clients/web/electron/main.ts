import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let workspacePath: string = "";

const configPath = path.join(app.getPath("userData"), "workspace-config.json");

function loadWorkspacePath(): string | null {
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw);
    return config.workspacePath ?? null;
  } catch {
    return null;
  }
}

function saveWorkspacePath(p: string): void {
  fs.writeFileSync(configPath, JSON.stringify({ workspacePath: p }), "utf-8");
}

async function pickWorkspaceFolder(
  parent?: BrowserWindow,
): Promise<string | null> {
  const options: Electron.OpenDialogOptions = {
    properties: ["openDirectory"],
  };
  const result = parent
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options);
  return result.canceled ? null : (result.filePaths[0] ?? null);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "../dist-electron/preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC: native folder picker
ipcMain.handle(
  "dialog:openDirectory",
  async (_event, defaultPath?: string) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      defaultPath: defaultPath ?? workspacePath,
    });
    return result.canceled ? null : (result.filePaths[0] ?? null);
  },
);

// IPC: get the current workspace path
ipcMain.handle("workspace:getPath", () => {
  return workspacePath;
});

// IPC: change workspace via folder picker
ipcMain.handle("workspace:change", async () => {
  const selected = await pickWorkspaceFolder(mainWindow ?? undefined);
  if (!selected) return null;
  workspacePath = selected;
  saveWorkspacePath(selected);
  return selected;
});

app.on("ready", async () => {
  const saved = loadWorkspacePath();

  if (saved) {
    workspacePath = saved;
  } else {
    const selected = await pickWorkspaceFolder();
    if (selected) {
      workspacePath = selected;
      saveWorkspacePath(selected);
    }
  }

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
