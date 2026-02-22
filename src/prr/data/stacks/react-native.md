# React Native — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `react-native` in deps, `*.tsx` with RN imports (`View`, `Text`, `StyleSheet`), `metro.config.*`, `app.json`, `react-navigation`, `@react-native-`, New Architecture

---

## Security

- **[CRITICAL]** Sensitive data (tokens, passwords) in `AsyncStorage` → plaintext on device, accessible on rooted devices. Use `react-native-encrypted-storage` or Keychain/Keystore.
- **[CRITICAL]** `WebView` with `javaScriptEnabled: true` loading user-controlled URLs → XSS and code injection. Allowlist URLs strictly or disable JS.
- **[HIGH]** Deep link params not validated → malicious apps open with crafted data. Validate scheme, host, and all params.
- **[HIGH]** `EXPO_PUBLIC_*` / `REACT_APP_*` env vars containing API secrets → bundled into JS bundle, extractable from APK/IPA.
- **[HIGH]** Missing certificate pinning for sensitive API calls → MITM on compromised or public networks.
- **[HIGH]** `WebView` with `onMessage` accepting arbitrary data without validation → message injection from malicious web content.
- **[HIGH]** Native module exposing filesystem access without path validation → path traversal from JS layer.
- **[MEDIUM]** Screenshot allowed on sensitive screens (PIN, payment) → use `FLAG_SECURE` (Android) or `allowScreenCapture: false`.
- **[MEDIUM]** Biometric auth result trusted on JS side → native layer must be source of truth for auth decisions.
- **[LOW]** Debug menu accessible in production builds → disable `__DEV__` checks properly.

---

## Performance

- **[HIGH]** `ScrollView` with `map()` for long lists → all items rendered at once. Use `FlatList`/`SectionList` with `keyExtractor`.
- **[HIGH]** Inline function/object as prop to `React.memo` or `FlatList` `renderItem` → new reference every render, memo ineffective.
- **[HIGH]** Heavy computation on JS thread (image processing, large transforms) → blocks UI. Use `InteractionManager.runAfterInteractions`, `Reanimated worklets`, or native module.
- **[HIGH]** `FlatList` missing `getItemLayout` for fixed-height items → scroll-to-index slow, no scroll optimization.
- **[HIGH]** Images not sized for display — loading 4K for 200px display → excess memory, OOM on low-end devices.
- **[HIGH]** Unoptimized re-renders causing dropped frames → profile with Flipper/React DevTools Profiler.
- **[MEDIUM]** Missing `keyExtractor` on `FlatList` → React uses index, broken reconciliation on reorder.
- **[MEDIUM]** `StyleSheet.create` not used → inline style objects created on every render → GC pressure.
- **[MEDIUM]** `useEffect` cascade on navigation-heavy screens → multiple re-renders during transition.
- **[MEDIUM]** Not using `Hermes` engine (default RN 0.70+) → slower startup without bytecode precompilation.
- **[LOW]** Missing `removeClippedSubviews` on long `FlatList` → off-screen views kept in memory.
- **[LOW]** Not using `useMemo` for expensive list data transformations.

---

## Architecture

- **[HIGH]** Navigation state in Redux/Zustand instead of React Navigation → complex sync, back button issues.
- **[HIGH]** Async operation in `useEffect` without cleanup → state update on unmounted screen (navigate back).
- **[HIGH]** Not separating platform logic → `Platform.OS === 'ios'` scattered everywhere. Use `.ios.tsx`/`.android.tsx` file extensions.
- **[HIGH]** Business logic in screen components → extract to hooks, services, or state management.
- **[MEDIUM]** Not using React Navigation's `useNavigation` hook → prop drilling `navigation` prop deeply.
- **[MEDIUM]** Native module called without null check → unlinked module on older RN or missing platform.
- **[MEDIUM]** Not using `ErrorBoundary` for JS crashes → red screen in production. Use `react-native-error-boundary`.
- **[MEDIUM]** Deep linking not handling all app states (cold start, background, foreground) differently.
- **[LOW]** Not using `AppState` API to pause/resume work when app backgrounds.

---

## Code Quality

- **[HIGH]** `Keyboard.dismiss()` not called before navigation → keyboard visible on next screen.
- **[HIGH]** `StatusBar` style not set per-screen → wrong appearance on some screens.
- **[MEDIUM]** `TouchableOpacity` vs `Pressable` not chosen consistently (prefer `Pressable` in RN 0.63+).
- **[MEDIUM]** Hardcoded pixel values without `PixelRatio` or responsive scaling → poor tablet/accessibility experience.
- **[MEDIUM]** `useRef` not used for values that should persist without causing re-renders (animation values, timers).
- **[MEDIUM]** Missing `accessibilityLabel` on interactive elements → screen reader unusable.
- **[LOW]** Console logs left in production → use `__DEV__` guard or logging service.
- **[LOW]** Not using TypeScript strict mode → RN component prop types unchecked.

---

## Common Bugs & Pitfalls

- **[HIGH]** `TouchableOpacity` inside `ScrollView` touch conflict on Android → `nestedScrollEnabled` or restructure.
- **[HIGH]** Metro bundler caching stale files → `--reset-cache` needed after certain changes.
- **[HIGH]** New Architecture (Fabric/TurboModules) not compatible with unupgraded native modules → runtime crash.
- **[MEDIUM]** `Animated.Value` directly mutated instead of using `Animated.setValue()` → animation state corrupted.
- **[MEDIUM]** Android back button not handled → exits app unexpectedly. Use `BackHandler.addEventListener`.
- **[MEDIUM]** Orientation changes not handled → UI breaks on tablet or landscape mode.
- **[MEDIUM]** `Linking.openURL()` without `canOpenURL()` check → crash on devices without handler.
- **[LOW]** `Platform.Version` used for feature detection → use capability check instead.
- **[LOW]** Not testing on low-end Android device → performance issues invisible on dev machine.
