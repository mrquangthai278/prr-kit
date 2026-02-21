# Go — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.go` files, `go.mod`, `package main`, `func main()`, `goroutine`, `chan`

---

## Security

- **[CRITICAL]** SQL query with `fmt.Sprintf` / string concatenation of user input → SQL injection. Use `db.Query("SELECT ... WHERE id = ?", userInput)`.
- **[HIGH]** `os/exec` or `exec.Command` with unsanitized user input → command injection.
- **[HIGH]** `html/template` replaced with `text/template` for HTML rendering → XSS, `text/template` doesn't escape.
- **[HIGH]** Sensitive data in error messages returned to client: `c.JSON(500, err.Error())` → info disclosure.
- **[HIGH]** `math/rand` used for security-sensitive values (tokens, IDs) → predictable. Use `crypto/rand`.
- **[MEDIUM]** Secrets loaded with `os.Getenv()` without validation for empty string → app runs with empty secret.
- **[MEDIUM]** `filepath.Join` not used for constructing file paths from user input → path traversal.

---

## Performance

- **[HIGH]** Goroutine leak — goroutine started but never signaled to stop (no `ctx.Done()` handling, no WaitGroup) → memory grows indefinitely.
- **[HIGH]** Mutex held during I/O operation → blocks all goroutines waiting for the lock.
- **[HIGH]** Unbuffered channel used for high-frequency events → sender blocks on every send.
- **[MEDIUM]** `append` in a tight loop without pre-allocating slice capacity → many reallocations.
- **[MEDIUM]** `fmt.Sprintf` in hot path for string building → use `strings.Builder` instead.
- **[MEDIUM]** Missing context timeout / deadline on HTTP client calls → requests can hang indefinitely.
- **[LOW]** Pointer to small struct not necessary → passing by value is cheaper for small types.

---

## Architecture

- **[HIGH]** Error ignored with `_` on operations that can fail → silent failures.
- **[HIGH]** Panic used for expected error conditions → use error returns instead. Panic only for truly unrecoverable programmer errors.
- **[MEDIUM]** Interface defined by implementer instead of consumer → breaks dependency inversion.
- **[MEDIUM]** `init()` functions doing side effects (DB init, file I/O) → hard to test, unpredictable order.
- **[MEDIUM]** Global mutable state (`var globalDB *sql.DB` mutated after init) → race conditions.
- **[LOW]** Package names too generic (`util`, `common`, `helper`) → hard to discover functionality.

---

## Code Quality

- **[HIGH]** Error not checked: `result, _ := someFunc()` when error indicates real failure.
- **[HIGH]** `defer` inside a loop → defers execute at function end, not loop end → resource exhaustion.
- **[MEDIUM]** Returning concrete type instead of interface from constructor → couples callers to implementation.
- **[MEDIUM]** Named return values with `return` (naked return) in long functions → confusing.
- **[LOW]** Missing `golint` / `staticcheck` compliance (exported types without comments, etc.).

---

## Common Bugs & Pitfalls

- **[HIGH]** Loop variable captured by goroutine closure: `go func() { use(v) }()` in range loop → all goroutines use last value. Use `v := v` shadow copy.
- **[HIGH]** Map / slice concurrent read+write without mutex or `sync.Map` → data race, undefined behavior.
- **[HIGH]** `time.Sleep` used for synchronization → race condition. Use channels or `sync.WaitGroup`.
- **[MEDIUM]** `nil` interface value vs `nil` concrete pointer — `interface{}` wrapping a nil pointer is not `nil`.
- **[MEDIUM]** `json.Unmarshal` ignoring error → silently retains zero values on malformed JSON.
