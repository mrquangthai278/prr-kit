# Go — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.go` files, `go.mod`, `package main`, `func main()`, `goroutine`, `chan`, `go vet`, `golangci-lint`

---

## Security

- **[CRITICAL]** SQL query with `fmt.Sprintf` / string concatenation of user input → SQL injection. Use `db.Query("SELECT ... WHERE id = ?", userInput)`.
- **[CRITICAL]** `os/exec.Command` with user input as string to shell → command injection. Use argument list form.
- **[HIGH]** `html/template` replaced with `text/template` for HTML rendering → XSS, `text/template` doesn't escape.
- **[HIGH]** Sensitive data in error messages returned to client → info disclosure.
- **[HIGH]** `math/rand` for security-sensitive values (tokens, IDs) → predictable. Use `crypto/rand`.
- **[HIGH]** `filepath.Join` not used for user-controlled paths → path traversal via `../`.
- **[HIGH]** `http.ListenAndServe` without TLS in production → plaintext traffic.
- **[HIGH]** Goroutine spawned to handle request without context cancellation → goroutine leak on client disconnect.
- **[HIGH]** CORS wildcard with credentials in HTTP handler → credential leakage to any origin.
- **[MEDIUM]** Secrets loaded with `os.Getenv()` without validation for empty string → app runs with empty secret.
- **[MEDIUM]** Race condition on shared map without `sync.Mutex` or `sync.RWMutex`.
- **[LOW]** `regexp.MustCompile` with user input at runtime → panic on invalid regex.

---

## Performance

- **[HIGH]** Goroutine leak — goroutine started but never signaled to stop (no `ctx.Done()`, no WaitGroup) → memory grows indefinitely.
- **[HIGH]** Mutex held during I/O → blocks all goroutines waiting for lock.
- **[HIGH]** Unbuffered channel for high-frequency events → sender blocks on every send.
- **[HIGH]** `append` in tight loop without pre-allocated capacity → many reallocations. Use `make([]T, 0, knownSize)`.
- **[HIGH]** `fmt.Sprintf` in hot path for string building → use `strings.Builder`.
- **[HIGH]** Missing context timeout/deadline on HTTP client calls → requests hang indefinitely.
- **[HIGH]** `sync.Mutex` protecting large struct when `sync.RWMutex` allows parallel reads.
- **[MEDIUM]** Pointer to small struct unnecessarily → passing small structs by value is cheaper.
- **[MEDIUM]** `defer` inside loop → defers execute at function end, not loop end → resource exhaustion.
- **[MEDIUM]** Goroutine per request without worker pool → goroutine explosion under load.
- **[MEDIUM]** JSON marshaling/unmarshaling in hot path without pooling encoder/decoder.
- **[LOW]** `interface{}` / `any` in hot path → boxing/unboxing overhead.
- **[LOW]** Not using `sync.Pool` for frequently allocated/freed objects.

---

## Architecture

- **[HIGH]** Error ignored with `_` on operations that can fail → silent failures.
- **[HIGH]** Panic used for expected error conditions → use error returns. Panic only for programmer errors.
- **[HIGH]** Global mutable state (`var globalDB *sql.DB` mutated after init) → race conditions.
- **[HIGH]** `init()` functions doing side effects (DB init, file I/O) → hard to test, unpredictable order.
- **[HIGH]** Context not propagated through function call chain → cancellation doesn't work.
- **[MEDIUM]** Interface defined by implementer instead of consumer → breaks dependency inversion.
- **[MEDIUM]** Package names too generic (`util`, `common`, `helper`) → hard to discover.
- **[MEDIUM]** Struct embedding for code reuse when composition/interfaces cleaner → hidden method promotion.
- **[MEDIUM]** Not using `errors.Is()` / `errors.As()` for error inspection → string comparison brittle.
- **[MEDIUM]** Not using sentinel errors or custom error types → callers can't distinguish error categories.
- **[LOW]** Exported type without methods returning interface → unnecessary coupling.
- **[LOW]** Not using `go generate` for repetitive boilerplate.

---

## Code Quality

- **[HIGH]** Error not checked: `result, _ := someFunc()` when error indicates real failure.
- **[HIGH]** `defer file.Close()` after error check omitted → resource leak if `Open()` fails.
- **[HIGH]** Goroutine closure capturing loop variable → all goroutines use last value. Shadow: `v := v`.
- **[MEDIUM]** Named return values with naked `return` in long functions → confusing.
- **[MEDIUM]** Returning concrete type instead of interface from constructor → couples callers to implementation.
- **[MEDIUM]** Not using `golangci-lint` / `staticcheck` → issues not caught.
- **[MEDIUM]** `go vet` not run in CI → common mistakes missed.
- **[MEDIUM]** Test files not using `_test` package for black-box testing → testing internal state.
- **[LOW]** Missing `golint` compliance (exported types without comments).
- **[LOW]** Not using table-driven tests → duplicated test setup.

---

## Common Bugs & Pitfalls

- **[HIGH]** Loop variable captured by goroutine: `go func() { use(v) }()` in range → all use last value (fixed in Go 1.22).
- **[HIGH]** Map/slice concurrent read+write without mutex → data race, undefined behavior.
- **[HIGH]** `time.Sleep` for synchronization → use channels or `sync.WaitGroup`.
- **[HIGH]** `nil` interface vs nil concrete pointer — `interface{}` wrapping nil pointer is not `== nil`.
- **[HIGH]** `http.Response.Body` not closed after reading → connection leak.
- **[HIGH]** Goroutine panics not recovered → crashes entire program.
- **[MEDIUM]** `json.Unmarshal` ignoring error → silently retains zero values on malformed JSON.
- **[MEDIUM]** Integer conversion between `int32` and `int64` losing data on 32-bit platforms.
- **[MEDIUM]** `select` with default case in timing-sensitive code → busy loop.
- **[MEDIUM]** `context.WithCancel` defer cancel not called → context leak.
- **[LOW]** `make(chan T)` vs `make(chan T, 1)` — unbuffered vs buffered behavior difference not understood.
- **[LOW]** `strings.Contains` used where `strings.HasPrefix`/`HasSuffix` is more appropriate.
