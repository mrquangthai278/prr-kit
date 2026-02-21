# Kotlin — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.kt` files · `fun main()` · `import kotlin.` · `build.gradle.kts` · `@Composable` · `ViewModel` · `suspend fun`

---

## Security

- **[HIGH]** `WebView.settings.javaScriptEnabled = true` without overriding `WebViewClient.shouldOverrideUrlLoading()` → open to XSS from loaded content.
- **[HIGH]** Sensitive data (tokens, passwords) stored in `SharedPreferences` in plaintext → readable on rooted devices and in unencrypted backups. Use `EncryptedSharedPreferences`.
- **[HIGH]** Intent with user-controlled `action` or `data` without validation → intent injection from other apps.
- **[MEDIUM]** `Log.d` / `Log.v` logging sensitive data → visible in ADB LogCat, filtered by release builds but often forgotten.
- **[MEDIUM]** Missing `FLAG_SECURE` on Activity showing PINs, payment info, or personal data → screenshots and screen recording capture sensitive content.

---

## Performance

- **[HIGH]** `runBlocking` on the main thread → blocks the UI thread, causes ANR (Application Not Responding) if it takes > 5 seconds.
- **[HIGH]** Coroutine scope not bound to lifecycle (e.g., `GlobalScope.launch`) → coroutines continue running after the component is destroyed, leaks resources and causes crashes.
- **[MEDIUM]** Heavy computation inside a `@Composable` function body → runs on every recomposition. Move to `remember { }` or a `ViewModel`.
- **[MEDIUM]** `remember { }` missing for expensive objects in Compose → object recreated on every recomposition.
- **[MEDIUM]** `StateFlow` / `LiveData` collected without `repeatOnLifecycle(STARTED)` in Fragment → collects in background when Fragment is off-screen.

---

## Architecture

- **[HIGH]** `ViewModel` holding a reference to `Activity` or `Fragment` `Context` → memory leak after rotation. Use `applicationContext` or `AndroidViewModel` if Context is needed.
- **[HIGH]** `LiveData` or `StateFlow` observed in `onCreate` without `lifecycleScope` / `repeatOnLifecycle` → multiple observers accumulate on back-stack navigation.
- **[MEDIUM]** Mutable backing property exposed directly: `val state = _state` where `_state` is `MutableStateFlow` not private → external code can cast and mutate.
- **[MEDIUM]** Data class with `var` fields used as ViewModel state → unintentional mutation bypasses reactive update cycle. Prefer immutable `val` with copy.
- **[LOW]** Repository layer missing → ViewModel directly calls data source → poor testability.

---

## Code Quality

- **[HIGH]** `!!` (force unwrap / non-null assertion) without preceding null check → `NullPointerException` at runtime. Use `?.`, `?:`, `requireNotNull()`, or `checkNotNull()`.
- **[MEDIUM]** `object` (companion or singleton) holding an Android `Context` reference → leaked context until process death. Use `WeakReference` or restructure.
- **[MEDIUM]** Extension function defined on `Any?` or too broad a type → pollutes autocomplete for all types, hard to discover.
- **[LOW]** `data class` used for domain entities that have identity semantics (e.g., database rows with IDs) → `equals`/`hashCode` based on all fields, not just ID. Consider regular class with manual equals.

---

## Common Bugs & Pitfalls

- **[HIGH]** `viewLifecycleOwner` vs `this` in Fragment for LiveData observation → using `this` means observer lives as long as the Fragment (not its view), causing multiple callbacks and crashes.
- **[HIGH]** `launch` coroutine exception without `CoroutineExceptionHandler` → unhandled exception in `launch` is silently swallowed (unlike `async`). Add handler or use structured concurrency.
- **[MEDIUM]** `Flow.collect` in `lifecycleScope.launch { }` → collects even when UI is in background (paused). Use `lifecycleScope.launch { repeatOnLifecycle(STARTED) { collect() } }`.
- **[MEDIUM]** `withContext(Dispatchers.IO)` wrapping a `suspend` function that already switches dispatcher → redundant context switching overhead.
- **[LOW]** `companion object` confused with Java `static` → companion object is initialized lazily per class, not at class load time. Initialization order matters.
