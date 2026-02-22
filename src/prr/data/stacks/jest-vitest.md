# Jest / Vitest Stack Rules

Detection signals: `jest.config.*`, `vitest.config.*`, `*.test.ts/js`, `*.spec.ts/js`, `describe(`, `it(`, `test(`, `expect(`, `vi.fn()`, `jest.fn()`, `@jest/globals`, `vitest`

---

## Security

- **[MEDIUM]** Snapshot files containing hardcoded secrets or tokens committed to VCS → secrets leak in public or team-visible snapshot files. Sanitize sensitive values before serializing, or use a custom serializer that redacts known patterns.
- **[MEDIUM]** Test setup files importing real credentials or production config files → tests may inadvertently exfiltrate data or connect to live systems. Use mock credentials and dedicated test environment variables; never import `.env.production` in tests.
- **[MEDIUM]** Using real encryption keys, JWTs, or signed tokens as test fixtures → valid credentials in VCS are a secret leak. Generate synthetic, non-functional tokens for all test fixtures.
- **[MEDIUM]** Tests that write to the real filesystem without cleanup → leftover files may contain sensitive test payloads. Use `os.tmpdir()` and always delete in `afterEach`; or mock `fs` with `memfs`.
- **[MEDIUM]** Database tests connecting to shared or staging environments → test mutations affect real data. Use a dedicated test database, Docker container, or in-memory alternative per CI run.
- **[LOW]** `vi.mock()` / `jest.mock()` bypassing security middleware or auth guards in integration tests → tests verify code paths that would be blocked in production. Thread auth through proper test interfaces; use authenticated test clients.
- **[LOW]** `process.env` values from CI leaked via verbose test reporters → environment dumps in logs expose secrets. Suppress full environment output; use the `--silent` flag in CI.
- **[LOW]** Coverage reports uploaded to public artifact stores containing source snippets → source code in coverage HTML exposes logic. Restrict artifact access in CI settings.
- **[LOW]** Mocked network responses containing real PII from recorded fixtures (e.g., VCR-style recordings) → personal data in VCS. Anonymize fixtures before committing.
- **[LOW]** Tests importing from `src/config` that reads from `.env` at import time → production config leaks into test scope. Use dependency injection or mock the config module.

---

## Performance

- **[HIGH]** Real timers (`setTimeout`, `setInterval`, `Date.now`) in tests without `vi.useFakeTimers()` / `jest.useFakeTimers()` → tests wait real wall-clock time, making the suite slow and flaky. Call fake timers in `beforeEach` and restore in `afterEach`.
- **[HIGH]** Real HTTP calls in unit tests → tests depend on network availability, are slow, and non-deterministic. Mock with `msw` (Mock Service Worker) for realistic interception or `vi.mock` for simple cases.
- **[HIGH]** Heavy or async setup in `beforeAll` shared across unrelated test groups → test isolation breaks and suites cannot be parallelised independently. Use `beforeEach` for per-test setup; reserve `beforeAll` for truly immutable shared resources.
- **[HIGH]** Not isolating the module registry between tests → module-level state bleeds across tests within the same file. Call `vi.resetModules()` or `jest.resetModules()` in `beforeEach` when modules hold singleton state.
- **[HIGH]** Not using `--testPathPattern` or `test.only` during development → entire suite runs on every local change, slowing feedback. Use `--watch` with pattern filtering; use `test.only` locally (but never commit it).
- **[MEDIUM]** Large fixture files loaded entirely into memory for every test → memory pressure spikes. Load only the required subset per test or stream large fixtures.
- **[MEDIUM]** Missing parallelism configuration in Vitest → default pool settings may not saturate CPU cores. Configure `pool: forks` or `pool: threads` and set `poolOptions.maxForks` to match available cores.
- **[MEDIUM]** Missing `--coverage --coverageThreshold` enforcement in CI → coverage degrades silently over time. Add thresholds in `jest.config` / `vitest.config` and fail CI when they drop.
- **[MEDIUM]** Importing from barrel files (`src/index.ts`) in tests → pulls in the entire module graph, inflating startup time. Import directly from the source module that contains the code under test.
- **[MEDIUM]** Not using `test.each` for parameterized inputs → duplicated test bodies are slower to write and maintain. Use `test.each([...])` with a tagged template or array of tuples.
- **[LOW]** Running the full test suite locally instead of affected-only → slow feedback loop on large repos. Use `--changed` (Jest) or Vitests `--related` flag to run only tests affected by modified files.
- **[LOW]** Generating large coverage reports (LCOV + HTML + JSON) on every local run → unnecessary disk I/O. Restrict full report generation to CI; use `--reporter=dot` locally.

---

## Architecture

- **[HIGH]** Testing implementation details -- calling private methods, asserting internal state, spying on module-internal functions → tests break on safe refactors with no behavior change. Test only public API and observable outcomes.
- **[HIGH]** Tests depending on another tests side effects -- shared mutable state, relying on execution order → flaky suite that fails when run in isolation or in parallel. Use `beforeEach` to reset all shared state; each test must arrange its own preconditions.
- **[HIGH]** Mocking the module under test itself → the test validates the mock, not the real code. Mock only external dependencies; never mock the system under test.
- **[HIGH]** Over-mocking -- replacing things that could be tested with in-memory fakes (in-memory SQLite, fake queue, stub service) → low-confidence tests that do not catch integration bugs. Prefer real or realistic in-memory implementations over mocks where feasible.
- **[HIGH]** No test coverage for error paths, edge cases, empty collections, null/undefined inputs, and boundary values → bugs hidden in untested code paths. Enumerate edge cases explicitly; use code coverage to identify gaps.
- **[MEDIUM]** Single test file exceeding 500 lines → hard to navigate and review. Split by feature, component, or scenario into focused files.
- **[MEDIUM]** Single `it` / `test` block containing more than 10-15 assertions → unclear which assertion failed and why the test exists. Split into focused tests each verifying one behavior.
- **[MEDIUM]** Test names using vague descriptions such as `it('works')` or `test('test1')` → intent is invisible in failure reports. Use Given/When/Then or should-behavior-when-condition naming.
- **[MEDIUM]** No test isolation for database-touching integration tests → cross-test contamination corrupts later tests. Wrap each test in a transaction rolled back in `afterEach`, or reset with a seed script.
- **[MEDIUM]** Unit tests mixed with integration tests in the same file and same test run → slow integration tests pollute fast unit feedback. Separate with different file patterns and distinct npm scripts.
- **[LOW]** No `describe` block grouping in large test files → flat list of tests is hard to scan. Group by method, scenario, or component section.
- **[LOW]** Missing `afterEach` cleanup for tests that manipulate the DOM, global objects, or module-level singletons → stale state leaks into later tests.

---

## Code Quality

- **[CRITICAL]** `expect.assertions(n)` missing in async tests → if the async code throws before reaching `expect`, the test silently passes with zero assertions. Always declare the expected assertion count at the top of async tests.
- **[HIGH]** Using the `done` callback in async tests without calling it on every code path → test hangs on the timeout or silently passes. Migrate to `async/await`; avoid `done` entirely in modern Jest/Vitest.
- **[HIGH]** `toBe` used for object or array equality → compares by reference, so two structurally identical objects always fail. Use `toEqual` for deep equality or `toStrictEqual` to also check `undefined` properties.
- **[HIGH]** Async test body missing `await` on the expression under test → assertions run before the promise resolves, producing false positives. Always `await` async calls; use `return` as a fallback.
- **[HIGH]** Mocks not reset between tests -- missing `jest.clearAllMocks()` / `vi.clearAllMocks()` in `afterEach` or config → mock call counts and return values bleed across tests causing order-dependent failures. Enable `clearMocks: true` globally in config.
- **[MEDIUM]** `jest.mock()` / `vi.mock()` not placed at the module top level → hoisting may silently fail, leaving the real module in place. Always declare mocks before any imports that depend on them.
- **[MEDIUM]** `console.log` / `console.error` left in test files → noisy CI output obscures real failures. Remove debug logs or spy on console and assert intentionally.
- **[MEDIUM]** `toThrow()` used without specifying expected error type or message → any thrown error passes the assertion. Always specify: `toThrow(ValidationError)` or `toThrow('expected message')`.
- **[MEDIUM]** External snapshot files for tiny outputs → adds VCS churn for small strings. Use `toMatchInlineSnapshot()` for outputs that fit on one or two lines.
- **[MEDIUM]** Overuse of `vi.spyOn` to assert internal call counts rather than observable behavior → couples tests to implementation. Assert state or return values; spy on calls only when side-effect verification is the explicit goal.
- **[LOW]** `test.only` / `it.only` / `describe.only` committed to the repository → all other tests are silently skipped in CI, creating a false green. Add a lint rule (`eslint-plugin-jest` or `eslint-plugin-vitest`) to forbid `.only` in CI.
- **[LOW]** `test.skip` without a comment explaining the reason and a tracking ticket → forgotten skipped tests accumulate. Always add: `// TODO(#1234): unskip after fixing X`.
- **[LOW]** Using `vi.mock` to replace an entire module when only one function needs stubbing → replaces functions that should remain real. Use `vi.spyOn(module, methodName)` for partial mocking.

---

## Common Bugs & Pitfalls

- **[CRITICAL]** Async test that neither awaits nor returns the promise under test → test completes synchronously before any assertion runs, producing a false pass. Always `await` or `return` the promise; pair with `expect.assertions(n)`.
- **[HIGH]** Confusing `mockReturnValue(promise)` with `mockResolvedValue(value)` → `mockReturnValue(x)` for an async function returns the raw value rather than a resolved promise, causing `.then` to throw. Always use `mockResolvedValue` / `mockRejectedValue` for async mocks.
- **[HIGH]** `vi.mock` / `jest.mock` factory function referencing variables declared outside it before initialization → hoisting moves the mock call above imports, so the outer variable is `undefined`. Use the factory pattern: `vi.mock('./module', () => ({ fn: vi.fn() }))`.
- **[HIGH]** `beforeAll` async setup without `await` → setup is not complete when the first test runs, causing intermittent failures. All async hooks must `await` their promises or return them.
- **[HIGH]** Asserting on the wrong level of the component tree in React Testing Library -- finding elements by `container.querySelector` instead of user-facing queries → brittle tests that break on DOM restructuring. Use `getByRole`, `getByLabelText`, `getByText`.
- **[MEDIUM]** Updating snapshots with `--updateSnapshot` without reviewing the diff → broken behavior is silently accepted as the new truth. Always review snapshot diffs in the PR; treat them like code changes.
- **[MEDIUM]** `Date.now()` or `new Date()` called inside the module under test without mocking time → non-deterministic timestamps cause intermittent assertion failures. Use `vi.setSystemTime()` / `jest.setSystemTime()` and restore with `vi.useRealTimers()` in `afterEach`.
- **[MEDIUM]** React component tests missing `act()` wrapper around async state updates → stale state in assertions and React warning spam in output. Use RTLs `waitFor` or `findBy*` queries which wrap `act` internally.
- **[MEDIUM]** `jest.setTimeout` / `vi.setConfig({ testTimeout })` set globally too high → slow-failing tests occupy the maximum timeout before reporting. Set the shortest timeout that still allows realistic async operations to complete.
- **[MEDIUM]** Mock implementation returning `undefined` for a function that the code under test chains off of → `TypeError: cannot read property of undefined` masks the real bug. Always return a value from mocks that matches the shape the caller expects.
- **[LOW]** Not using `test.each` / `it.each` for parameterized cases → copy-pasted test bodies diverge silently over time. Refactor to `test.each([[input, expected], ...])`.
- **[LOW]** Test file importing a module with `import * as mod from './foo'` and then reassigning a property for mocking → only works in CommonJS; in ESM this throws. Use `vi.spyOn` or restructure exports to allow injection.
