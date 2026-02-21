# Electron — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `electron` in `dependencies` · `BrowserWindow` · `ipcMain` · `ipcRenderer` · `app.whenReady()` · `main.js` / `main.ts` as Electron entry

---

## Security

- **[CRITICAL]** `contextIsolation: false` in `webPreferences` → renderer process has direct access to Node.js APIs; XSS in renderer = full system compromise.
- **[CRITICAL]** `nodeIntegration: true` in `webPreferences` → full Node.js API surface exposed to renderer; one XSS = RCE.
- **[CRITICAL]** `webSecurity: false` → disables CORS, allows loading local files from remote pages, enables cross-origin attacks.
- **[HIGH]** IPC handler executing user-controlled commands: `ipcMain.on('run', (e, cmd) => exec(cmd))` → arbitrary command execution from renderer or compromised web content.
- **[HIGH]** Loading remote URLs in `BrowserWindow` without a strict Content Security Policy → XSS attack surface.
- **[HIGH]** `shell.openExternal(url)` with user-controlled URL → opens `file://`, `smb://`, or other dangerous protocol URIs. Validate scheme and host allowlist.
- **[MEDIUM]** Bundling application without code signing → OS security warnings, easier to tamper with by local attacker.

---

## Performance

- **[HIGH]** Synchronous IPC `ipcRenderer.sendSync()` → blocks renderer's UI thread until main process responds. Use async `ipcRenderer.invoke()` / `ipcMain.handle()`.
- **[HIGH]** Sending large data (images, buffers) over IPC as serialized JSON → full serialize/deserialize cost. Use `SharedArrayBuffer` or write to a temp file and pass the path.
- **[MEDIUM]** Invisible `BrowserWindow` kept alive indefinitely → each window has a full Chromium renderer process (~80-150 MB). Destroy when not needed.
- **[LOW]** Requiring all Node modules at startup in main process → slow cold start. Use lazy requires inside handlers.

---

## Architecture

- **[HIGH]** Business logic placed in renderer process → should live in main process or a dedicated Node service; renderer should be a thin UI layer communicating via IPC.
- **[HIGH]** `remote` module (deprecated in Electron 12, removed in 14) still in use → security risk, use `contextBridge` to expose specific APIs to renderer.
- **[MEDIUM]** Entire `ipcRenderer` object exposed via `contextBridge.exposeInMainWorld` → expose a minimal typed API, not the full IPC surface.
- **[MEDIUM]** No auto-update mechanism (e.g., `electron-updater`) → security patches can't reach users. Implement silent update with user notification.

---

## Common Bugs & Pitfalls

- **[HIGH]** `app.quit()` not called after all windows close on Windows/Linux → process keeps running in background (tray icon or just CPU/memory waste). Add `app.on('window-all-closed', () => app.quit())` for non-macOS.
- **[HIGH]** Accessing `document` / `window` in main process → these are browser globals, undefined in Node.js main process context.
- **[MEDIUM]** Async operation started from IPC handler completes after `BrowserWindow` is destroyed → callback or `event.reply()` on destroyed window throws error.
- **[MEDIUM]** Dev tools opened in production build → `webContents.openDevTools()` call not removed. Gate with `!app.isPackaged`.
- **[LOW]** `process.resourcesPath` used to locate app files → use `path.join(__dirname, ...)` or `app.getAppPath()` for reliable cross-platform paths.
