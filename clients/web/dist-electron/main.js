import { app as a, ipcMain as s, dialog as l, BrowserWindow as h } from "electron";
import p from "node:fs";
import i from "node:path";
import { fileURLToPath as m } from "node:url";
const c = i.dirname(m(import.meta.url));
let n = null, r = "";
const d = i.join(a.getPath("userData"), "workspace-config.json");
function g() {
  try {
    const e = p.readFileSync(d, "utf-8");
    return JSON.parse(e).workspacePath ?? null;
  } catch {
    return null;
  }
}
function u(e) {
  p.writeFileSync(d, JSON.stringify({ workspacePath: e }), "utf-8");
}
async function f(e) {
  const o = {
    properties: ["openDirectory"]
  }, t = e ? await l.showOpenDialog(e, o) : await l.showOpenDialog(o);
  return t.canceled ? null : t.filePaths[0] ?? null;
}
function w() {
  n = new h({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: i.join(c, "../dist-electron/preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), process.env.VITE_DEV_SERVER_URL ? (n.loadURL(process.env.VITE_DEV_SERVER_URL), n.webContents.openDevTools()) : n.loadFile(i.join(c, "../dist/index.html")), n.on("closed", () => {
    n = null;
  });
}
s.handle(
  "dialog:openDirectory",
  async (e, o) => {
    if (!n) return null;
    const t = await l.showOpenDialog(n, {
      properties: ["openDirectory"],
      defaultPath: o ?? r
    });
    return t.canceled ? null : t.filePaths[0] ?? null;
  }
);
s.handle("workspace:getPath", () => r);
s.handle("workspace:change", async () => {
  const e = await f(n ?? void 0);
  return e ? (r = e, u(e), e) : null;
});
a.on("ready", async () => {
  const e = g();
  if (e)
    r = e;
  else {
    const o = await f();
    o && (r = o, u(o));
  }
  w();
});
a.on("window-all-closed", () => {
  process.platform !== "darwin" && a.quit();
});
a.on("activate", () => {
  n === null && w();
});
