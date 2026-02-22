# jQuery — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `jquery`, `from 'jquery'`, `$.ajax`, `$(document).ready`, `$('#`, `jQuery` global, `<script src="jquery`

---

## Security
- **[CRITICAL]** `$(userInput)` used as a selector with user-controlled string → HTML injection / XSS if input contains tags. Treat user input as a string literal, never pass it to `$()` as a selector.
- **[CRITICAL]** `.html(userContent)` called with unsanitized user data → XSS allowing arbitrary script execution. Use `.text()` for plain content; sanitize with DOMPurify before calling `.html()`.
- **[CRITICAL]** `$.ajax` with `dataType: 'script'` loading a user-controlled URL → remote code execution. Never use `dataType: 'script'` with dynamic URLs; validate and whitelist all script sources.
- **[HIGH]** `$.ajax` response inserted into DOM via `.html()` without sanitization → stored XSS from server-returned HTML. Sanitize server responses before DOM insertion or use structured data (JSON) instead.
- **[HIGH]** CSRF token not included in `$.ajax` headers for state-changing requests → cross-site request forgery. Add CSRF token in `$.ajaxSetup` headers or per-request `headers` option.
- **[HIGH]** `eval()` or `new Function()` used inside jQuery callbacks with server data → code injection. Remove all dynamic code execution; parse JSON with `JSON.parse()` instead.

---

## Performance
- **[HIGH]** `$('.item')` queried repeatedly inside loops → O(n) DOM traversal per iteration. Cache the jQuery object in a variable before the loop: `const $items = $('.item')`.
- **[HIGH]** Event listeners attached to every element instead of using delegation → O(n) listeners for dynamic content. Use `.on('click', '.selector', handler)` on a stable parent for delegated events.
- **[HIGH]** Animations implemented with `setInterval`/`setTimeout` instead of CSS transitions or `requestAnimationFrame` → janky, CPU-heavy animation. Use CSS transitions or jQuery's `.animate()` which uses `requestAnimationFrame` internally.
- **[MEDIUM]** `$(document).ready` loading all JavaScript synchronously in `<head>` → render-blocking scripts. Move scripts to end of `<body>` or use `defer`/`async` attributes.
- **[MEDIUM]** `$.ajax` success callbacks deeply nested (callback hell) instead of `.then()` chaining → unmaintainable async flow. Chain `.then()` / `.done()` or convert to `async/await` with `fetch`.

---

## Architecture
- **[HIGH]** Global `$` / `jQuery` variable used alongside another library that also defines `$` → namespace collision. Use `jQuery.noConflict()` and alias: `const $j = jQuery.noConflict()`.
- **[HIGH]** Business logic (data transformation, validation) mixed directly into DOM manipulation callbacks → untestable, tightly coupled code. Extract logic into pure functions and call from callbacks.
- **[HIGH]** JS tightly coupled to DOM structure via deep selectors (`$('.page .sidebar ul li a')`) → breaks on any markup change. Use data attributes (`data-action="submit"`) as JS hooks instead of structural selectors.
- **[MEDIUM]** jQuery plugins added to `$.fn` without namespacing → risk of overwriting existing plugin. Namespace plugins: `$.fn.myAppPlugin = function() {}`.
- **[HIGH]** All code in global scope without module pattern → variable collisions and no encapsulation. Wrap in IIFE `(function($) { ... })(jQuery)` or use ES modules.

---

## Code Quality
- **[HIGH]** `$.ajax` calls without `.fail()` / `.catch()` error handler → silent failures, no user feedback. Always attach `.fail(function(jqXHR, status, error) { ... })` to every Ajax call.
- **[HIGH]** Undeclared variables inside jQuery callbacks → implicit globals polluting `window`. Always declare variables with `var`/`let`/`const`; enable `'use strict'`.
- **[MEDIUM]** Mixing `$.Deferred` with native `Promise` inconsistently → interop bugs (`.catch()` not available on Deferred). Standardize on native `Promise` / `fetch`; avoid `$.Deferred` in new code.
- **[MEDIUM]** Hardcoded DOM IDs with dynamic data (`#user-123`) as selectors → fragile, non-reusable code. Store references in data attributes and retrieve with `.data('id')`.
- **[LOW]** Deprecated jQuery APIs used (`.live()`, `.die()`, `.size()`, `.success()`) → runtime errors in jQuery 3+. Replace with modern equivalents: `.on()`, `.off()`, `.length`, `.done()`.

---

## Common Bugs & Pitfalls
- **[HIGH]** `.on()` handler attached inside a function called multiple times (e.g. on AJAX refresh) → handler fires multiple times per event. Use `.off('click').on('click', ...)` or attach handlers once on a stable parent.
- **[HIGH]** `$(this)` used inside an arrow function callback → `this` is lexically bound, not the jQuery element. Use `function()` keyword for jQuery callbacks that need `this`, or cache `$(event.currentTarget)`.
- **[MEDIUM]** `$(document).ready` nested inside another `$(document).ready` → double-wrapped handlers, potential double execution. Use a single top-level `$(document).ready` or `$(function() { })`.
- **[MEDIUM]** `.val()` vs `.text()` vs `.html()` confused for reading input values → wrong value or empty string returned. Use `.val()` for form inputs, `.text()` for element text content, `.html()` for inner HTML.
- **[MEDIUM]** Detached DOM nodes holding references via jQuery's internal data store → memory leak in single-page flows. Call `.remove()` (not `.detach()`) for nodes that won't be re-attached, or manually call `.off()` and `$.removeData()`.
