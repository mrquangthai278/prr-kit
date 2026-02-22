# Tauri — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `tauri`, `tauri.conf.json`, `from '@tauri-apps/api'`, `#[tauri::command]`, `src-tauri/`, `Cargo.toml` with tauri

---

## Security
- **[CRITICAL]** Tauri `allowlist` set to `all: true` or broad permission groups → entire Tauri API surface exposed to the frontend JavaScript context. Enable only the specific API namespaces required by the application.
- **[CRITICAL]** `shell` allowlist enabled without an explicit `scope` allowlist → frontend JavaScript can execute arbitrary shell commands on the user's machine. Define an exact command allowlist with fixed arguments in `tauri.conf.json`.
- **[HIGH]** Frontend loads remote URLs (not `tauri://localhost`) without a strict Content Security Policy → XSS in remote content gains access to enabled Tauri APIs. Set a restrictive `csp` in `tauri.conf.json` and avoid loading remote content.
- **[HIGH]** Tauri command handler accepts user-supplied input and passes it to file system, shell, or SQL operations without validation → injection attacks. Validate and sanitize all inputs inside the Rust command handler before use.
- **[HIGH]** `fs` allowlist scope too broad (e.g., `$HOME`) → frontend can read or write arbitrary files. Restrict `fs` scope to `$APPDATA`, `$APPCONFIG`, or specific subdirectories the application actually needs.
- **[MEDIUM]** `invoke()` commands for sensitive operations (delete, export, admin) not verifying session state or caller context → any frontend code can trigger privileged commands. Add session validation inside each sensitive Tauri command.

---

## Performance
- **[HIGH]** Long-running or CPU-bound work performed synchronously inside a Tauri command → blocks the async runtime thread pool. Mark commands `async` and use `tokio::spawn` for truly parallel work or `tokio::task::spawn_blocking` for blocking operations.
- **[HIGH]** Large data payloads (images, binary files) passed across the IPC boundary as base64 JSON → high serialization overhead and memory doubling. Use Tauri's resource system or write to a temp file and pass the path instead.
- **[MEDIUM]** Tauri updater not configured with delta updates → full application binary downloaded on every update. Enable delta updates via the updater plugin to minimize update size.
- **[MEDIUM]** Application window created and shown immediately at startup before content is ready → blank white flash on launch. Use `visible: false` in window config and call `appWindow.show()` after the frontend signals readiness.
- **[MEDIUM]** All application logic kept in the frontend bundle → no benefit from Rust's performance for compute-heavy tasks. Move computation-intensive operations (crypto, parsing, compression) to Tauri commands.
- **[LOW]** System tray not used for background tasks → main window kept open solely to maintain a background process. Use `tauri-plugin-system-tray` with a hidden window for background daemon behaviour.

---

## Architecture
- **[HIGH]** All business logic implemented in the frontend JavaScript → security controls and data access fully bypassable from DevTools. Move trust boundaries, validation, and data access to Rust Tauri commands.
- **[MEDIUM]** Tauri commands not organized into logical Rust modules → all commands in one file, hard to navigate. Group commands by domain into separate modules and register them with `generate_handler!`.
- **[MEDIUM]** Shared mutable state managed as a Rust `Mutex<Option<T>>` global instead of Tauri's `State<T>` → not integrated with Tauri's lifecycle. Use `tauri::Builder::manage()` to register state and `State<T>` in command signatures.
- **[MEDIUM]** Frontend communicates with Rust exclusively through synchronous `invoke()` calls → no event-driven updates from Rust to frontend. Use `window.emit()` from Rust for push notifications (progress, background events) to the frontend.
- **[LOW]** Common functionality (file watching, HTTP, shell) reimplemented manually instead of using official Tauri plugins → duplicated effort and missed security fixes. Use `tauri-plugin-fs`, `tauri-plugin-http`, and other official plugins where available.

---

## Code Quality
- **[HIGH]** `unwrap()` or `expect()` used inside Tauri command handlers → panics surface as untyped errors on the frontend with no actionable information. Define a custom error enum implementing `serde::Serialize` and return `Result<T, AppError>` from all commands.
- **[MEDIUM]** Tauri command errors not typed with a serializable enum → frontend receives a plain string and cannot programmatically distinguish error types. Create an `AppError` enum with `#[derive(Debug, Serialize)]` and map all error types to it.
- **[MEDIUM]** Commands not registered via `generate_handler!` macro → commands silently missing at runtime with no compile-time error. Ensure all public command functions are listed in `generate_handler!` in `main.rs`.
- **[MEDIUM]** Window configuration (title, min/max size, decorations) not specified in `tauri.conf.json` → window appears with OS defaults that may not match application design. Define window properties explicitly in the config.
- **[LOW]** Rust dependencies in `Cargo.toml` not version-pinned → `cargo update` may introduce breaking changes. Pin dependencies to exact versions and review `Cargo.lock` in version control.

---

## Common Bugs & Pitfalls
- **[HIGH]** Content Security Policy blocks `tauri://localhost` or `ipc://localhost` → Tauri's IPC bridge is non-functional and `invoke()` calls silently fail. Ensure the CSP `connect-src` directive includes `tauri://localhost` and `ipc://localhost`.
- **[HIGH]** `async` Tauri command performing blocking I/O with `std::fs` or `std::thread::sleep` → starves the async runtime. Replace with `tokio::fs`, `tokio::time::sleep`, and other async-compatible alternatives.
- **[MEDIUM]** Two windows created with the same `label` → Tauri panics or silently fails to open the second window. Use unique labels per window and check for existing windows with `app.get_window()` before creating.
- **[MEDIUM]** File paths constructed with string concatenation instead of `std::path::PathBuf` → path separator mismatches on Windows (`\` vs `/`). Always use `PathBuf` and `.join()` for cross-platform path construction.
- **[MEDIUM]** Tauri `beforeMount` or `DOMContentLoaded` events used to call `invoke()` before the IPC bridge is ready → race condition causing failed invocations on startup. Wait for the `tauri://window-created` event before making IPC calls.
- **[LOW]** macOS code signing and notarization not configured in EAS/CI → Gatekeeper blocks the app on first launch. Configure `signingIdentity` and Apple notarization credentials in the build pipeline.
