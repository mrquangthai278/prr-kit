# Expo — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `expo`, `from 'expo'`, `app.json` with `expo`, `from 'expo-router'`, `eas.json`, `from 'expo-constants'`

---

## Security
- **[CRITICAL]** API keys or secrets placed in `app.json`, `app.config.js`, or `Constants.expoConfig` → values are bundled into the app binary and extractable. Move secrets server-side; use `expo-constants` only for non-sensitive public config.
- **[HIGH]** Sensitive data (tokens, user credentials) stored in `AsyncStorage` → unencrypted storage accessible on rooted/jailbroken devices. Use `expo-secure-store` which calls the OS keychain/keystore.
- **[HIGH]** Deep link URI scheme not validated before acting on parameters → open redirect or parameter injection via crafted links. Validate the full URI and all parameters before using deep link data.
- **[HIGH]** `expo-file-system` used to read/write paths constructed from user input → path traversal outside the app sandbox. Sanitize paths and restrict operations to `FileSystem.documentDirectory` or `cacheDirectory`.
- **[MEDIUM]** EAS Update (OTA) not configured with code signing → unsigned JavaScript bundles can be injected by a network attacker. Enable `codeSigningCertificate` in `eas.json` for all update channels.
- **[MEDIUM]** `__DEV__` check absent on verbose logging or debug screens → internal data and stack traces exposed in production builds. Guard all debug output with `if (__DEV__)`.

---

## Performance
- **[HIGH]** Heavy computation (sorting, encryption, image processing) run on the JavaScript thread → UI freezes. Offload to `expo-task-manager` background tasks, `react-native-worklets-core`, or a native module.
- **[HIGH]** Large images embedded at source resolution without optimization → bloated bundle and slow render on low-end devices. Use `expo-image-manipulator` to resize/compress assets; provide `@2x`/`@3x` variants.
- **[HIGH]** React Native `Image` component used instead of `expo-image` → no built-in memory caching, blurhash placeholder support, or progressive loading. Replace with `expo-image` for all image rendering.
- **[MEDIUM]** Data fetched in `useEffect` on every component mount without caching → repeated network calls on navigation. Use a caching layer (React Query, SWR, or Expo's `useCachedPromise`).
- **[MEDIUM]** All screens eager-loaded at startup in navigator → slow time-to-interactive. Use `lazy` option in Expo Router or React Navigation to defer screen registration.
- **[LOW]** `useFonts` from `expo-font` not awaited before rendering text → layout shift or missing glyphs on first frame. Hide the splash screen until fonts are ready with `SplashScreen.preventAutoHideAsync`.

---

## Architecture
- **[HIGH]** Custom navigation logic reimplemented instead of using Expo Router's file-based routing → navigation state bugs and missed deep linking support. Migrate to the `app/` directory convention with Expo Router.
- **[HIGH]** Platform-specific logic mixed inline with `Platform.OS === 'ios'` checks throughout components → hard to maintain. Use `.ios.tsx` / `.android.tsx` / `.web.tsx` file extensions for platform-specific implementations.
- **[MEDIUM]** Production builds done locally with `expo build` (deprecated) instead of EAS Build → inconsistent build environment and toolchain. Switch to `eas build` with a defined build profile.
- **[MEDIUM]** Static `app.json` used instead of `app.config.ts` → cannot inject environment variables or dynamic values at build time. Migrate to `app.config.ts` and read from `process.env`.
- **[MEDIUM]** Expo managed workflow plugins not used for native module configuration → manual native code edits that break on `expo prebuild`. Use config plugins for all native configuration.
- **[LOW]** Single `eas.json` profile for all environments → development, staging, and production share the same build configuration. Define separate `development`, `preview`, and `production` profiles.

---

## Code Quality
- **[HIGH]** Expo SDK version not pinned or using a major version range → `expo upgrade` introduces breaking changes automatically. Pin to an exact Expo SDK version and upgrade intentionally.
- **[MEDIUM]** `expo-constants` used for environment switching in runtime code instead of EAS build profiles → environment logic scattered and hard to audit. Centralize environment config in a single `config.ts` module populated at build time.
- **[MEDIUM]** Permissions (camera, location, notifications) requested without a usage description or at startup → users deny preemptively. Request permissions at the point of use and provide a `PermissionsExplanation` component.
- **[MEDIUM]** `babel.config.js` not using `babel-preset-expo` → Expo-specific transforms (SVG imports, module resolution) do not work. Ensure `presets: ['babel-preset-expo']` is the base config.
- **[LOW]** TypeScript strict mode not enabled in `tsconfig.json` → type errors masked. Set `"strict": true` and extend from `expo/tsconfig.base`.

---

## Common Bugs & Pitfalls
- **[HIGH]** Stale Metro bundler cache producing builds with old code after dependency changes → old module versions used at runtime. Run `expo start --clear` or `npx expo start -c` to clear the cache.
- **[HIGH]** `expo-av` `Audio` or `Video` playback not stopped or unloaded on component unmount → audio continues playing in the background, leaking native resources. Call `sound.stopAsync()` and `sound.unloadAsync()` in the `useEffect` cleanup.
- **[MEDIUM]** `KeyboardAvoidingView` using the same `behavior` for iOS and Android → input fields obscured by keyboard on one platform. Use `behavior="padding"` for iOS and `behavior="height"` for Android.
- **[MEDIUM]** `StatusBar` style not set per screen → status bar text color wrong against the screen's background. Use `expo-status-bar` `StatusBar` component with `style` set in each screen.
- **[MEDIUM]** `useCallback` and `useMemo` not applied to callbacks passed to `FlatList` `renderItem` → entire list re-renders on parent state change. Memoize `renderItem` and `keyExtractor` callbacks.
- **[LOW]** `Platform.OS === 'web'` checks missing for Expo Web → components using native-only APIs crash in the browser. Add web guards or provide web-specific implementations for all native API usage.
