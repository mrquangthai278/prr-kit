# Flutter / Dart — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.dart` files · `pubspec.yaml` with `flutter:` section · `import 'package:flutter/` · `Widget` · `StatefulWidget` · `@Composable` (Dart)

---

## Security

- **[HIGH]** Sensitive data (tokens, passwords, PINs) stored in `SharedPreferences` or plain files → not encrypted. Use `flutter_secure_storage` which uses Keychain (iOS) and EncryptedSharedPreferences (Android).
- **[HIGH]** `WebView` with `javaScriptMode: JavascriptMode.unrestricted` loading untrusted URLs → XSS, potential access to platform channels.
- **[MEDIUM]** API keys hardcoded in Dart source → bundled into APK/IPA, extractable with reverse engineering tools. Use environment-injected config or a backend proxy.
- **[MEDIUM]** `Platform.environment` used in Flutter web/mobile → may expose server env vars accidentally. Use `--dart-define` for build-time constants.

---

## Performance

- **[HIGH]** `setState()` called on a high-level ancestor widget for a leaf-level change → rebuilds the entire subtree. Use `Provider`, `Riverpod`, `Bloc`, or `ValueListenableBuilder` to scope rebuilds.
- **[HIGH]** Objects, lists, or heavy computations created inside `build()` method → recreated on every rebuild. Move to `initState()`, `didChangeDependencies()`, or wrap in `const` / `final`.
- **[HIGH]** `ListView` (non-builder) for dynamic or long lists → renders all items upfront. Use `ListView.builder()` for lazy construction.
- **[MEDIUM]** `const` constructor missing on widgets with no changing state → prevents widget tree optimization and unnecessary rebuilds.
- **[MEDIUM]** `FutureBuilder` without a stable `future` reference → parent rebuild creates new `Future`, refetches data on every rebuild. Store the Future in `initState`.
- **[LOW]** `Image.network` without `cacheWidth` / `cacheHeight` → full-resolution image decoded in memory for small display area.

---

## Architecture

- **[HIGH]** Business logic or state management directly inside `Widget.build()` → hard to test, mixed concerns. Use BLoC, Provider, Riverpod, or GetX.
- **[MEDIUM]** `BuildContext` used across an `async` gap without `mounted` check → context may be stale after `await`. Always check `if (!mounted) return` after any `await`.
- **[MEDIUM]** `StatefulWidget` used where `StatelessWidget` with external state management suffices → unnecessary state management complexity.
- **[LOW]** Widget `build()` method > 100 lines → extract into named sub-widget methods or classes for readability.

---

## Code Quality

- **[HIGH]** `dynamic` type used broadly → defeats Dart's sound null safety and type system. Use specific types or generics.
- **[MEDIUM]** `TextEditingController`, `AnimationController`, `ScrollController` not disposed in `dispose()` → memory leak and assertion error in debug mode.
- **[MEDIUM]** `print()` statements in production code → use `debugPrint()` (which is no-op in release builds) or a structured logging package.
- **[LOW]** Missing `Key` parameter on widgets in lists → Flutter cannot efficiently reconcile widget tree on reorder. Add `Key(item.id)` to top-level list items.

---

## Common Bugs & Pitfalls

- **[HIGH]** `async` event handler (e.g., `onPressed: () async { ... }`) without `mounted` check after `await` → `setState()` or `context.read()` on unmounted widget causes crash in debug mode, silent bug in release.
- **[HIGH]** `Navigator.pop()` called when not in a navigation stack (e.g., on first route) → `FlutterError: No routes in the navigator's history`.
- **[MEDIUM]** `Image.network(url)` without `errorBuilder` → broken image widget shown silently on network failure with no user feedback.
- **[MEDIUM]** `FocusNode.dispose()` not called → memory leak, assertion error. Dispose in `dispose()` lifecycle method.
- **[LOW]** Using `Column` with `Expanded` / `Flexible` children inside a `ListView` → layout exception (Column inside unbounded height). Use `shrinkWrap: true` on inner ListView or restructure.
