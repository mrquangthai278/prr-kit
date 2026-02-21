# Python (General) — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.py` files, `requirements.txt`, `pyproject.toml`, `setup.py` — without more specific framework signals

---

## Security

- **[CRITICAL]** `eval()` / `exec()` with user input → arbitrary code execution.
- **[CRITICAL]** `subprocess.call(shell=True)` with user input → command injection. Use `subprocess.run([...])` with list args.
- **[HIGH]** `pickle.loads()` on untrusted data → arbitrary code execution. Use JSON or `json.loads`.
- **[HIGH]** `os.path.join` with user-controlled path segments without normalization and restriction → path traversal.
- **[HIGH]** Hardcoded credentials in source code → version control exposure.
- **[MEDIUM]** `yaml.load()` without `Loader=yaml.SafeLoader` → arbitrary Python object deserialization.
- **[MEDIUM]** `assert` used for security checks → optimized away with `-O` flag. Use explicit `if` + `raise`.

---

## Performance

- **[HIGH]** String concatenation in loop (`result += str`) → O(n²) due to string immutability. Use `''.join(list)` or `io.StringIO`.
- **[HIGH]** Loading entire file into memory with `f.read()` for large files → memory exhaustion. Use iterators.
- **[MEDIUM]** `list.append()` in loop when list comprehension is available → slower, less readable.
- **[MEDIUM]** `for i in range(len(lst))` instead of `for item in lst` or `enumerate()` → unpythonic, slower.
- **[MEDIUM]** Unnecessary list creation when generator would suffice (`[x for x in ...]` vs `(x for x in ...)`).
- **[LOW]** `global` variable used for mutable shared state → race condition in multithreaded code.

---

## Architecture

- **[HIGH]** Missing type hints on public functions → poor IDE support, runtime type errors hard to catch.
- **[MEDIUM]** `except Exception` too broad → catching and suppressing unrelated exceptions.
- **[MEDIUM]** `except:` bare clause catches even `SystemExit` / `KeyboardInterrupt` → prevents graceful shutdown.
- **[MEDIUM]** Mutable default argument: `def fn(items=[])` → shared across all calls. Use `None` + `items or []`.
- **[LOW]** Long function >50 lines → decompose.
- **[LOW]** Missing `__all__` in module → unclear public API.

---

## Code Quality

- **[HIGH]** Catching exception and doing nothing: `except: pass` → silent failure.
- **[MEDIUM]** `print()` used for logging → use `logging` module for structured, level-controlled output.
- **[MEDIUM]** `import *` from module → pollutes namespace, unclear dependencies.
- **[LOW]** Non-PEP8 naming (camelCase for functions/variables) → inconsistency.
- **[LOW]** Missing docstring on public functions/classes.

---

## Common Bugs & Pitfalls

- **[HIGH]** Integer division `//` vs float division `/` confusion in Python 3.
- **[HIGH]** `is` used for equality check (`x is "hello"`) → checks identity not value. Use `==`.
- **[MEDIUM]** Dictionary modified during iteration → `RuntimeError`. Iterate over `list(dict.keys())`.
- **[MEDIUM]** Late binding closures in list comprehensions with lambda → all lambdas reference same variable.
- **[LOW]** `datetime.datetime.now()` without timezone → naive datetime causes comparison bugs.
