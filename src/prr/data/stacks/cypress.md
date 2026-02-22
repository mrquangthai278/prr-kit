# Cypress — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `cypress`, `cy.visit(`, `cy.get(`, `cy.intercept(`, `cypress.config.*`, `describe(` in `cypress/`

---

## Security
- **[HIGH]** Hardcoded test credentials in Cypress test files committed to the repository → credentials exposed in version control and CI logs. Use `Cypress.env()` with environment variables injected at CI time; store secrets in your CI secret manager.
- **[HIGH]** `cy.request()` calling authenticated API endpoints without proper auth token setup → tests may inadvertently call real external services or bypass auth unexpectedly. Always set the auth token via `cy.session()` or `Authorization` header in `cy.request()` explicitly.
- **[MEDIUM]** Secrets placed in `cypress.env.json` and committed to the repository → sensitive values in version control. Add `cypress.env.json` to `.gitignore` and inject values via CI environment variables only.
- **[MEDIUM]** Test data including PII from seeded users not cleaned up after test runs → leftover PII accumulates in the staging database. Add an `afterEach` or `after` hook that deletes or resets test data via a `cy.task()` DB call.
- **[LOW]** `chromeWebSecurity: false` set in `cypress.config` to allow cross-origin requests → disables browser same-origin protections, letting cross-origin attacks go undetected. Remove `chromeWebSecurity: false` and use `cy.origin()` for legitimate cross-origin testing.

---

## Performance
- **[HIGH]** `cy.wait(5000)` hard-coded time waits instead of waiting on network requests → tests are slow and flaky; the wait may not be enough on slow CI. Replace with `cy.intercept()` aliases and `cy.wait('@aliasName')` to wait for the actual request.
- **[HIGH]** `cy.session()` not used for authentication state → login UI flow executed on every test, adding seconds per test. Cache login state with `cy.session('user', loginFn)` so auth is established once per session.
- **[HIGH]** `cy.visit()` called for every test when tests could share a single page load → full navigation and app initialization overhead per test. Visit once in `before()` and reset state between tests without full reloads where possible.
- **[MEDIUM]** `cy.get('.selector')` traversing the entire DOM when a scoped query is possible → selector resolution slows on large DOMs. Chain `.within()` to scope: `cy.get('#parent').within(() => { cy.get('button') })`.
- **[MEDIUM]** `cy.task()` not used for database seeding → seeding done via UI or `cy.request()`, which depends on the app being fully functional. Use `cy.task('db:seed', data)` to insert directly into the DB via Node.js.
- **[LOW]** Screenshots and videos enabled in CI without artifact retention policy → disk fills up and artifact uploads slow pipelines. Set `video: false` in CI and enable `screenshotOnRunFailure: true` only.

---

## Architecture
- **[HIGH]** Selectors based on CSS classes or visible text → tests break whenever the UI is restyled or copy changes. Use `data-cy` attributes: `cy.get('[data-cy="submit-button"]')`.
- **[HIGH]** Repeated auth, navigation, or interaction logic not extracted to custom commands → duplication across tests; one UI change breaks dozens. Extract sequences to `Cypress.Commands.add('login', ...)`.
- **[MEDIUM]** Tests not organized by feature or page → test files become hundreds of lines, slow to scan. Organize into subdirectories: `cypress/e2e/auth/login.cy.ts`, `cypress/e2e/dashboard/overview.cy.ts`.
- **[MEDIUM]** Cypress commands chained after native Promises without returning the Cypress chain → commands run out of order. Always return the Cypress chain from inside `.then()` callbacks; avoid mixing native Promises with Cypress commands.
- **[MEDIUM]** No page object pattern for complex multi-step user flows → test code directly manipulates selectors; refactoring requires editing every test. Create helper functions or custom commands that encapsulate multi-step flows.
- **[LOW]** Cypress configuration not split into base config plus environment-specific overrides → CI and local configs are identical; developers must manually change settings. Use `defineConfig` with environment-specific override files.

---

## Code Quality
- **[HIGH]** `cy.get(sel).then(el => cy.get(sel2))` anti-pattern instead of `.within()` → creates unnecessary nested chains that are hard to read. Use `cy.get('#container').within(() => { cy.get('button').click() })`.
- **[HIGH]** Assertions missing from tests → test passes even when the feature is broken because no assertion checks the expected state. Every test must end with at least one `.should()` assertion verifying the intended UI state.
- **[MEDIUM]** `.should('be.visible')` not asserted before interacting with an element → Cypress may try to click a hidden or detached element, causing flaky failures. Use `cy.get(sel).should('be.visible').click()`.
- **[MEDIUM]** Test data hardcoded inline instead of using fixtures → same data duplicated across tests; changing it requires editing multiple files. Extract to `cypress/fixtures/` JSON files and load with `cy.fixture()`.
- **[MEDIUM]** No TypeScript types for custom commands in `cypress/support/index.d.ts` → custom commands typed as `any`; autocomplete absent. Extend the `Chainable` interface with type declarations for every custom command.
- **[LOW]** No Cypress lint rules (eslint-plugin-cypress) configured → Cypress-specific anti-patterns not caught automatically. Add `eslint-plugin-cypress` with the recommended rule set to the ESLint config.

---

## Common Bugs & Pitfalls
- **[HIGH]** `cy.get()` matching multiple elements when only one is expected → Cypress acts on the first match silently; tests pass against the wrong element. Assert `.should('have.length', 1)` or use a more specific selector.
- **[HIGH]** Async code (Promises, async/await) in `before()` or `beforeEach()` without returning the Cypress chain → setup completes after tests begin; state is missing when tests run. Return the Cypress chain from setup hooks or use `cy.wrap(promise)`.
- **[MEDIUM]** `cy.intercept()` alias defined after `cy.visit()` → network request fires before intercept is registered; alias never resolves. Always define `cy.intercept()` aliases before `cy.visit()` or the action that triggers the request.
- **[MEDIUM]** `cy.contains()` matching hidden text nodes (e.g., inside a tooltip or offscreen element) → test passes but the visible text the user sees is different. Add `.should('be.visible')` after `cy.contains()`.
- **[MEDIUM]** "detached from DOM" error when an element re-renders between `cy.get()` and the subsequent action → element reference becomes stale after React or Vue re-render. Re-query the element inside `.then()` after re-render-triggering actions.
- **[LOW]** `cy.clock()` and `cy.tick()` not restored after tests that manipulate timers → fake clock bleeds into subsequent tests causing unexpected timing behavior. Call `cy.clock().then(c => c.restore())` in `afterEach`.
