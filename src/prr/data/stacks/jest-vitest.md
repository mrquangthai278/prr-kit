# Jest / Vitest — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `jest.config.*`, `vitest.config.*`, `*.test.ts/js`, `*.spec.ts/js`, `describe(`, `it(`, `test(`, `expect(`, `vi.fn()`, `jest.fn()`

---

## Architecture

- **[HIGH]** Test file testing implementation details (calling private methods, checking internal state) instead of behavior → brittle tests that break on refactoring.
- **[HIGH]** Test depending on another test's side effects (shared mutable state, test order dependency) → flaky tests. Use `beforeEach` to reset state.
- **[HIGH]** Mocking the module under test itself → tests nothing real.
- **[MEDIUM]** Over-mocking — mocking modules that could be integration-tested in memory (in-memory DB, fake service) → low confidence tests.
- **[MEDIUM]** Single test doing too many assertions (`expect` x 20) → hard to tell which assertion failed.
- **[MEDIUM]** Missing test for error/edge cases (empty input, null, network failure) → only happy path covered.
- **[LOW]** Tests not organized in `describe` blocks → flat test files hard to navigate.

---

## Code Quality

- **[HIGH]** `expect.assertions(n)` missing in async tests → if async code throws before `expect`, test silently passes.
- **[HIGH]** Using `done` callback in async test without calling it → test times out or silently passes.
- **[HIGH]** `toBe` used for object/array comparison → compares reference not value. Use `toEqual` or `toStrictEqual`.
- **[MEDIUM]** `jest.mock()` / `vi.mock()` call not at module top level → mock may not be hoisted correctly.
- **[MEDIUM]** `console.log` left in test files → noisy test output, usually indicates incomplete debugging.
- **[MEDIUM]** Tests without meaningful description: `it('works', ...)`, `test('test 1', ...)` → unclear intent.
- **[LOW]** `test.only` / `it.only` / `describe.only` left in code → other tests silently skipped in CI.
- **[LOW]** `test.skip` / `xit` without TODO comment explaining why → forgotten, accumulates.

---

## Performance

- **[MEDIUM]** `setTimeout` / real timers in tests without `vi.useFakeTimers()` / `jest.useFakeTimers()` → slow tests, timing-dependent flakiness.
- **[MEDIUM]** Real HTTP calls in unit tests without mocking → tests depend on network, slow, flaky.
- **[MEDIUM]** Heavy setup in `beforeAll` that should be `beforeEach` → test isolation broken.
- **[LOW]** Missing `--testPathPattern` filter for large test suites run during development.

---

## Common Bugs & Pitfalls

- **[HIGH]** Async test without `await` or returned Promise → test passes before assertions run.
- **[HIGH]** Mock not cleared between tests (`jest.clearAllMocks()` not in `afterEach`) → mock state bleeds between tests.
- **[MEDIUM]** `mockResolvedValue` vs `mockReturnValue` confused for async mocks → mock returns Promise wrapping Promise or raw value unexpectedly.
- **[MEDIUM]** Snapshot tests committed with intentional failures marked `todo` → CI passes with broken snapshots.
- **[LOW]** Test file importing from `src/index` barrel → imports entire module graph, slow test startup.
