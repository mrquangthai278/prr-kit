# Kotlin — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.kt` files · `fun main()` · `import kotlin.` · `build.gradle.kts` · `@Composable` · `ViewModel` · `suspend fun` · `Flow` · `Coroutine`

---

## Security

- **[CRITICAL]** SQL injection via string interpolation in Room queries: `@Query("SELECT * WHERE name = '$userInput'")` → use bound parameters `(:name)`.
- **[HIGH]** `WebView.settings.javaScriptEnabled = true` without overriding `WebViewClient.shouldOverrideUrlLoading()` → XSS from loaded content.
- **[HIGH]** `WebView.addJavascriptInterface()` with reflection access → native code callable from JS.
- **[HIGH]** Sensitive data (tokens, passwords) stored in `SharedPreferences` plaintext → use `EncryptedSharedPreferences`.
- **[HIGH]** Intent with user-controlled `action` or `data` without validation → intent injection from other apps.
- **[HIGH]** Exported `Activity`/`BroadcastReceiver` without permission in `AndroidManifest.xml` → any app can invoke.
- **[HIGH]** Hardcoded API keys in source code → extracted from APK with `apktool`.
- **[HIGH]** Certificate validation disabled via custom `TrustManager` → MITM.
- **[MEDIUM]** `Log.d` / `Log.v` logging sensitive data → visible in ADB LogCat.
- **[MEDIUM]** Missing `FLAG_SECURE` on Activity showing PINs, payment info → screenshots capture sensitive content.
- **[MEDIUM]** `Parcelable` deserialization of untrusted data → class loading attacks.
- **[LOW]** ProGuard/R8 not configured → class/method names readable in reverse-engineered APK.

---

## Performance

- **[HIGH]** `runBlocking` on main thread → blocks UI thread, causes ANR if >5 seconds.
- **[HIGH]** `GlobalScope.launch` → coroutine not bound to lifecycle, continues after component destroyed → leak.
- **[HIGH]** `Dispatchers.IO` used for CPU-bound work → I/O thread pool exhausted. Use `Dispatchers.Default`.
- **[HIGH]** Jetpack Compose: heavy computation inside `@Composable` function body → runs on every recomposition.
- **[HIGH]** `remember { }` missing for expensive objects in Compose → recreated on every recomposition.
- **[HIGH]** `StateFlow` / `LiveData` collected without `repeatOnLifecycle(STARTED)` in Fragment → collects in background.
- **[HIGH]** Bitmap not recycled or sampled down for display size → OOM crash.
- **[HIGH]** Main thread network call (pre-Android 9 workarounds) → NetworkOnMainThreadException or ANR.
- **[MEDIUM]** `Flow` not collected with `flowOn(Dispatchers.IO)` for I/O-bound upstream → runs on collector's dispatcher.
- **[MEDIUM]** `viewModelScope.launch` inside `init {}` block → not cancelled if ViewModel immediately replaced.
- **[MEDIUM]** RecyclerView without `DiffUtil` → full list rebind on any data change.
- **[MEDIUM]** `suspend fun` doing CPU-heavy work on `Dispatchers.Main` → UI jank.
- **[LOW]** `withContext` wrapping already-correct-dispatcher suspend function → unnecessary context switch overhead.

---

## Architecture

- **[HIGH]** `ViewModel` holding reference to `Activity` / `Fragment` Context → memory leak after rotation. Use `applicationContext`.
- **[HIGH]** `LiveData` / `StateFlow` observed in `onCreate` without `lifecycleScope.repeatOnLifecycle` → multiple observers accumulate on back-stack.
- **[HIGH]** Business logic in Activity / Fragment → violates MVVM; move to ViewModel + UseCase.
- **[HIGH]** Repository missing → ViewModel directly calls data source → not testable.
- **[HIGH]** Mutable `MutableStateFlow` / `MutableLiveData` exposed directly from ViewModel → external mutation bypasses state management.
- **[HIGH]** `StateFlow` vs `SharedFlow` wrong choice: `SharedFlow` for events (one-shot), `StateFlow` for UI state.
- **[HIGH]** Not using Hilt/Koin for DI → manual DI at scale becomes maintenance nightmare.
- **[MEDIUM]** `data class` with `var` fields used as ViewModel state → unintentional mutation bypasses reactive update.
- **[MEDIUM]** `CoroutineScope` created manually in Activity/Fragment instead of using `lifecycleScope`.
- **[MEDIUM]** Navigation Component not used → manual fragment transactions → back stack management bugs.
- **[MEDIUM]** `Event` wrapper pattern for `LiveData` one-shot events → use `Channel` or `SharedFlow` instead.
- **[LOW]** Not using `sealed class`/`sealed interface` for UI state → exhaustive `when` not enforced.
- **[LOW]** Not separating domain layer (Use Cases) from data layer.

---

## Code Quality

- **[HIGH]** `!!` (non-null assertion) without preceding null check → `NullPointerException` at runtime. Use `?.`, `?:`, `requireNotNull()`.
- **[HIGH]** `async { }.await()` sequential pattern → defeats concurrency. Use `async { }` + deferred, await all at end.
- **[HIGH]** Missing `CoroutineExceptionHandler` on `launch` → unhandled exception silently swallowed.
- **[MEDIUM]** `object` (singleton) holding Android `Context` reference → leaked context. Use `WeakReference` or restructure.
- **[MEDIUM]** Extension function on `Any?` or too-broad type → pollutes autocomplete.
- **[MEDIUM]** Not using Kotlin's `sealed` result types for domain errors instead of exceptions.
- **[MEDIUM]** `apply` / `also` / `let` / `run` scope functions misused → confusion about `this` vs `it`.
- **[MEDIUM]** `data class` used for entities with identity (DB rows) → `equals`/`hashCode` on all fields, not just ID.
- **[MEDIUM]** Not using `by lazy` for expensive one-time property initialization.
- **[LOW]** Companion object holding non-constant data → shared across all instances.
- **[LOW]** Not using `typealias` for complex function types → unreadable parameter types.

---

## Common Bugs & Pitfalls

- **[HIGH]** `viewLifecycleOwner` vs `this` in Fragment → using `this` causes multiple LiveData callbacks on back navigation.
- **[HIGH]** `launch` exception without handler → silently swallowed (unlike `async`). Add `CoroutineExceptionHandler`.
- **[HIGH]** `Flow.collect` in `lifecycleScope.launch {}` → collects in background when UI paused. Use `repeatOnLifecycle`.
- **[HIGH]** Coroutine cancelled by `CancellationException` caught with `catch (e: Exception)` → coroutine can't cancel.
- **[HIGH]** `Channel.send()` in one coroutine, `receive()` in another → deadlock if sender cancelled before receiver ready.
- **[MEDIUM]** `stateIn(scope, SharingStarted.Eagerly, ...)` → starts collecting even when no subscribers → wasted resources.
- **[MEDIUM]** `withContext(Dispatchers.IO)` wrapping a `suspend` function that already switches context → redundant overhead.
- **[MEDIUM]** `MutableList` shared between coroutines without synchronization → concurrent modification.
- **[MEDIUM]** `by viewModels()` delegate used in `Fragment` before `onAttach()` → crash.
- **[LOW]** `companion object` initialization order misunderstood → `const val` vs `val` differs.
- **[LOW]** `inline fun` with `reified T` used without understanding runtime overhead of inlining.
