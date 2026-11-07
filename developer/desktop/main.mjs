import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  session,
  shell,
  utilityProcess,
} from "electron";
import { mkdir, appendFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reservePort, sameOrigin, waitForServer } from "./runtime.mjs";

app.setName("AstraAI");
const userDirectory =
  process.env.ASTRA_DESKTOP_HOME ||
  path.join(app.getPath("appData"), "AstraAI");
app.setPath("userData", userDirectory);
const dataDirectory = path.join(userDirectory, "data");
let window;
let server;
let serverExited = false;
let quitting = false;
let origin;
const secret = randomBytes(32).toString("hex");

async function fail(error) {
  if (quitting) return;
  const message = error instanceof Error ? error.message : String(error);
  await appendFile(
    path.join(userDirectory, "desktop-error.log"),
    `${new Date().toISOString()} ${message}\n`,
  ).catch(() => {});
  if (process.env.ASTRA_DESKTOP_TEST === "1") {
    console.error(message);
    app.exit(1);
    return;
  }
  dialog.showErrorBox(
    "AstraAI를 시작할 수 없습니다",
    `${message}\n\n기록은 삭제되지 않았습니다. 다시 실행해 주세요.`,
  );
  app.quit();
}

function createWindow() {
  window = new BrowserWindow({
    title: "AstraAI · 나의 학습실",
    width: 1280,
    height: 900,
    minWidth: 390,
    minHeight: 600,
    backgroundColor: "#f8f8f4",
    show: false,
    icon: path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "assets/icon.png",
    ),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!sameOrigin(url, origin)) event.preventDefault();
  });
  window.webContents.on("will-redirect", (event, url) => {
    if (!sameOrigin(url, origin)) event.preventDefault();
  });
  window.webContents.on("will-attach-webview", (event) =>
    event.preventDefault(),
  );
  window.webContents.on("render-process-gone", () => {
    if (!quitting) void fail(new Error("학습 화면이 종료되었습니다."));
  });
  window.once("ready-to-show", () => window.show());
  void window.loadURL(origin).catch(fail);
}

async function start() {
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  const port = await reservePort(path.join(userDirectory, "desktop.json"));
  origin = `http://127.0.0.1:${port}`;
  const resources = app.isPackaged
    ? process.resourcesPath
    : path.join(path.dirname(fileURLToPath(import.meta.url)), "../.desktop");
  const serverDirectory = path.join(resources, "server");
  // All resources are bundled. The renderer has no Node or IPC access.
  session.defaultSession.setPermissionRequestHandler(
    (contents, permission, callback) =>
      callback(
        permission === "clipboard-sanitized-write" &&
          sameOrigin(contents.getURL(), origin),
      ),
  );
  session.defaultSession.setPermissionCheckHandler(
    (_contents, permission, requestingOrigin) =>
      permission === "clipboard-sanitized-write" &&
      sameOrigin(requestingOrigin, origin),
  );
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({
      cancel:
        !sameOrigin(details.url, origin) &&
        !details.url.startsWith("blob:") &&
        !details.url.startsWith("data:"),
    });
  });
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (sameOrigin(details.url, origin))
      details.requestHeaders["X-Astra-Desktop-Token"] = secret;
    callback({ requestHeaders: details.requestHeaders });
  });
  server = utilityProcess.fork(path.join(serverDirectory, "server.js"), [], {
    cwd: serverDirectory,
    serviceName: "AstraAI Study Server",
    stdio: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      ASTRA_DATA_DIR: dataDirectory,
      ASTRA_DESKTOP_TOKEN: secret,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });
  // Drain output without writing question content, cookies or tokens to logs.
  server.stdout?.on("data", () => {});
  server.stderr?.on("data", (data) => {
    if (process.env.ASTRA_DESKTOP_TEST === "1") process.stderr.write(data);
  });
  server.on("exit", (code) => {
    serverExited = true;
    if (!quitting && window)
      void fail(new Error(`학습실 저장 프로세스가 종료되었습니다 (${code}).`));
  });
  await waitForServer(origin, secret, () => serverExited);
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "AstraAI",
        submenu: [
          {
            label: "학습 데이터 폴더 열기",
            click: () => {
              void shell.openPath(dataDirectory);
            },
          },
          {
            label: "앱 정보",
            click: () => {
              void dialog.showMessageBox(window, {
                type: "info",
                title: "AstraAI",
                message: `AstraAI ${app.getVersion()}`,
                detail:
                  "개인 문제은행 · 자료와 학습 기록은 이 PC에 저장됩니다. GitHub 로그인이나 인터넷 연결 없이 사용할 수 있습니다.",
              });
            },
          },
          { type: "separator" },
          { label: "종료", role: "quit" },
        ],
      },
      {
        label: "편집",
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
        label: "보기",
        submenu: [
          { role: "reload" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { role: "togglefullscreen" },
        ],
      },
    ]),
  );
  createWindow();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", (event) => {
    if (quitting || !server || serverExited) return;
    event.preventDefault();
    quitting = true;
    // Next handles SIGTERM and finishes pending requests before exiting.
    const timer = setTimeout(() => app.exit(), 5000);
    server.once("exit", () => {
      clearTimeout(timer);
      app.quit();
    });
    server.kill();
  });
  void app.whenReady().then(start).catch(fail);
}
