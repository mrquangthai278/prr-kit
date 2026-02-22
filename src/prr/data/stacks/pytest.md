# pytest — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `pytest`, `import pytest`, `def test_`, `conftest.py`, `@pytest.fixture`, `@pytest.mark`, `pytest.ini`, `pyproject.toml` with `[tool.pytest`

---

## Security
- **[HIGH]** Test fixtures creating real external API calls → API keys used in tests may be logged in CI output; rate limits and billing charges incurred. Mock all external HTTP calls with `pytest-httpx`, `responses`, or `unittest.mock.patch`.
- **[HIGH]** Hardcoded secrets (API keys, passwords, tokens) in `conftest.py` or test files → secrets committed to version control. Load test secrets from environment variables using `os.environ` or `pytest-dotenv`.
- **[MEDIUM]** Temporary files created in tests not cleaned up via fixture teardown → sensitive data left on disk after the test suite exits. Use `tmp_path` (built-in pytest fixture) which automatically cleans up after each test.
- **[MEDIUM]** Test database not isolated from production database → tests modify or read production data, causing data corruption or false test passes. Use a dedicated test database connection string and wipe/seed it before each test session.
- **[LOW]** Test output not suppressed for passing tests in CI → secrets or PII from fixtures logged to CI output on success. Pass `-q` or `--no-header` flags and avoid printing sensitive values in fixture setup.

---

## Performance
- **[HIGH]** Database not reset between tests allowing state pollution → a passing test leaves data that causes a subsequent test to fail non-deterministically. Use a rollback-based fixture (`db.rollback()` in teardown) or truncate tables in `autouse` fixtures.
- **[HIGH]** `@pytest.fixture(scope='session')` not used for expensive setup (DB connections, server startup) → expensive setup repeated for every test, multiplying suite runtime. Set `scope='session'` for fixtures that are safe to share across all tests.
- **[HIGH]** Synchronous test functions used for async code without `pytest-asyncio` and `@pytest.mark.asyncio` → async functions return coroutines that are never awaited; tests pass without actually running. Install `pytest-asyncio` and mark all async test functions with `@pytest.mark.asyncio`.
- **[MEDIUM]** `pytest-xdist` not used to run tests in parallel → large test suites run sequentially, taking many minutes in CI. Configure `pytest -n auto` with `pytest-xdist` for parallelism, ensuring tests are truly isolated first.
- **[MEDIUM]** Heavy fixtures (loading large files, starting subprocesses) not cached with appropriate scope → identical setup re-run for each test in the module. Choose the broadest safe scope: `module` or `session` for fixtures with no side effects.
- **[LOW]** `--tb=short` not configured in CI → verbose traceback output on failure slows CI log parsing. Set `addopts = --tb=short -q` in `pyproject.toml` under `[tool.pytest.ini_options]`.

---

## Architecture
- **[HIGH]** Tests not following Arrange-Act-Assert (AAA) pattern → unclear what is being tested and why; failures are hard to diagnose. Structure every test with a clear setup block, a single action, and an assertion section.
- **[HIGH]** Test logic duplicated across multiple test files instead of shared fixtures → changing setup requires editing every test file. Extract shared setup into `conftest.py` fixtures and import them implicitly.
- **[MEDIUM]** Integration tests not separated from unit tests with markers → fast unit tests mixed with slow integration tests; no way to run only unit tests in CI. Use `@pytest.mark.unit` / `@pytest.mark.integration` and configure `pytest -m unit` for fast feedback.
- **[MEDIUM]** Fixture dependency chains too deep (fixture requiring fixture requiring fixture requiring fixture) → test setup becomes hard to trace and debug. Flatten deep chains by combining related setup into a single higher-level fixture.
- **[MEDIUM]** No coverage reporting configured with `pytest-cov` → coverage gaps go undetected; dead code and untested branches accumulate. Add `pytest --cov=src --cov-report=xml` to CI and set a minimum coverage threshold.
- **[LOW]** Test files and functions not following the `test_*.py` and `def test_` naming convention → pytest does not collect them; tests silently never run. Enforce the naming convention in code review and configure `python_files` and `python_functions` in pytest config if custom names are needed.

---

## Code Quality
- **[HIGH]** `assert` statements with no message in failing conditions → failure output shows only "AssertionError" with no context. Write `assert result == expected, f"Expected {expected}, got {result}"` or use pytest's built-in assertion introspection with descriptive variable names.
- **[HIGH]** Broad `except Exception` in tests masking actual failures → test catches the error it was meant to test plus unexpected errors; always passes. Remove broad exception catches from test bodies; let unexpected exceptions propagate and fail the test.
- **[MEDIUM]** Not using `pytest.raises()` for expected exceptions → test catches the exception manually with try/except, missing edge cases if the exception is not raised. Use `with pytest.raises(ValueError, match="expected message"):` for cleaner exception assertions.
- **[MEDIUM]** Test functions named non-descriptively (`test_1`, `test_func`, `test_stuff`) → failing test names give no information about what broke. Name tests to describe the behavior: `test_create_user_returns_400_when_email_is_invalid`.
- **[MEDIUM]** `@pytest.mark.parametrize` not used for data-driven tests → multiple nearly identical test functions for slight input variations. Consolidate with `@pytest.mark.parametrize("input,expected", [(...),...])`.
- **[LOW]** Test files importing from other test files directly → import order dependencies cause collection errors. Share code via `conftest.py` fixtures or a `tests/helpers/` module, not direct inter-test imports.

---

## Common Bugs & Pitfalls
- **[HIGH]** Fixture yielding without teardown (no code after `yield`) when cleanup is needed → database connections, temp files, and external resources leak. Always place cleanup code after `yield` in generator fixtures: `yield value; db.close()`.
- **[HIGH]** `scope='session'` fixture that modifies shared mutable state → test that runs first passes; subsequent tests fail due to accumulated state mutation. Never mutate shared state in session-scoped fixtures; use `scope='function'` for anything that modifies data.
- **[MEDIUM]** `monkeypatch` used without relying on its automatic restoration → patches applied inside test logic without using the `monkeypatch` fixture are not automatically restored. Always use the `monkeypatch` fixture parameter; do not call `unittest.mock.patch` without a context manager.
- **[MEDIUM]** `asyncio` event loop not properly managed across tests with `pytest-asyncio` → "Event loop is closed" errors or tests sharing a loop when they shouldn't. Set `asyncio_mode = "auto"` in `pyproject.toml` or use `@pytest.fixture(loop_scope="session")` consistently.
- **[MEDIUM]** Fixtures with `scope='module'` or `scope='session'` depending on `scope='function'` fixtures → pytest raises a ScopeMismatch error or silently uses a broader scope. Ensure fixture scope hierarchy is consistent: session > module > class > function.
- **[LOW]** Test files missing the `test_` prefix collected by accident or not collected as intended → tests silently never run. Verify collection with `pytest --collect-only` before merging new test files.
