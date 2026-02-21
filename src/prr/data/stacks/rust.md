# Rust — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.rs` files · `Cargo.toml` · `Cargo.lock` · `fn main()` · `use std::` · `impl` · `cargo` commands

---

## Security

- **[CRITICAL]** `unsafe` block without a safety comment explaining the invariants being upheld → makes auditing impossible. Every `unsafe` must document WHY it's safe.
- **[HIGH]** `unwrap()` / `expect()` called on user-facing code path or in library public API → panic = denial of service for the caller. Return `Result<>` instead.
- **[HIGH]** Deserializing untrusted input with `serde` without validation of field values → `#[derive(Deserialize)]` only checks structure, not semantics (ranges, lengths, enums).
- **[MEDIUM]** Sensitive data (secrets, tokens) stored in heap-allocated `String` → memory may persist after drop. Use `zeroize` crate for secrets.
- **[MEDIUM]** Integer cast `as usize` from a signed type without range check → negative value wraps to a large `usize`, causing out-of-bounds access.

---

## Performance

- **[HIGH]** `.clone()` called when a borrow would suffice → unnecessary heap allocation. Audit every `.clone()` call.
- **[HIGH]** `String::from` / `.to_string()` / `.to_owned()` in hot path where `&str` would work → allocates. Accept `impl Into<String>` or `&str` in hot interfaces.
- **[MEDIUM]** `Mutex<T>` where `RwLock<T>` fits (multiple readers, rare writers) → unnecessary read contention.
- **[MEDIUM]** `.collect::<Vec<_>>()` before iterating only once → unnecessary heap allocation. Chain iterators all the way.
- **[MEDIUM]** `Box<dyn Trait>` (dynamic dispatch) where generics / `impl Trait` / RPIT would work → vtable overhead and heap allocation.
- **[LOW]** `format!("{}", x)` where `x.to_string()` suffices, or string concatenation in a loop → prefer `write!` to a pre-allocated `String`.

---

## Architecture

- **[HIGH]** `.unwrap()` in library code → caller cannot handle the error. Always return `Result<T, E>` from library functions.
- **[HIGH]** `Arc<Mutex<T>>` shared widely across many tasks → lock contention and potential deadlock. Prefer message passing via `tokio::sync::mpsc` or `crossbeam` channels.
- **[MEDIUM]** `Box<dyn std::error::Error>` or `String` as error type in library public API → poor ergonomics for callers. Use `thiserror` to define structured error types.
- **[MEDIUM]** `async fn` in trait without `#[async_trait]` macro or `impl Trait` return (pre-stable RPITIT) → compile error or awkward workarounds.
- **[MEDIUM]** Blocking call (file I/O, `std::thread::sleep`) inside `async fn` without `spawn_blocking` → blocks the async executor thread.
- **[LOW]** `pub` fields on public struct → breaks encapsulation, prevents future internal refactoring. Expose via methods.

---

## Code Quality

- **[HIGH]** `#[allow(dead_code)]` / `#[allow(unused_variables)]` without explanation → suppresses warnings that may indicate real issues.
- **[HIGH]** `let _ = some_result` → silently ignores `Result` or `Option`. Use `if let`, `match`, or `?` operator.
- **[MEDIUM]** Panic in `Drop` implementation → if a second panic occurs during unwinding, the process aborts with a confusing message.
- **[MEDIUM]** Using `std::process::exit()` instead of returning from `main()` → skips `Drop` implementations, leaks resources.
- **[LOW]** Missing `#[derive(Debug)]` on public types → poor debuggability, `{:?}` doesn't work.

---

## Common Bugs & Pitfalls

- **[HIGH]** `Rc<RefCell<T>>` used in async code → `Rc` is not `Send`, causes compile error when passed across `.await` points. Use `Arc<Mutex<T>>` in async contexts.
- **[HIGH]** Integer overflow in debug mode panics, silently wraps in release mode → for user-controlled values, use `checked_add` / `saturating_add` / `wrapping_add` explicitly.
- **[MEDIUM]** `Vec::iter()` vs `Vec::into_iter()` confusion → `iter()` borrows elements (`&T`), `into_iter()` consumes and yields `T`. Wrong choice causes type errors or unnecessary clones.
- **[MEDIUM]** `HashMap` with `String` keys and constant `&str` lookup requires `.to_string()` allocation → use `HashMap<String, V>` with `.get("key")` (works via `Borrow<str>` impl).
- **[MEDIUM]** Futures not polled after creation → `async fn` does nothing until `.await`ed. Spawning is required for concurrent execution.
- **[LOW]** `match` arm with `_` catch-all prevents exhaustiveness checking when new enum variants are added → prefer explicit arms when completeness matters.
