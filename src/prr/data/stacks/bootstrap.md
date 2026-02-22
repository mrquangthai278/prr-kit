# Bootstrap — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `bootstrap`, `from 'bootstrap'`, `class="btn`, `class="container`, `data-bs-`, `navbar-`, `modal`, `bootstrap.bundle`

---

## Security
- **[HIGH]** Bootstrap tooltip or popover initialized with `html: true` and content sourced from user input → XSS via `data-bs-content`, `data-bs-title`, or the `content` option. Set `html: false` (default) and encode all user content before use; sanitize with DOMPurify if HTML is required.
- **[HIGH]** Bootstrap JavaScript loaded from a public CDN without a Subresource Integrity (SRI) hash → compromised CDN serves malicious script. Add `integrity` and `crossorigin="anonymous"` attributes to all CDN `<script>` and `<link>` tags.
- **[MEDIUM]** Modal body dynamically populated via `innerHTML` with unencoded user data → XSS inside the modal. Use `textContent` for user data or sanitize with DOMPurify before inserting into modal content.
- **[MEDIUM]** Bootstrap's sanitizer (`allowList`) not configured when using `html: true` → default allowlist may permit dangerous attributes. Review and restrict the `allowList` to only the HTML tags and attributes your application requires.
- **[LOW]** Form `action` or `href` attributes dynamically constructed from user input in Bootstrap form components → open redirect or injection. Validate and encode all dynamic URL values used in Bootstrap component attributes.

---

## Performance
- **[HIGH]** Entire Bootstrap bundle imported `import 'bootstrap'` instead of only the required components → full ~150KB JS bundle loaded even when only a few components are used. Import specific components: `import { Modal } from 'bootstrap'` or use tree-shaking-friendly imports.
- **[HIGH]** Bootstrap CSS not purged of unused styles in production → Bootstrap's full CSS is ~230KB; most projects use under 20% of it. Configure PurgeCSS or the Sass `@use` per-component approach to include only used styles.
- **[MEDIUM]** Bootstrap utility classes (`d-none`, `d-block`) toggled via JavaScript for show/hide animations → no CSS transitions, jarring UX. Use Bootstrap's built-in transition utilities or `collapse`/`fade` classes with the JavaScript component API.
- **[MEDIUM]** Bootstrap CSS custom properties not leveraged for theming → overriding compiled Bootstrap CSS with higher-specificity rules. Use Bootstrap's CSS custom property overrides (`--bs-primary`, `--bs-font-size-base`) in `:root` instead of overriding classes.
- **[MEDIUM]** `bootstrap.bundle.min.js` (includes Popper) loaded when Popper is also imported separately → Popper loaded twice, increasing bundle size and causing potential conflicts. Use `bootstrap.min.js` (without Popper) if Popper is managed separately.
- **[LOW]** Bootstrap grid mixed with custom CSS Grid or Flexbox on the same container → layout conflicts from competing systems. Pick one layout system per container; use Bootstrap grid OR custom CSS, not both on the same element.

---

## Architecture
- **[HIGH]** Bootstrap JavaScript component initialized multiple times on the same DOM element → duplicate event listeners causing double modal opens, double tooltips, or broken dismiss behavior. Check for an existing instance with `bootstrap.Modal.getInstance(el)` before calling `new bootstrap.Modal(el)`.
- **[MEDIUM]** Bootstrap default classes overridden with higher-specificity custom selectors (`.btn.btn-primary { ... }`) → specificity arms race making future Bootstrap upgrades painful. Use Bootstrap's SCSS variable/map customization system at build time rather than overriding compiled CSS.
- **[MEDIUM]** Bootstrap SCSS not customized via its provided variables and maps → colors, spacing, and breakpoints duplicated in custom CSS. Import Bootstrap SCSS after overriding `_variables.scss` values to customize via the source.
- **[MEDIUM]** JavaScript component lifecycle not managed (not destroyed before re-initialization) → stale component instances accumulate in single-page applications during navigation. Destroy components with `instance.dispose()` before removing their DOM elements.
- **[LOW]** Bootstrap 4 data attributes (`data-toggle`, `data-target`) used in a Bootstrap 5 project → components silently fail to initialize in Bootstrap 5 which uses `data-bs-toggle`, `data-bs-target`. Audit all `data-` attributes and update to the `data-bs-*` namespace.

---

## Code Quality
- **[HIGH]** Interactive Bootstrap components (modals, dropdowns, accordions) missing required ARIA attributes (`aria-expanded`, `aria-controls`, `role`) → screen readers cannot navigate or announce component state. Follow Bootstrap's documented accessibility markup for each component type.
- **[MEDIUM]** Non-`<button>` elements (e.g., `<div>`, `<a>`) used as interactive Bootstrap triggers without `role="button"` and `tabindex="0"` → keyboard navigation broken, not focusable. Use `<button>` for all click-triggered Bootstrap interactions, or add required ARIA and keyboard event handlers.
- **[MEDIUM]** Bootstrap CSS loaded from both CDN (in HTML `<head>`) and npm (via bundler) simultaneously → styles applied twice, specificity becomes unpredictable. Choose one loading strategy; prefer npm + bundler for projects that build a bundle.
- **[MEDIUM]** Bootstrap JS components controlled via jQuery's `$().modal()` API in a Bootstrap 5 project → Bootstrap 5 dropped jQuery; the jQuery API does not exist. Use the vanilla JS API: `new bootstrap.Modal(el).show()`.
- **[LOW]** Bootstrap icons or images referenced by hardcoded CDN paths in templates → broken assets after CDN changes or in offline environments. Host assets locally or configure asset paths via the build system.

---

## Common Bugs & Pitfalls
- **[HIGH]** Modal appearing behind a fixed or sticky navbar due to `z-index` conflict → modal backdrop covers the navbar but the modal itself renders below it. Set the modal's `z-index` above the navbar, or move the modal to a direct child of `<body>` to escape stacking context issues.
- **[HIGH]** `data-bs-dismiss="modal"` placed on a non-interactive element that does not receive focus or click events correctly → close button appears but does not function. Ensure `data-bs-dismiss` is placed on a `<button>` element inside the modal.
- **[MEDIUM]** Bootstrap's `position: relative` on `.container` or `.row` breaking `position: fixed` children → fixed elements position relative to the container instead of the viewport. Remove `position: relative` from ancestor containers or restructure the DOM so fixed elements are direct children of `<body>`.
- **[MEDIUM]** Form validation class `was-validated` added to the `<form>` element before the user attempts submission → browser validation errors shown immediately on page load. Only add `was-validated` after a submit attempt; listen for the `submit` event before toggling the class.
- **[MEDIUM]** Bootstrap collapse component target has an `id` that does not match the `data-bs-target` value → accordion or collapse silently fails to open/close. Verify that `data-bs-target="#myId"` exactly matches `id="myId"` on the collapsible element.
- **[LOW]** Tooltip not initialized via `new bootstrap.Tooltip(element)` → elements with `data-bs-toggle="tooltip"` do not activate automatically; Bootstrap 5 requires explicit JS initialization. Initialize all tooltips with `document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el))`.
- **[LOW]** Bootstrap responsive breakpoint classes (`col-md-6`) used without understanding the mobile-first cascade → desktop layout applied at all sizes because `col-` (xs) not set. Always define the smallest breakpoint first and add larger breakpoint classes to override upward.
