import { ipcMain, app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
let mainWindow = null;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname$1, "../dist-electron/preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
ipcMain.handle("dialog:openDirectory", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
});
app.on("ready", createWindow);
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
