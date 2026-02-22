# Playwright / Cypress Stack Rules

Detection signals: `playwright.config.*`, `cypress.config.*`, `*.cy.js` / `*.cy.ts`, `*.spec.ts` with `page.goto`, `test(` + `expect(page`, `cy.` commands, `@playwright/test` in deps, `cypress` in deps

---

## Security

- **[HIGH]** Hardcoded test credentials (passwords, API keys, tokens) in test files committed to VCS → secrets in git history are permanent. Use environment variables or a `.env.test` file excluded from git via `.gitignore`.
- **[HIGH]** Tests hitting a production URL or production API endpoints → risk of mutating real data, polluting analytics, triggering real emails, or billing real users. Enforce a test-only base URL in config and assert on startup.
- **[HIGH]** Tests running as highly privileged users (admin, root) for all scenarios → permission bugs are invisible when every test bypasses authorization. Create role-specific test users and test each role explicitly.
- **[MEDIUM]** Auth tokens or session cookies stored in Playwright `storageState` files committed to VCS → valid session tokens leak in git history. Add all `storageState` and `.auth/` files to `.gitignore`.
- **[MEDIUM]** Test user with admin privileges used for all tests → over-privileged tests hide permission and RBAC bugs. Create role-specific test accounts and verify access control boundaries explicitly.
- **[MEDIUM]** Test videos or screenshots containing sensitive data (PII, tokens in URLs) uploaded to public CI artifacts → data exposure in artifact storage visible to all repo members. Restrict artifact visibility or scrub sensitive fields before capture.
- **[LOW]** No IP or domain allowlist on test environment → anyone with the test URL can interact with the system during a test run. Restrict access by IP or require auth even on test environments.
- **[LOW]** Using real third-party OAuth flow in tests → tests depend on external identity provider availability; tokens may have unintended side effects. Use a mock OAuth server or pre-issued test tokens.
- **[LOW]** Not revoking or rotating test credentials after a CI breach → long-lived test credentials become attack vectors. Rotate test credentials on the same schedule as production secrets.
- **[LOW]** Browser contexts sharing cookies across test files in the same worker → cross-test auth state pollution causes intermittent failures. Always create a fresh browser context per test or use `test.use({ storageState: undefined })`.

---

## Performance

- **[CRITICAL]** `page.waitForTimeout(5000)` / `cy.wait(5000)` arbitrary sleeps in tests → tests are slow by a hardcoded amount and still flaky because the wait may be insufficient. Replace with `waitForResponse`, `waitForSelector`, or `expect(locator).toBeVisible()`.
- **[HIGH]** All tests running serially in a single worker → no parallelism; suite time scales linearly with test count. Use Playwright `--workers=4` or configure Cypress Cloud parallel execution.
- **[HIGH]** Logging in via the UI form in every test → login flow is slow (300-1000ms), depends on UI stability, and adds flakiness. Cache authenticated state with Playwright `storageState` or Cypress `cy.session()` and reuse across tests.
- **[HIGH]** Not reusing browser contexts across related tests → expensive browser context creation dominates test time. Use `test.use({ storageState })` and group tests that share auth state into the same file.
- **[HIGH]** No network interception to stub slow external APIs → tests wait for real API latency (100-2000ms per call). Use `page.route()` (Playwright) or `cy.intercept()` (Cypress) to return instant mock responses.
- **[MEDIUM]** Large fixture JSON files loaded in every test regardless of need → memory overhead and slower test initialization. Load only the subset of fixture data relevant to each test.
- **[MEDIUM]** No test sharding across CI machines → single-machine bottleneck means full suite runs on one agent. Use Playwright `--shard=1/4` flags or Cypress Cloud to distribute across agents.
- **[MEDIUM]** Capturing screenshots on every step rather than only on failure → disk I/O and artifact upload time wasted on passing tests. Set `screenshot: 'only-on-failure'` in config.
- **[MEDIUM]** Missing `baseURL` in config → full URLs hardcoded in every test are fragile on environment change. Set `baseURL` in `playwright.config.ts` and use relative paths in tests.
- **[LOW]** Not enabling Playwright trace files for debugging CI failures → binary search through logs is the only way to diagnose flaky CI failures. Enable `trace: 'on-first-retry'` in playwright.config.
- **[LOW]** Not using route interception to block slow third-party scripts → page load time inflated by analytics, ads, or chat widgets. Intercept and abort those requests in a global setup fixture.
- **[LOW]** Reinitializing test data via the UI instead of via direct API calls → slow and brittle data setup. Seed test data through API calls or database seed scripts in `beforeEach`.

---

## Architecture

- **[HIGH]** Tests depend on execution order -- later tests assume prior tests left the app in a specific state → shared DB state causes cascade failures when any test fails or runs in isolation. Each test must be independently self-contained.
- **[HIGH]** Test data not cleaned up between runs → state accumulates across runs causing intermittent failures. Use `beforeEach`/`afterEach` API cleanup, isolated test databases, or database snapshots restored per run.
- **[HIGH]** Selectors based on CSS classes (`.submit-btn`, `.btn-primary`) or auto-generated class names → breaks on any CSS refactoring or build tool change. Use `data-testid` attributes or semantic locators (`getByRole`, `getByLabel`).
- **[HIGH]** No Page Object Model or fixture abstraction for complex multi-step flows → duplicated selectors and navigation logic across files; one selector change requires global search-and-replace. Extract to page objects or Playwright fixtures.
- **[MEDIUM]** Test assertions missing after user actions (click, form submit, navigation) → test passes even if the action had no visible effect. Always assert the resulting state: URL changed, element appeared, data updated.
- **[MEDIUM]** Network route interception registered after the navigation that triggers the request → the request fires before the intercept is in place, so it hits the real server. Always register `page.route()` or `cy.intercept()` before `page.goto()` or `cy.visit()`.
- **[MEDIUM]** Test data created via UI flows instead of API calls → slow, brittle, and dependent on other UI features. Create prerequisite data via API calls in `beforeEach`; only test the feature under test through the UI.
- **[MEDIUM]** No explicit test environment configuration or assertion that tests are running against the correct environment → tests silently run against the wrong environment. Assert `baseURL` or environment flag in a global setup.
- **[MEDIUM]** Hard-coded waits used as a substitute for proper synchronization strategy → entire team copies the pattern, leading to an ever-growing suite of sleeping tests. Establish a team convention: always use locator-based assertions.
- **[LOW]** Missing `test.describe` grouping in large test files → flat list of 50+ tests is hard to navigate in reports and difficult to run selectively. Group by feature or user flow.
- **[LOW]** Not using Playwright fixtures for shared setup and teardown logic → `beforeEach` duplication across files drifts over time. Extract shared setup to typed Playwright fixtures.
- **[LOW]** No visual regression testing for critical UI components → layout regressions pass all functional tests. Add `expect(page).toHaveScreenshot()` for key screens with defined threshold.

---

## Code Quality

- **[CRITICAL]** No assertion after a user interaction (click, type, submit) → test passes even if the action had no effect or caused an error. Always assert the resulting observable state after every meaningful action.
- **[HIGH]** `cy.intercept` registered after `cy.visit` → the request is already in flight before the intercept; the stub is never used. Always register intercepts before the navigation that triggers the request.
- **[HIGH]** `test.only` / `it.only` / `cy.only` committed to the repository → all other tests are silently skipped in CI. Use grep patterns (`--grep`) for focused local runs; never commit `.only`.
- **[HIGH]** Hardcoded waits (`cy.wait(3000)`, `page.waitForTimeout`) replacing proper assertions → brittle and slow. Replace with `expect(locator).toBeVisible()` or `cy.contains(text).should(be.visible)`.
- **[MEDIUM]** `page.locator('text=Submit')` used for button interaction → brittle text matching that breaks on i18n and copy changes. Use `getByRole('button', { name: 'Submit' })` instead.
- **[MEDIUM]** Not using Playwright auto-retry assertions → manually polling or using `waitFor` loops instead of built-in retry. Use `expect(locator).toBeVisible({ timeout: 5000 })` which retries automatically.
- **[MEDIUM]** Missing retry configuration for tests that cover genuinely flaky network behavior → one-off network hiccups cause CI failures. Add `retries: 2` in playwright.config for specific projects.
- **[MEDIUM]** Assertions without meaningful failure messages → failures show raw selector strings with no context about expected behavior. Add `{ message: 'expected X after clicking Y' }` to assertion options.
- **[MEDIUM]** Not grouping related tests in `test.describe` → flat test files are hard to navigate in HTML reports and difficult to run selectively. Group by user story or page section.
- **[LOW]** Screenshot on failure not configured → no visual evidence of what the page looked like when a CI test failed. Add `screenshot: 'only-on-failure'` to playwright.config.
- **[LOW]** Not using Playwright codegen to record baseline selectors → hand-written selectors are error-prone. Record the flow with `npx playwright codegen` then refine the generated selectors.
- **[LOW]** Missing `expect.soft` for non-critical assertions in the same test → first failing assertion aborts the test; later assertions never run. Use `expect.soft` for independent checks in the same scenario.

---

## Common Bugs & Pitfalls

- **[HIGH]** `page.click()` on an element not in the viewport → click lands on a different element or fails silently. Playwright auto-scrolls in most cases, but verify with `expect(locator).toBeInViewport()` before asserting click effect.
- **[HIGH]** Clicking a button that is briefly disabled then re-enabled without waiting for the enabled state → race condition causes click on disabled element with no effect. Add `.should('not.be.disabled')` (Cypress) or `expect(btn).toBeEnabled()` (Playwright) before clicking.
- **[HIGH]** Missing `Promise.all` wrapping `page.waitForNavigation` and `page.click` → the navigation event fires before the wait is registered, causing the test to hang. Always use `Promise.all([page.waitForNavigation(), page.click(locator)])`.
- **[HIGH]** Cypress command subject lost after `.then()` → the subject chain resets inside `.then()`; chaining commands after it acts on the wrong subject. Store the result in a variable or use `.wrap()` to re-enter the Cypress chain.
- **[MEDIUM]** Confusing `toBeVisible()` with `toBeInViewport()` → `toBeVisible()` checks CSS display/visibility properties; the element may be off-screen and still pass. Use `toBeInViewport()` when you need to assert the element is on screen.
- **[MEDIUM]** Playwright `context.newPage()` not closed in test teardown → browser contexts accumulate in long test runs, consuming memory and file descriptors. Always call `page.close()` or `context.close()` in `afterEach`.
- **[MEDIUM]** Cypress fixture file path resolved relative to `cypress/fixtures` not the project root → wrong path causes file-not-found errors that are hard to diagnose. Always prefix with the fixture directory structure.
- **[MEDIUM]** Playwright `page.evaluate()` called with a non-serializable argument (class instance, function, Map) → the argument is silently dropped or causes a serialization error. Only pass JSON-serializable values to `page.evaluate()`.
- **[MEDIUM]** Not accounting for animations or transitions delaying element interactability → click or assertion fires while the element is mid-transition. Use `page.waitForFunction` or CSS transition duration in test environment set to 0.
- **[LOW]** Missing `{ failOnStatusCode: false }` when testing 4xx or 5xx responses in Cypress → Cypress fails the test on non-2xx status before any assertion runs. Pass `{ failOnStatusCode: false }` to `cy.request()`.
- **[LOW]** Not using Playwright `codegen` to record baseline user flows → hand-writing selectors is error-prone. Run `npx playwright codegen <url>` to auto-generate a starting test, then clean up.
- **[LOW]** Flaky tests marked as skipped or retried instead of fixed → retry masks systemic issues; skipped tests reduce coverage silently. Investigate root cause; fix race conditions or add proper wait conditions.
