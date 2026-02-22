# Flutter / Dart — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.dart` files · `pubspec.yaml` with `flutter:` · `import 'package:flutter/` · `Widget` · `StatefulWidget` · `BuildContext` · `Riverpod`/`Bloc`/`Provider`

---

## Security

- **[HIGH]** Sensitive data (tokens, passwords, PINs) in `SharedPreferences` → not encrypted. Use `flutter_secure_storage` (Keychain on iOS, Keystore on Android).
- **[HIGH]** `WebView` with `javaScriptMode: JavascriptMode.unrestricted` loading untrusted URLs → XSS, platform channel access.
- **[HIGH]** API keys hardcoded in Dart source → extracted from APK/IPA via reverse engineering. Use `--dart-define` or backend proxy.
- **[HIGH]** `dart:mirrors` used for dynamic invocation of user-controlled method names → code injection.
- **[MEDIUM]** Certificate validation disabled (custom `HttpClient.badCertificateCallback`) → MITM.
- **[MEDIUM]** `Platform.environment` in Flutter → may expose environment variables. Use `--dart-define` for build-time constants.
- **[MEDIUM]** Deep link params not validated → malicious intent triggers action with crafted data.
- **[LOW]** Debug flag (`kDebugMode`) not checked before logging sensitive data.

---

## Performance

- **[HIGH]** `setState()` on high-level ancestor for leaf change → rebuilds entire subtree. Use `Provider`/`Riverpod`/`ValueNotifier` to scope rebuilds.
- **[HIGH]** Heavy objects created inside `build()` → recreated on every rebuild. Move to `initState()` or `didChangeDependencies()`.
- **[HIGH]** `ListView` (non-builder) for dynamic/long lists → all items rendered. Use `ListView.builder()`.
- **[HIGH]** `FutureBuilder` without stable `future` reference → parent rebuild creates new Future, re-fetches every time. Store Future in `initState`.
- **[HIGH]** `const` constructor missing on stateless widgets → prevents subtree optimization.
- **[HIGH]** `build()` method doing I/O or heavy computation → blocks UI thread. Use `compute()` or `Isolate`.
- **[MEDIUM]** `Image.network` without `cacheWidth`/`cacheHeight` → full resolution decoded for small display.
- **[MEDIUM]** `AnimationController` not disposed → memory leak and assertion errors.
- **[MEDIUM]** `StreamBuilder` subscribing to broadcast stream that never closes → subscription held forever.
- **[LOW]** Not using `RepaintBoundary` to isolate frequently repainting widgets → whole tree repainted.
- **[LOW]** `Opacity` widget used for animations instead of `AnimatedOpacity` or `FadeTransition`.

---

## Architecture

- **[HIGH]** Business logic inside `Widget.build()` → hard to test. Use BLoC, Provider, Riverpod, or GetX.
- **[HIGH]** `BuildContext` used across `async` gap without `mounted` check → crash after navigation.
- **[HIGH]** `Navigator.pop()` called without checking navigator stack → `FlutterError` on first route.
- **[HIGH]** `StatefulWidget` used for everything → use `StatelessWidget` + state management for separation.
- **[MEDIUM]** `GetX` controller not bound to widget lifecycle → controller persists after widget destroyed.
- **[MEDIUM]** Not using `GoRouter` or `auto_route` for deep link + navigation → manual route management breaks.
- **[MEDIUM]** Platform channel not handling errors → unhandled exception on plugin failure.
- **[LOW]** Widget `build()` >100 lines → extract named sub-widgets or methods.
- **[LOW]** Not organizing code by feature → flat `lib/` directory with hundreds of files.

---

## Code Quality

- **[HIGH]** `dynamic` type used broadly → defeats Dart sound null safety. Use specific types or generics.
- **[HIGH]** `TextEditingController`/`FocusNode`/`ScrollController` not disposed → memory leak + debug assertion.
- **[HIGH]** `mounted` check missing after every `await` in `StatefulWidget` method.
- **[MEDIUM]** `print()` in production → use `debugPrint()` (no-op in release) or structured logging.
- **[MEDIUM]** Missing `Key` on list items → Flutter can't reconcile tree on reorder.
- **[MEDIUM]** `late` variables accessed before initialization → `LateInitializationError` at runtime.
- **[MEDIUM]** Nullable variable accessed with `!` without check → `Null check operator used on null value`.
- **[LOW]** Not running `flutter analyze` in CI → lint issues uncaught.
- **[LOW]** `pubspec.yaml` dependencies not version-pinned → unexpected breaking changes.

---

## Common Bugs & Pitfalls

- **[HIGH]** `async` `onPressed` without `mounted` check → `setState()` on unmounted widget.
- **[HIGH]** `Column` with `Expanded` inside `ListView` → layout exception (unbounded height). Use `shrinkWrap` or restructure.
- **[HIGH]** `StreamController` not closed → memory leak and lint warning.
- **[MEDIUM]** `Image.network` without `errorBuilder` → broken image shown silently.
- **[MEDIUM]** `FocusNode.dispose()` not called → memory leak.
- **[MEDIUM]** `Riverpod` provider accessed after widget disposed → `ProviderScope` not found error.
- **[MEDIUM]** `WillPopScope` deprecated (Flutter 3.12+) → use `PopScope` with `canPop` instead.
- **[LOW]** `ThemeData` not using `ColorScheme.fromSeed` (Material 3) → inconsistent colors.
- **[LOW]** Not testing on both iOS and Android → platform-specific bugs missed.
