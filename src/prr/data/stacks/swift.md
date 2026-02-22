# Swift Stack Rules

## Detection Signals
`*.swift` files · `import UIKit` · `import SwiftUI` · `import Foundation` · `Package.swift` · `*.xcodeproj` · `Podfile` · `*.xcworkspace`

---

## Security

**[CRITICAL]** Sensitive data (passwords, tokens, keys) stored in UserDefaults → not encrypted, included in device backups, and readable on jailbroken devices. Use Keychain via Security framework or KeychainAccess library for all sensitive values.

**[CRITICAL]** Certificate validation disabled via custom URLSession delegate returning .useCredential for all challenges → MITM attack intercepts all network traffic in cleartext. Never bypass certificate validation; implement pinning correctly using SecTrustEvaluateWithError.

**[HIGH]** WKWebView loading user-controlled URLs without scheme/host validation → open redirect, XSS from malicious web content reaching native bridges. Validate and allowlist URL schemes and hosts before loading.

**[HIGH]** WebView with JavaScript enabled loading untrusted content → XSS in web content can access native message handlers and call Swift code. Disable JavaScript for untrusted content or use WKContentWorld isolation for message handlers.

**[HIGH]** Hardcoded API keys, secrets, or connection strings in Swift source files → extractable from compiled binary using strings tool or Hopper. Use environment-specific xcconfig files, obfuscation, or a backend proxy for secrets.

**[HIGH]** SQL injection via raw SQLite query constructed with string interpolation of user input → arbitrary SQL executed against local database. Use parameterized queries with sqlite3_bind_* functions instead of string interpolation.

**[HIGH]** Sensitive content written to UIPasteboard.general without expiry date → pasteboard data persists across apps and is accessible to any app the user switches to. Set expirationDate on sensitive pasteboard items or clear after use.

**[HIGH]** No jailbreak detection for high-security operations in banking or health apps → jailbroken device can bypass Keychain security, intercept traffic, and inspect memory. Implement jailbreak detection checks for sensitive operations in high-security contexts.

**[MEDIUM]** Sensitive screens not protected from screenshots in app switcher → app switcher captures a snapshot of the last screen, potentially exposing sensitive data. Add a privacy overlay in applicationWillResignActive and remove it in applicationDidBecomeActive.

**[MEDIUM]** Log statements containing sensitive data (tokens, PII, passwords) → visible in Xcode console during development and in device system logs. Use compile-time or runtime flags to strip sensitive log statements from release builds.

**[MEDIUM]** try! on network or cryptographic operations → any failure crashes the app with a fatal error rather than being handled gracefully. Use do/catch for all throwing operations and handle errors explicitly.

**[LOW]** Hardcoded bundle IDs or environment URLs in source code → changing environments requires source changes and recompilation. Use xcconfig files with per-scheme settings for bundle ID, URLs, and other environment-specific values.
---

## Performance

**[CRITICAL]** Retain cycle in closure where self is captured strongly without [weak self] or [unowned self] → ARC never releases the object, memory leaks accumulate over the session lifetime. Always capture self weakly in escaping closures stored as properties.

**[HIGH]** @Published property updated from a background thread → SwiftUI requires all UI updates on the main thread; background updates cause runtime warnings and undefined rendering behavior. Wrap background updates with DispatchQueue.main.async or mark the class @MainActor.

**[HIGH]** Synchronous URLSession call on main thread using dataTask with semaphore wait → UI freezes for the duration of the network call, watchdog kills the app after a few seconds. Always use async/await or completion handlers on a background queue.

**[HIGH]** Full-resolution image decoded in memory for thumbnail display → a 12MP JPEG decoded at full resolution uses hundreds of MB of memory, causing OOM and app termination. Use ImageIO with kCGImageSourceThumbnailMaxPixelSize to downsample at decode time.

**[HIGH]** Core Data fetch request executed on the main thread with large datasets → UI freezes during the fetch; large datasets can cause ANR and app termination. Perform fetches using performAndWait on a background managed object context.

**[HIGH]** Not using Swift Concurrency (async/await) for concurrent tasks → GCD DispatchQueue nesting creates callback pyramids, no structured cancellation, hard to reason about. Migrate to async/await with Task and TaskGroup for structured concurrency.

**[MEDIUM]** DispatchQueue.main.sync called from the main thread → deadlock; the main thread blocks waiting for itself to complete the sync block. Always use DispatchQueue.main.async when dispatching to main from the main thread.

**[MEDIUM]** Large Codable model decoded synchronously on the main thread → JSON decoding of large payloads freezes the UI noticeably. Decode on a background Task or DispatchQueue.global and update state on main.

**[MEDIUM]** SwiftUI View body performing expensive computation (sorting, filtering large arrays) on every render → runs on every state change even for unrelated properties, causing jank. Cache results in @State or compute in ViewModel with @Published.

**[MEDIUM]** Not using LazyVStack or LazyHStack for long lists in SwiftUI → all rows computed and laid out upfront even if off-screen, wasting memory and CPU. Use LazyVStack inside ScrollView or List for large collections.

**[MEDIUM]** Heavy objects allocated inside SwiftUI View body initializer → recreated on every render cycle because View structs are value types. Move expensive objects to @StateObject or @EnvironmentObject so they survive re-renders.

**[LOW]** Array used for membership testing in hot paths → contains() on Array is O(n); with large arrays called frequently this causes measurable performance degradation. Use Set for O(1) membership testing.

**[LOW]** NotificationCenter callback performing UI work without main thread dispatch → notifications are delivered on the posting thread which may be a background thread, causing crashes or undefined UI behavior. Always dispatch UI work to DispatchQueue.main inside notification handlers.