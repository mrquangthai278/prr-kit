# HTMX — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `htmx.min.js` or `htmx.org` CDN · `hx-get` / `hx-post` / `hx-put` / `hx-delete` in HTML templates · `hx-swap` · `hx-trigger` · `hx-target`

---

## Security

- **[CRITICAL]** HTMX endpoints not validating CSRF token → HTMX uses standard HTTP requests; CSRF protections must be explicitly implemented server-side (SameSite cookies, token header, or HTMX's `htmx:configRequest` event).
- **[HIGH]** Server returning HTML fragments containing unsanitized user input → XSS via `hx-swap` directly injecting attacker-controlled HTML into the DOM. Sanitize all user data server-side before rendering.
- **[HIGH]** `hx-get` / `hx-post` URL constructed from user-provided query parameters without validation → SSRF or open redirect if the server makes additional requests based on the URL.
- **[MEDIUM]** Missing `Content-Security-Policy` header → XSS impact amplified by HTMX's DOM manipulation capabilities. Set restrictive CSP, including `script-src`.

---

## Performance

- **[MEDIUM]** No loading indicator (`hx-indicator`) on slow requests → poor UX; user may click the trigger multiple times, sending duplicate requests. Add a spinner with `hx-indicator`.
- **[MEDIUM]** `hx-trigger="every 1s"` for non-critical polling → continuous server load. Prefer Server-Sent Events (`hx-ext="sse"`) or WebSockets for real-time updates.
- **[LOW]** Large HTML fragments swapped on every request → send only the changed portion (fine-grained `hx-target`) to minimize re-render cost.

---

## Architecture

- **[HIGH]** Business logic embedded in server-side HTML fragment templates instead of controllers/services → templates become God templates. Keep templates as thin views; move logic to server handlers.
- **[MEDIUM]** Not using `hx-boost` on standard `<a>` and `<form>` elements → full page navigations where AJAX partial updates would work. `hx-boost` progressively enhances existing links.
- **[LOW]** `hx-target` pointing to a distant ancestor element by ID → fragile; layout changes break targeting. Prefer relative targets (`closest`, `next`, `previous`) or consistent ID conventions.

---

## Common Bugs & Pitfalls

- **[HIGH]** `hx-swap="outerHTML"` replacing the element that carries the `hx-*` attributes → after swap, the new HTML from the server must re-include `hx-*` attributes, or HTMX handlers are lost.
- **[HIGH]** `hx-trigger="load"` in a fragment returned by an HTMX swap → the fragment is loaded, triggers immediately, returns another fragment with `hx-trigger="load"` → infinite request loop.
- **[MEDIUM]** `hx-confirm` missing on destructive actions (delete, archive) → one misclick causes irreversible data loss. Add `hx-confirm="Are you sure?"`.
- **[LOW]** Missing `hx-push-url` on navigation-level swaps → browser back button does not restore previous state; breaks expected SPA-like navigation.
