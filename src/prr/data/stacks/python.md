# Python (General) — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.py` files, `requirements.txt`, `pyproject.toml`, `setup.py` — without more specific framework signals

---

## Security

- **[CRITICAL]** `eval()` / `exec()` with user input → arbitrary code execution.
- **[CRITICAL]** `subprocess.call(shell=True, args=userInput)` → command injection. Use list args without shell=True.
- **[CRITICAL]** `pickle.loads()` / `pickle.load()` on untrusted data → arbitrary code execution. Use JSON or `json.loads`.
- **[CRITICAL]** `yaml.load()` without `Loader=yaml.SafeLoader` → arbitrary Python object deserialization.
- **[HIGH]** `os.path.join` with user path segments not normalized/restricted → path traversal. Use `pathlib.Path.resolve()` + prefix check.
- **[HIGH]** `xml.etree.ElementTree` / `xml.sax` parsing untrusted XML → XXE / billion-laugh DoS. Use `defusedxml`.
- **[HIGH]** `tempfile.mktemp()` (deprecated) → TOCTOU race condition. Use `tempfile.NamedTemporaryFile()`.
- **[HIGH]** Hardcoded credentials in source code → version control exposure.
- **[HIGH]** `random` module used for security tokens/nonces → not cryptographically secure. Use `secrets` module.
- **[HIGH]** `hashlib.md5()` / `hashlib.sha1()` for password hashing → insecure. Use `bcrypt` / `argon2-cffi`.
- **[MEDIUM]** `assert` used for security checks → optimized away with `-O` flag. Use explicit `if` + `raise`.
- **[MEDIUM]** Regular expressions from user input without timeout → ReDoS catastrophic backtracking.
- **[MEDIUM]** `os.environ` secrets accessed without validation → app runs with missing/empty secrets.
- **[LOW]** Sensitive data in logging statements at DEBUG level that reaches production.

---

## Performance

- **[HIGH]** String concatenation in loop (`result += str`) → O(n²). Use `''.join(list)` or `io.StringIO`.
- **[HIGH]** Loading entire file into memory with `f.read()` for large files → OOM. Use line iteration or `mmap`.
- **[HIGH]** GIL-bound CPU work not offloaded to `ProcessPoolExecutor` → single-threaded for CPU tasks.
- **[HIGH]** `asyncio` event loop blocked by synchronous I/O inside `async def` → use `asyncio.to_thread()` or async libraries.
- **[HIGH]** N+1 queries in ORM loop not using `select_related`/`prefetch_related` (Django) or `joinedload` (SQLAlchemy).
- **[MEDIUM]** `list.append()` in loop when list comprehension is available → slower, less readable.
- **[MEDIUM]** `for i in range(len(lst))` instead of `enumerate()` → unpythonic, slower.
- **[MEDIUM]** Unnecessary list creation when generator suffices (`[x for x in ...]` vs `(x for x in ...)`).
- **[MEDIUM]** `deepcopy()` used unnecessarily in hot path → expensive recursive copy.
- **[MEDIUM]** `re.compile()` not cached at module level → regex recompiled on every call.
- **[MEDIUM]** Pandas `iterrows()` in hot path → use vectorized operations instead.
- **[LOW]** `global` variable for mutable shared state → race condition in multithreaded code.
- **[LOW]** `__slots__` not used for classes with many instances → excess memory per object.

---

## Architecture

- **[HIGH]** Missing type hints on public functions → poor IDE support, runtime type errors hard to catch.
- **[HIGH]** `except Exception` too broad → catching and suppressing unrelated exceptions.
- **[HIGH]** `except:` bare clause catches `SystemExit` / `KeyboardInterrupt` → prevents graceful shutdown.
- **[HIGH]** Mutable default argument: `def fn(items=[])` → shared state across all calls. Use `None` + `items = items or []`.
- **[HIGH]** Not using context managers (`with`) for resources → file handles, DB connections not closed on exception.
- **[HIGH]** Circular imports between modules → `ImportError` or partially-initialized module access.
- **[HIGH]** Thread-unsafe global state modification without `threading.Lock`.
- **[MEDIUM]** Long function >50 lines → decompose.
- **[MEDIUM]** Missing `__all__` in module → unclear public API, `import *` imports everything.
- **[MEDIUM]** Not using `dataclasses` or `pydantic` for data containers → manual `__init__` with no validation.
- **[MEDIUM]** Mixing sync and async code without proper bridge → `asyncio.run()` called from within event loop.
- **[MEDIUM]** Not using `pathlib.Path` instead of `os.path` string manipulation → error-prone.
- **[LOW]** Large monolithic module instead of package structure.
- **[LOW]** Not using `__repr__` and `__str__` on domain classes → unhelpful debugging.

---

## Code Quality

- **[HIGH]** Catching exception and doing nothing: `except: pass` → silent failure.
- **[HIGH]** `raise Exception(str(e))` from except → loses original traceback; use `raise NewException() from e`.
- **[MEDIUM]** `print()` used for logging → use `logging` module with levels and handlers.
- **[MEDIUM]** `import *` from module → pollutes namespace, unclear dependencies.
- **[MEDIUM]** Not using `f-strings` for formatting in Python 3.6+ → older `.format()` less readable.
- **[MEDIUM]** Comparing to `True`/`False` with `== True` → use `if condition:` directly.
- **[MEDIUM]** `type()` used for type checking instead of `isinstance()` → misses subclasses.
- **[MEDIUM]** Not using `abc.ABC` / `@abstractmethod` for abstract base classes → subclass can forget to implement.
- **[LOW]** Non-PEP8 naming (camelCase for functions/variables).
- **[LOW]** Missing docstring on public functions/classes.
- **[LOW]** Not using `black` / `ruff` for consistent formatting.

---

## Common Bugs & Pitfalls

- **[HIGH]** `is` used for equality check (`x is "hello"`) → checks identity not value. Use `==`.
- **[HIGH]** Mutable default argument modified inside function → state persists across calls.
- **[HIGH]** `datetime.datetime.now()` without timezone → naive datetime causes comparison bugs. Use `.now(tz=timezone.utc)`.
- **[HIGH]** Dictionary modified during iteration → `RuntimeError`. Iterate `list(dict.items())`.
- **[HIGH]** `asyncio.create_task()` without storing reference → task garbage collected mid-execution.
- **[HIGH]** Catching `Exception` in `async` code swallowing `asyncio.CancelledError` (Python <3.8) → use `BaseException` check.
- **[MEDIUM]** Late binding closures in loops with lambda → all lambdas reference final loop variable.
- **[MEDIUM]** Integer division `//` vs float division `/` confusion.
- **[MEDIUM]** `list(d.keys())` in Python 3 unnecessary → dict views are already iterable.
- **[MEDIUM]** `open()` without explicit `encoding='utf-8'` → platform-dependent default encoding.
- **[MEDIUM]** `os.path.exists()` TOCTOU race: check then act → file deleted between check and use.
- **[LOW]** `bool` subclasses `int` in Python → `True + True == 2` causing subtle bugs.
- **[LOW]** `None` comparison with `==` instead of `is` → custom `__eq__` can return unexpected result.
