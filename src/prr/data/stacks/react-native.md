# React Native — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `react-native` in deps, `*.tsx` with RN imports (`View`, `Text`, `StyleSheet`), `metro.config.*`, `app.json` (Expo)

---

## Security

- **[CRITICAL]** Sensitive data (tokens, passwords) stored in `AsyncStorage` → not encrypted, readable on rooted devices. Use `react-native-encrypted-storage` or Keychain.
- **[HIGH]** `WebView` with `javaScriptEnabled: true` loading user-controlled URLs → XSS and code injection. Whitelist URLs strictly.
- **[HIGH]** Deep link handling without validation → malicious apps open the app with crafted params. Validate all deep link params.
- **[HIGH]** `REACT_APP_*` / Expo `EXPO_PUBLIC_*` env vars containing secrets → bundled into JS, extractable from APK/IPA.
- **[MEDIUM]** Missing certificate pinning for sensitive API calls → MITM on compromised networks.
- **[MEDIUM]** Screenshot allowed on sensitive screens (PIN entry, payment) → use `FLAG_SECURE` (Android) or disable screenshot.

---

## Performance

- **[HIGH]** `FlatList` / `SectionList` not used for long lists — using `ScrollView` with `map()` → all items rendered at once, memory/FPS issues.
- **[HIGH]** Inline function/object in render passed as prop to `React.memo` component → new reference every render, memo ineffective.
- **[HIGH]** `useEffect` / `useState` causing re-render cascades in navigation-heavy screens → profile with Flipper.
- **[MEDIUM]** JS thread doing heavy computation (image processing, large data transformation) → blocks UI. Use `InteractionManager.runAfterInteractions` or native module.
- **[MEDIUM]** Images not resized for device — loading 4K image for 200x200 display → memory waste.
- **[MEDIUM]** Missing `keyExtractor` on `FlatList` → React uses index, broken reconciliation on reorder.
- **[LOW]** `StyleSheet.create` not used — inline style objects created on every render → garbage collection pressure.

---

## Architecture

- **[HIGH]** Navigation state managed in Redux/Zustand instead of React Navigation → complex sync issues.
- **[MEDIUM]** Platform-specific code scattered with `Platform.OS === 'ios'` checks → use `.ios.tsx`/`.android.tsx` file splitting.
- **[MEDIUM]** Native module called without null check on older RN versions where module may not be linked.
- **[LOW]** Missing `ErrorBoundary` for JS crashes → red screen in production. Use react-native-error-boundary.

---

## Common Bugs & Pitfalls

- **[HIGH]** `Keyboard.dismiss()` not called before navigation → keyboard stays visible on next screen.
- **[HIGH]** Async operation started in `useEffect` without cleanup → state update on unmounted component (navigation back).
- **[MEDIUM]** `TouchableOpacity` inside `ScrollView` with `nestedScrollEnabled` not set → touch conflict on Android.
- **[MEDIUM]** `StatusBar` style not reset between screens → wrong color on some screens.
- **[LOW]** Hardcoded font sizes without `PixelRatio` scaling → poor readability on tablet or accessibility font size.
