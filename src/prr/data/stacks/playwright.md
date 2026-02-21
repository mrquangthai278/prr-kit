# Playwright / Cypress — E2E Testing Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `playwright.config.*` · `cypress.config.*` · `*.cy.js` / `*.cy.ts` · `*.spec.ts` with `page.goto` · `test(` + `expect(page` · `cy.` commands · `@playwright/test` in deps

---

## Security

- **[MEDIUM]** Hardcoded test credentials (username/password) in test files committed to version control → use environment variables or a secrets file excluded from git (`.env.test`).
- **[LOW]** Tests configured to hit a production URL → risk of accidentally mutating real data or polluting analytics. Enforce test URLs via config, never hardcode production.

---

## Performance

- **[HIGH]** `cy.wait(5000)` or `page.waitForTimeout(5000)` → arbitrary time-based waiting makes tests slow and flaky. Use network intercept assertions or element state conditions (`toBeVisible`, `waitForResponse`).
- **[HIGH]** All tests run serially in a single worker when parallelization is available → use Playwright's `--workers` option or Cypress Cloud for parallel runs.
- **[MEDIUM]** `beforeEach` not used for repeated setup (visiting a page, logging in) → duplicated setup code, slower suite if auth is done per-test via UI. Use `storageState` or session fixtures.
- **[LOW]** Large fixture files loaded in every test → load only what each test needs to minimize memory overhead.

---

## Architecture

- **[HIGH]** Tests depend on execution order → if tests share state (DB rows, local storage) without cleanup, a failed test breaks all subsequent tests. Each test must be independent and self-contained.
- **[HIGH]** Test data not cleaned up after test run → state pollution accumulates across runs. Use `beforeEach`/`afterEach` with API calls to reset state, or use isolated test databases.
- **[MEDIUM]** CSS selector coupling: `cy.get('.submit-btn')` or `page.locator('.btn-primary')` → breaks on any CSS refactoring. Use `data-testid` attributes or semantic locators (`getByRole`, `getByLabel`).
- **[MEDIUM]** No Page Object Model (POM) or custom command abstraction for complex flows → duplicated selectors and interactions across test files. Extract to page objects or custom commands.

---

## Code Quality

- **[HIGH]** Playwright `expect(locator)` assertion missing after `page.click()` / form submission → test passes even if the action had no visible effect. Always assert the resulting state.
- **[HIGH]** Cypress `cy.intercept` registered after `cy.visit` → the request may have already been sent before the intercept is in place. Register intercepts before navigation.
- **[MEDIUM]** `page.locator('text=Submit')` for button interaction → brittle text matching, breaks on copy changes and i18n. Use `getByRole('button', { name: 'Submit' })`.
- **[MEDIUM]** `test.only` or `it.only` or `cy.only` committed → runs only that test in CI, all other tests skipped silently.
- **[LOW]** Missing `test.describe` grouping → flat list of tests with no logical grouping, hard to navigate in reports.

---

## Common Bugs & Pitfalls

- **[HIGH]** Playwright `page.click()` on element inside a scrollable container without scrolling → element not in viewport; Playwright auto-scrolls but may fail if obscured. Use `scrollIntoViewIfNeeded()` or check visibility first.
- **[HIGH]** Cypress flakiness: element found and clicked before it's interactive (e.g., button that gets disabled/re-enabled) → add `should('not.be.disabled')` assertion before click.
- **[MEDIUM]** `expect(locator).toBeVisible()` vs `toBeInViewport()` confusion → `toBeVisible` checks CSS visibility (not covered by `overflow: hidden`); `toBeInViewport` checks screen position. Pick the right assertion for the intent.
- **[MEDIUM]** `page.waitForNavigation()` not awaited alongside `page.click()` on a link → navigation completes before `waitForNavigation` is set up. Use `Promise.all([page.waitForNavigation(), page.click(selector)])`.
- **[LOW]** Screenshot on failure not configured → CI failures produce no visual evidence. Configure `screenshot: 'only-on-failure'` in Playwright config.
