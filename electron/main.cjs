const fs = require("fs");
const path = require("path");
const http = require("http");
const net = require("net");
const os = require("os");
const {
  app,
  BrowserWindow,
  utilityProcess,
  shell,
  dialog,
  Menu,
} = require("electron");

const LOG_PATH = path.join(os.homedir(), "Library", "Logs", "Biblioteka.log");

function dlog(...args) {
  const line = `${new Date().toISOString()} ${args.map(String).join(" ")}\n`;
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, line);
  } catch {
    /* ignore */
  }
}

// Jedna instancja — przed resztą lifecycle
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

const isDev = !app.isPackaged;
const DEV_URL = process.env.ELECTRON_START_URL || "http://127.0.0.1:3000";

let mainWindow = null;
let serverChild = null;
let serverPort = 0;

function userDataDir() {
  return path.join(app.getPath("userData"), "data");
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
    server.on("error", reject);
  });
}

function waitForServer(port, timeoutMs = 90000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(
        { hostname: "127.0.0.1", port, path: "/", timeout: 2000 },
        (res) => {
          res.resume();
          resolve();
        }
      );
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error("Serwer aplikacji nie wystartował na czas."));
          return;
        }
        setTimeout(tryOnce, 300);
      });
      req.on("timeout", () => req.destroy());
    };
    tryOnce();
  });
}

function standaloneDir() {
  if (isDev) {
    return path.join(__dirname, "..", ".next", "standalone");
  }
  return path.join(process.resourcesPath, "next");
}

function startProductionServer(port) {
  const dir = standaloneDir();
  const serverJs = path.join(dir, "server.js");
  if (!fs.existsSync(serverJs)) {
    throw new Error(
      `Brak serwera Next.js (${serverJs}). Zbuduj aplikację: npm run desktop:build`
    );
  }

  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    BIBLIOTEKA_DATA_DIR: userDataDir(),
  };

  serverChild = utilityProcess.fork(serverJs, [], {
    cwd: dir,
    env,
    stdio: "pipe",
    serviceName: "biblioteka-next",
  });

  serverChild.stdout?.on("data", (buf) => dlog("[next]", buf.toString().trim()));
  serverChild.stderr?.on("data", (buf) =>
    dlog("[next:err]", buf.toString().trim())
  );
  serverChild.on("exit", (code) => {
    dlog("[next] exit", code);
    serverChild = null;
  });
}

async function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "Biblioteka",
    backgroundColor: "#f3ebe0",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    shell.openExternal(openUrl);
    return { action: "deny" };
  });

  await mainWindow.loadURL(url);
}

function buildMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edycja",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "Widok",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { type: "separator" },
        { role: "toggleDevTools" },
      ],
    },
    {
      label: "Okno",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function boot() {
  fs.mkdirSync(userDataDir(), { recursive: true });
  buildMenu();

  if (isDev) {
    const port = Number(new URL(DEV_URL).port || 3000);
    await waitForServer(port);
    await createWindow(DEV_URL);
    return;
  }

  serverPort = await findFreePort();
  startProductionServer(serverPort);
  await waitForServer(serverPort);
  await createWindow(`http://127.0.0.1:${serverPort}`);
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  boot().catch((err) => {
    dlog("boot error", err?.stack || err?.message || err);
    dialog.showErrorBox(
      "Biblioteka",
      err?.message || "Nie udało się uruchomić aplikacji."
    );
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    boot().catch((err) => dlog("activate boot error", err));
  }
});

app.on("before-quit", () => {
  if (serverChild) {
    try {
      serverChild.kill();
    } catch {
      /* ignore */
    }
    serverChild = null;
  }
});
