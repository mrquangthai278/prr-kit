# Swift / iOS — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.swift` files · `import UIKit` · `import SwiftUI` · `import Foundation` · `Package.swift` · `*.xcodeproj` · `Podfile`

---

## Security

- **[HIGH]** `WKWebView` loading user-controlled URLs without scheme/host validation → open redirect, XSS from web content.
- **[HIGH]** Sensitive data stored in `UserDefaults` → not encrypted, included in device backups, readable by other processes on jailbroken devices. Use Keychain.
- **[HIGH]** Tokens, passwords, or private keys stored in `UserDefaults` or written to files → use `Security` framework (`SecItemAdd`) or `KeychainAccess` library.
- **[MEDIUM]** `try!` on network or file I/O operations → crash on any failure. Use `try?` with nil handling or `do/catch`.
- **[MEDIUM]** Hardcoded URLs, API keys, or secrets in source files → extractable from compiled binary. Use environment-specific config or obfuscation.

---

## Performance

- **[HIGH]** Retain cycle in closure: `self` captured strongly without `[weak self]` or `[unowned self]` → memory leak. ARC never releases the object.
- **[HIGH]** `@Published` property updated from a background thread → SwiftUI view updates must happen on main thread. Use `DispatchQueue.main.async` or `@MainActor`.
- **[MEDIUM]** `DispatchQueue.main.sync { }` called from the main thread → deadlock.
- **[MEDIUM]** Large `Codable` model decoded synchronously on the main thread → UI freeze. Decode on a background queue.
- **[LOW]** `Array` used where `Set` suffices for membership checks → O(n) `.contains()` vs O(1).

---

## Architecture

- **[HIGH]** Massive View Controller > 300 lines with network calls, data formatting, and UI logic mixed → extract to Coordinator, ViewModel, or dedicated service classes.
- **[MEDIUM]** Strong `delegate` property → retain cycle between owner and delegate. Always declare `weak var delegate: MyDelegate?`.
- **[MEDIUM]** `NotificationCenter` observer not removed in `deinit` (UIKit / pre-iOS 9 style) → dangling observer called after object is deallocated.
- **[MEDIUM]** Singleton used for testable business logic → prefer dependency injection for unit testability.
- **[LOW]** `class` used where `struct` would suffice → unnecessary reference semantics and heap allocation. Structs are value types, safer for state.

---

## Code Quality

- **[HIGH]** `!` (force unwrap) on `Optional` without prior `guard let` or `if let` → runtime crash when value is `nil`. Use `guard let` at function entry or optional chaining.
- **[MEDIUM]** `@objc dynamic` on Swift-only code with no Objective-C interop requirement → unnecessary runtime overhead and binary size.
- **[MEDIUM]** `class` `ObservableObject` properties stored in SwiftUI `View` as `@State` → `@State` is for value types. Use `@StateObject` or `@ObservedObject` for reference types.
- **[LOW]** Long `guard` chains with multiple `else { return }` → extract into a validation function.

---

## Common Bugs & Pitfalls

- **[HIGH]** SwiftUI `@State` used for shared or injected state → `@State` is local to the view. Use `@StateObject` (owned) or `@ObservedObject` (injected) for `ObservableObject`.
- **[HIGH]** `URLSession` completion handler updating UI directly → called on background thread by default. Dispatch to main: `DispatchQueue.main.async`.
- **[MEDIUM]** `Timer.scheduledTimer(withTimeInterval:repeats:block:)` without `[weak self]` capture → strong reference to self prevents deallocation.
- **[MEDIUM]** `async/await` task not cancelled on view disappear → long-running tasks continue after the view is gone, may attempt UI updates on deallocated objects.
- **[LOW]** `Date()` captured in a model's initializer → records the time of model creation, not the time the value is used. Often intentional but worth verifying.
