# Lit (Web Components) — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from 'lit'`, `from 'lit/decorators'`, `LitElement`, `@customElement`, `` html` ``, `` css` ``, `*.ts` with `customElements.define`

---

## Security
- **[CRITICAL]** `unsafeHTML()` directive used with user-controlled content → XSS allowing arbitrary script injection into shadow DOM. Sanitize with DOMPurify before passing to `unsafeHTML()`, or use safe text interpolation `${userContent}`.
- **[HIGH]** `unsafeCSS()` used with user-supplied style strings → CSS injection enabling UI redressing or data exfiltration via CSS selectors. Only use `unsafeCSS()` with static developer-controlled strings; never with user input.
- **[HIGH]** Event listeners added to `window` or `document` in `connectedCallback` without removal in `disconnectedCallback` → memory leak and ghost event handlers after element removal. Always mirror `addEventListener` in `connectedCallback` with `removeEventListener` in `disconnectedCallback`.
- **[MEDIUM]** Sensitive data reflected to HTML attributes via `@property({ reflect: true })` → PII exposed in DOM and queryable by third-party scripts. Set `reflect: false` (the default) for sensitive properties; only reflect non-sensitive state needed for CSS selectors.
- **[MEDIUM]** Missing Content Security Policy allowing inline scripts in pages with custom elements → CSP bypass via attribute injection. Define a strict CSP and use nonce-based script allowlisting.

---

## Performance
- **[HIGH]** Entire template re-rendered when only one property changes due to no `guard()` directive on expensive subtrees → unnecessary DOM diffing. Wrap expensive static subtrees with the `guard(deps, () => html\`...\`)` directive.
- **[MEDIUM]** `@state` not used for internal reactive properties; `@property` used instead → unnecessary attribute serialization and reflection on every change. Use `@state()` for properties that are internal implementation details not needed as attributes.
- **[MEDIUM]** Heavy DOM trees in `render()` without using `repeat()` directive for lists → full list re-render instead of efficient keyed updates. Use `repeat(items, item => item.id, item => html\`...\`)` for keyed list rendering.
- **[MEDIUM]** `willUpdate` / `updated` lifecycle hooks not used to avoid redundant computations triggered per property change → computed values recalculated on every render. Derive expensive computations in `willUpdate` only when relevant properties change.
- **[LOW]** Full `lit` package imported instead of specific entry points (`lit/html.js`, `lit/decorators.js`) → larger-than-necessary bundle. Import from specific Lit subpaths to enable tree-shaking.

---

## Architecture
- **[HIGH]** Business logic (API calls, data transformation) placed directly inside `LitElement` class methods → components become fat controllers, untestable in isolation. Extract to service classes or plain functions; inject via constructor or properties.
- **[HIGH]** Deep shadow DOM nesting (custom elements inside custom elements, 4+ levels) makes CSS theming require many CSS custom properties → hard to maintain design tokens. Flatten component hierarchy where possible; define a comprehensive set of CSS custom properties at component boundaries.
- **[MEDIUM]** Content projection not used via `<slot>`; instead content is passed as properties → tight coupling between parent and child markup. Use named `<slot>` elements for flexible content composition.
- **[MEDIUM]** Custom events not typed with `CustomEvent<TDetail>` and not documented → consumers have no type safety for event payloads. Type all dispatched events and document them in the component's API surface.
- **[MEDIUM]** `@property({ reflect: true })` on boolean attributes not using the `type: Boolean` converter → `false` reflected as the string `"false"` which is truthy in CSS attribute selectors. Always include `type: Boolean` for boolean properties that reflect.

---

## Code Quality
- **[HIGH]** Properties updated reactively without declaring them with `@property` or `@state` → Lit does not schedule re-render, UI goes stale. Every reactive property must be declared with `@property()` or `@state()`.
- **[MEDIUM]** `this.shadowRoot.querySelector(...)` used instead of `@query` decorator → verbose, non-typed DOM reference. Use `@query('#my-input') input!: HTMLInputElement` for typed, cached element references.
- **[MEDIUM]** `@customElement('my-el')` decorator and manual `customElements.define('my-el', MyEl)` both present → double registration error. Use only one registration method; prefer `@customElement` decorator.
- **[MEDIUM]** `:host` CSS incorrectly used for internal element styling instead of targeting internal selectors → styles leak or don't apply as expected. Use `:host` only for the host element itself; use internal class/element selectors for children.
- **[LOW]** `static styles` defined per instance using `css\`\`` inside a function → styles recreated every instantiation. Define `static styles` as a static class field evaluated once.

---

## Common Bugs & Pitfalls
- **[HIGH]** DOM-dependent initialization code placed in `connectedCallback` before first render completes → element not yet in DOM, `this.shadowRoot` children may not exist. Use `firstUpdated()` for code that needs the rendered shadow DOM.
- **[HIGH]** `@property` type converter mismatch — string attribute `"false"` not converting to boolean `false` → attribute is truthy when component expects `false`. Declare `type: Boolean` and use presence/absence of attribute rather than its value.
- **[HIGH]** Custom events not dispatched with `composed: true` → events don't cross shadow DOM boundaries and parent listeners never fire. Dispatch cross-boundary events with `new CustomEvent('name', { bubbles: true, composed: true })`.
- **[MEDIUM]** Shadow DOM breaking third-party CSS libraries (Bootstrap, Tailwind) that style by global class → styles not applied inside shadow root. Use CSS custom properties for theming or `adoptedStyleSheets` to share styles; document the limitation.
- **[MEDIUM]** Lit template caching with keyed `repeat()` using non-stable keys (array index) → DOM nodes reused incorrectly on list reorder. Always use stable, unique identifiers (IDs) as keys in `repeat()`.
