# Rust — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.rs` files · `Cargo.toml` · `Cargo.lock` · `fn main()` · `use std::` · `impl` · `cargo` commands · `tokio` · `async fn`

---

## Security

- **[CRITICAL]** `unsafe` block without safety comment explaining invariants → makes auditing impossible. Every `unsafe` MUST document WHY it's safe.
- **[CRITICAL]** `unsafe` used to bypass borrow checker for mutable aliasing → undefined behavior, data races.
- **[HIGH]** `unwrap()` / `expect()` on user-facing code paths or library public API → panic = DoS for caller. Return `Result<>`.
- **[HIGH]** Deserializing untrusted input with `serde` without value validation → `#[derive(Deserialize)]` checks structure, not semantics (ranges, lengths).
- **[HIGH]** `std::fs::read_to_string(user_path)` without path canonicalization → path traversal.
- **[HIGH]** `Command::new("sh").arg("-c").arg(user_input)` → command injection. Use arg list, never shell string.
- **[HIGH]** Integer cast `as usize` from signed type without range check → negative wraps to huge `usize` → out-of-bounds.
- **[MEDIUM]** Sensitive data (secrets, tokens) stored in heap `String` → may not be zeroed on drop. Use `zeroize` crate.
- **[MEDIUM]** `transmute` between types of different sizes → undefined behavior crash.
- **[MEDIUM]** `std::process::exit()` used → bypasses `Drop`, skips cleanup and zeroize.
- **[LOW]** Logging user-provided strings without sanitization → log injection.

---

## Performance

- **[HIGH]** `.clone()` where borrow suffices → unnecessary heap allocation. Audit every `.clone()`.
- **[HIGH]** `String::from()` / `.to_string()` / `.to_owned()` in hot path where `&str` would work → allocates.
- **[HIGH]** Blocking I/O (`std::fs`, `std::net`, `std::thread::sleep`) inside `async fn` → stalls tokio runtime worker thread. Use `tokio::fs`, `tokio::net`, `tokio::time::sleep`.
- **[HIGH]** `Arc<Mutex<T>>` with long-held lock across `.await` points → deadlock or starvation under async.
- **[HIGH]** `.collect::<Vec<_>>()` before iterating once → unnecessary heap allocation. Chain iterators.
- **[HIGH]** `Box<dyn Trait>` (dynamic dispatch) where generics / `impl Trait` work → vtable + heap overhead.
- **[MEDIUM]** `Mutex<T>` where `RwLock<T>` fits (many readers, rare writes) → unnecessary read contention.
- **[MEDIUM]** `HashMap` with default hasher in security-sensitive context → HashDoS. Use `ahash` for performance or `BTreeMap` for determinism.
- **[MEDIUM]** `format!("{}", x)` in hot path → allocates. Use `write!` to pre-allocated buffer.
- **[MEDIUM]** `Vec::push` in tight loop without `reserve()` → multiple reallocations.
- **[MEDIUM]** Not using `#[inline]` on small hot functions called across crate boundaries.
- **[LOW]** `String::new()` + repeated `push_str` → use `String::with_capacity()`.
- **[LOW]** Not using `Cow<'a, str>` where sometimes owned, sometimes borrowed.

---

## Architecture

- **[HIGH]** `.unwrap()` in library code → caller cannot handle error. Always return `Result<T, E>`.
- **[HIGH]** `Arc<Mutex<T>>` shared widely across many tasks → lock contention + deadlock risk. Prefer message passing via `tokio::sync::mpsc`.
- **[HIGH]** Mixing `async` and sync code without `spawn_blocking` for sync I/O → executor starvation.
- **[HIGH]** Error type is `Box<dyn std::error::Error>` or `String` in library public API → poor ergonomics. Use `thiserror`.
- **[HIGH]** `panic!` / `unwrap()` in `Drop` → if another panic is unwinding, double-panic aborts.
- **[MEDIUM]** `async fn` in trait without boxing (pre-stable RPIT in traits) → compile error or `Box<dyn Future>` overhead.
- **[MEDIUM]** `pub` fields on public struct → breaks encapsulation, prevents future refactoring. Use methods.
- **[MEDIUM]** Global `static mut` → requires `unsafe` to access, data race in multithreaded code. Use `OnceLock`, `LazyLock`, or `Mutex`.
- **[MEDIUM]** Not using workspace (`Cargo.toml` `[workspace]`) in multi-crate project → dependency version drift.
- **[MEDIUM]** Shared mutable state via `RefCell` in multi-threaded context → panics at runtime on borrow violation.
- **[LOW]** Not using feature flags to gate optional heavy dependencies.
- **[LOW]** Not using `#[non_exhaustive]` on public enums/structs → breaking changes when adding variants.

---

## Code Quality

- **[HIGH]** `#[allow(dead_code)]` / `#[allow(unused_variables)]` without explanation → suppresses meaningful warnings.
- **[HIGH]** `let _ = some_result` → silently ignores `Result` or `Option`. Use `if let`, `match`, or `?`.
- **[HIGH]** `unwrap()` / `expect()` in tests without descriptive message → cryptic panic output on failure.
- **[HIGH]** Not using `?` operator for error propagation → verbose `match` chains.
- **[MEDIUM]** Missing `#[derive(Debug)]` on public types → `{:?}` doesn't work, poor debuggability.
- **[MEDIUM]** Not using `clippy` in CI → many best-practice violations undetected.
- **[MEDIUM]** `match` arm with `_` catch-all prevents exhaustiveness when new variants added.
- **[MEDIUM]** `impl From<X> for Y` not implemented → `.into()` / `.from()` not usable, manual conversions everywhere.
- **[MEDIUM]** `pub use` re-exports not organized → messy crate public API.
- **[LOW]** Not using `rustfmt` → inconsistent formatting.
- **[LOW]** Long `impl` blocks → consider splitting concerns into multiple traits.

---

## Common Bugs & Pitfalls

- **[HIGH]** `Rc<RefCell<T>>` in async code → `Rc` is not `Send`, compile error across `.await`. Use `Arc<Mutex<T>>`.
- **[HIGH]** Integer overflow: debug builds panic, release builds silently wrap → use `checked_add`/`saturating_add` for user values.
- **[HIGH]** Lifetime annotation outliving actual data → `'static` bound used when shorter lifetime is correct → dangling reference.
- **[HIGH]** Futures not polled → `async fn` does nothing until `.await`ed. Spawning required for concurrent execution.
- **[HIGH]** `tokio::spawn` task panics → panic not propagated to spawner, silently dropped unless `JoinHandle` checked.
- **[MEDIUM]** `Vec::iter()` vs `Vec::into_iter()` confusion → `iter()` borrows, `into_iter()` consumes.
- **[MEDIUM]** `HashMap` with `String` keys and `&str` lookup requires `.to_string()` → use `.get("key")` via `Borrow<str>`.
- **[MEDIUM]** `&str` borrowed from temporary `String` doesn't live long enough → lifetime error.
- **[MEDIUM]** Shared reference to `Mutex` dropped before lock used → deadlock on reacquire.
- **[MEDIUM]** `async move` closure capturing `Arc` → clone before move or wrap in `Arc`.
- **[LOW]** `match` on `String` requires `str::as_str()` → match `&*s` or `s.as_str()`.
- **[LOW]** Not using `Cow<'_, str>` where conditionally cloning → always-clone is wasteful.
