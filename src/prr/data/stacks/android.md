# Android — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.kt` or `*.java` in Android project, `AndroidManifest.xml`, `build.gradle` with `com.android.application`, `Activity`, `Fragment`, `ViewModel`, `Compose`

---

## Security
- **[CRITICAL]** Sensitive data (tokens, PII, credentials) stored in `SharedPreferences` unencrypted → readable by root or backup extraction. Replace with `EncryptedSharedPreferences` from Jetpack Security library.
- **[HIGH]** `WebView.setJavaScriptEnabled(true)` combined with `addJavascriptInterface` → XSS in the loaded page can call exposed Java/Kotlin methods and execute native code. Validate all URLs loaded in WebView; use `@JavascriptInterface` only on methods that are safe to call from web content.
- **[HIGH]** `Activity`, `Service`, or `BroadcastReceiver` exported in `AndroidManifest.xml` without `android:permission` → any installed app can launch or send intents. Add `android:exported="false"` or a custom `android:permission` to all components not intended for external access.
- **[HIGH]** API keys, OAuth secrets, or endpoints hardcoded in `BuildConfig` fields or `res/values/strings.xml` → extracted from APK with `apktool` in seconds. Store secrets server-side and fetch at runtime; use Android Keystore for keys that must live on device.
- **[HIGH]** SQL injection via `rawQuery(userInput, null)` in SQLite → database manipulation or data exfiltration. Always use parameterized queries: `rawQuery("SELECT ... WHERE id = ?", arrayOf(id))` or Room's `@Query` with bound parameters.
- **[HIGH]** `FileProvider` paths configured too broadly (e.g., root `/`) → any file in the app sandbox shared with external apps. Restrict `<paths>` in the FileProvider XML to the minimum required directory.
- **[MEDIUM]** SSL certificate validation disabled by overriding `TrustManager` to accept all certs → undetectable MITM on all HTTPS traffic. Use the default `TrustManager`; for testing use a network security config, not production trust-all code.

---

## Performance
- **[HIGH]** Network requests made on the main thread → `NetworkOnMainThreadException` crash on API 11+. Move all network calls to a coroutine with `Dispatchers.IO` or a background thread.
- **[HIGH]** Heavy computation or IO performed in `onDraw()` → dropped frames and jank at every draw cycle. Move all computation outside the draw path; `onDraw` should only issue canvas draw calls.
- **[HIGH]** Activity or Fragment references held by long-lived objects (singletons, callbacks, `companion object`) → memory leak until process death. Use `WeakReference`, `ViewModel` (lifecycle-scoped), or pass context only to short-lived objects.
- **[HIGH]** `RecyclerView.Adapter.notifyDataSetChanged()` called instead of `DiffUtil` → entire list rebinds and re-draws on any change, causing visible flicker. Use `DiffUtil.calculateDiff()` or `ListAdapter` with `DiffUtil.ItemCallback`.
- **[MEDIUM]** Full-resolution `Bitmap` loaded into memory for a small `ImageView` → OOM on devices with limited heap. Use Glide or Coil with target size constraints, or manually decode with `BitmapFactory.Options.inSampleSize`.
- **[MEDIUM]** `ViewModel` not used for UI state → state lost on configuration change (rotation), causing unnecessary re-fetches and blank screens. Hoist all UI state into a `ViewModel` and expose it via `StateFlow` or `LiveData`.
- **[LOW]** `findViewById()` called repeatedly instead of using `ViewBinding` → minor overhead and null-safety risk. Enable `viewBinding` in `build.gradle` and use generated binding classes.

---

## Architecture
- **[HIGH]** Business logic placed directly in `Activity` or `Fragment` → untestable without an emulator and tightly coupled to the Android lifecycle. Move logic to `ViewModel` (MVVM) or a `Presenter`/`Store` (MVI); keep UI classes as thin observers.
- **[HIGH]** `Repository` pattern not used → UI layer directly calls data sources (Room DAO, Retrofit service), making data source swaps and unit testing impossible. Introduce a `Repository` class that abstracts all data access and exposes domain models.
- **[MEDIUM]** Dependency injection done manually at scale instead of using Hilt or Koin → constructor chains become unmanageable; hard to swap implementations in tests. Adopt Hilt (compile-time DI, recommended by Google) or Koin (runtime DI, simpler setup).
- **[MEDIUM]** Mixing `LiveData` and `StateFlow`/`SharedFlow` without a clear policy → inconsistent lifecycle handling and confusion about replay behavior. Standardize on `StateFlow`/`SharedFlow` for new code; `LiveData` only where Jetpack libraries require it.
- **[LOW]** Fragment transactions managed manually instead of using Navigation Component → back-stack fragmentation, inconsistent transitions, and deep-link handling is ad hoc. Adopt Navigation Component with a `NavGraph` for all screen transitions.

---

## Code Quality
- **[HIGH]** `AsyncTask` used for background work → deprecated in API 30 with known memory leak patterns. Replace with `viewModelScope.launch { withContext(Dispatchers.IO) { ... } }`.
- **[HIGH]** Non-null assertion operator `!!` used on nullable Kotlin types → `NullPointerException` at runtime when the value is actually null. Use safe call `?.`, `?:` Elvis operator, or explicit null checks.
- **[MEDIUM]** Coroutines launched with `GlobalScope` or without `lifecycleScope`/`viewModelScope` → coroutine outlives the Activity/Fragment, leaking references and executing after destruction. Use `lifecycleScope` in UI components and `viewModelScope` in `ViewModel`.
- **[MEDIUM]** Runtime permissions requested without showing rationale when `shouldShowRequestPermissionRationale()` returns true → users denied permission without understanding why, causing silent feature breakage. Show an explanation dialog before re-requesting.
- **[LOW]** `lint` checks not run in CI → Android-specific issues (missing translations, incorrect resource references, API level violations) undetected until runtime. Add `./gradlew lint` to CI and treat `Error` severity as a build failure.

---

## Common Bugs & Pitfalls
- **[HIGH]** `Activity` `Context` stored in a singleton or static field → Activity is never garbage collected, leaking the entire view hierarchy. Pass only `Application` context to singletons; use `context.applicationContext` for long-lived objects.
- **[HIGH]** Fragment added to the back stack multiple times without checking `isAdded` or using `findFragmentByTag` → duplicate fragments stacked on top of each other, causing UI glitches and double event handling. Always check `fragmentManager.findFragmentByTag(tag)` before adding.
- **[MEDIUM]** `onCreate()` not checking `savedInstanceState` before re-initializing state → data reset and redundant network calls on every rotation or process restore. Guard initialization with `if (savedInstanceState == null) { ... }`.
- **[MEDIUM]** `startActivityForResult()` / `onActivityResult()` used in new code → deprecated; result delivery unreliable across process death. Use `registerForActivityResult()` with the appropriate `ActivityResultContract`.
- **[LOW]** Hardcoded pixel sizes used instead of `dp`/`sp` units → UI elements appear too large or too small on different screen densities. Use `dp` for dimensions and `sp` for text sizes; define in `dimens.xml`.
