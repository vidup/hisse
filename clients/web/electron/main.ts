import { spawn } from "node:child_process";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_RECENT_WORKSPACES = 8;

let mainWindow: BrowserWindow | null = null;
let workspacePath: string = "";
let recentWorkspacePaths: string[] = [];

const configPath = path.join(app.getPath("userData"), "workspace-config.json");

interface WorkspaceConfig {
  workspacePath?: string | null;
  recentWorkspacePaths?: string[];
}

interface WorkspaceState {
  currentPath: string;
  recentPaths: string[];
}

type DesktopEditor = "vscode" | "cursor";

function normalizeWorkspacePath(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isExistingDirectory(targetPath: string): boolean {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

function isExistingFile(targetPath: string): boolean {
  try {
    return fs.statSync(targetPath).isFile();
  } catch {
    return false;
  }
}

function normalizeTargetPath(targetPath: string): string {
  const trimmed = targetPath.trim();
  if (!trimmed) {
    throw new Error("A target path is required");
  }

  return path.resolve(trimmed);
}

function getEditorCandidates(editor: DesktopEditor): string[] {
  const localAppData = process.env.LOCALAPPDATA ?? "";
  const programFiles = process.env.ProgramFiles ?? "";
  const programFilesX86 = process.env["ProgramFiles(x86)"] ?? "";

  if (editor === "vscode") {
    return [
      "code",
      path.join(localAppData, "Programs", "Microsoft VS Code", "Code.exe"),
      path.join(programFiles, "Microsoft VS Code", "Code.exe"),
      path.join(programFilesX86, "Microsoft VS Code", "Code.exe"),
    ];
  }

  return [
    "cursor",
    path.join(localAppData, "Programs", "Cursor", "Cursor.exe"),
    path.join(localAppData, "Programs", "cursor", "Cursor.exe"),
    path.join(programFiles, "Cursor", "Cursor.exe"),
    path.join(programFilesX86, "Cursor", "Cursor.exe"),
  ];
}

function isLikelyExecutableCandidate(candidate: string): boolean {
  return !candidate.includes(path.sep) || isExistingFile(candidate);
}

function launchDetached(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      shell: process.platform === "win32",
    });

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

async function openPathInEditor(editor: DesktopEditor, targetPath: string): Promise<void> {
  const normalizedPath = normalizeTargetPath(targetPath);
  if (!isExistingDirectory(normalizedPath) && !isExistingFile(normalizedPath)) {
    throw new Error(`Path does not exist: ${normalizedPath}`);
  }

  for (const candidate of getEditorCandidates(editor)) {
    if (!candidate || !isLikelyExecutableCandidate(candidate)) continue;

    try {
      await launchDetached(candidate, [normalizedPath]);
      return;
    } catch {
      continue;
    }
  }

  const editorLabel = editor === "vscode" ? "VS Code" : "Cursor";
  throw new Error(`${editorLabel} is not available on this machine`);
}

async function openPathInFileManager(targetPath: string): Promise<void> {
  const normalizedPath = normalizeTargetPath(targetPath);
  if (!isExistingDirectory(normalizedPath) && !isExistingFile(normalizedPath)) {
    throw new Error(`Path does not exist: ${normalizedPath}`);
  }

  const result = await shell.openPath(normalizedPath);
  if (result) {
    throw new Error(result);
  }
}

function dedupeWorkspacePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const workspace of paths) {
    const key = workspace.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(workspace);
  }

  return deduped.slice(0, MAX_RECENT_WORKSPACES);
}

function buildWorkspaceState(currentPath: string, recentPaths: string[]): WorkspaceState {
  const normalizedCurrentCandidate = normalizeWorkspacePath(currentPath);
  const normalizedCurrentPath =
    normalizedCurrentCandidate && isExistingDirectory(normalizedCurrentCandidate)
      ? normalizedCurrentCandidate
      : "";
  const normalizedRecents = recentPaths
    .map((candidate) => normalizeWorkspacePath(candidate))
    .filter((candidate): candidate is string => !!candidate)
    .filter(isExistingDirectory);

  const nextRecentPaths = normalizedCurrentPath
    ? dedupeWorkspacePaths([normalizedCurrentPath, ...normalizedRecents])
    : dedupeWorkspacePaths(normalizedRecents);

  return {
    currentPath: normalizedCurrentPath,
    recentPaths: nextRecentPaths,
  };
}

function getWorkspaceState(): WorkspaceState {
  return buildWorkspaceState(workspacePath, recentWorkspacePaths);
}

function loadWorkspaceState(): WorkspaceState {
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw) as WorkspaceConfig;
    const currentPath = normalizeWorkspacePath(config.workspacePath) ?? "";
    const recentPaths = Array.isArray(config.recentWorkspacePaths) ? config.recentWorkspacePaths : [];
    return buildWorkspaceState(currentPath, recentPaths);
  } catch {
    return { currentPath: "", recentPaths: [] };
  }
}

function saveWorkspaceState(state: WorkspaceState): void {
  const nextState = buildWorkspaceState(state.currentPath, state.recentPaths);
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        workspacePath: nextState.currentPath || null,
        recentWorkspacePaths: nextState.recentPaths,
      },
      null,
      2,
    ),
    "utf-8",
  );
}

function setCurrentWorkspace(nextPath: string): WorkspaceState {
  const normalizedPath = normalizeWorkspacePath(nextPath);
  if (!normalizedPath) {
    throw new Error("Workspace path is required");
  }

  if (!isExistingDirectory(normalizedPath)) {
    throw new Error(`Workspace path does not exist: ${normalizedPath}`);
  }

  workspacePath = normalizedPath;
  recentWorkspacePaths = dedupeWorkspacePaths([normalizedPath, ...recentWorkspacePaths]);

  const state = getWorkspaceState();
  saveWorkspaceState(state);

  return state;
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

ipcMain.handle("workspace:getState", () => {
  return getWorkspaceState();
});

// IPC: change workspace via folder picker
ipcMain.handle("workspace:change", async () => {
  const selected = await pickWorkspaceFolder(mainWindow ?? undefined);
  if (!selected) return null;
  return setCurrentWorkspace(selected);
});

ipcMain.handle("workspace:setCurrent", async (_event, nextPath: string) => {
  return setCurrentWorkspace(nextPath);
});

ipcMain.handle("desktop:openInEditor", async (_event, editor: DesktopEditor, targetPath: string) => {
  await openPathInEditor(editor, targetPath);
  return { ok: true };
});

ipcMain.handle("desktop:openInFileManager", async (_event, targetPath: string) => {
  await openPathInFileManager(targetPath);
  return { ok: true };
});

app.on("ready", async () => {
  const saved = loadWorkspaceState();

  if (saved.currentPath) {
    workspacePath = saved.currentPath;
    recentWorkspacePaths = saved.recentPaths;
  } else {
    const selected = await pickWorkspaceFolder();
    if (selected) {
      const state = setCurrentWorkspace(selected);
      workspacePath = state.currentPath;
      recentWorkspacePaths = state.recentPaths;
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
