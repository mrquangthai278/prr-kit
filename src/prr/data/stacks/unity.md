# Unity — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.cs` in Unity project, `UnityEngine`, `MonoBehaviour`, `using UnityEngine`, `Assets/`, `ProjectSettings/`, `.unity` scenes, `Awake()`, `Start()`, `Update()`

---

## Security
- **[CRITICAL]** Deserializing untrusted data with `BinaryFormatter` → arbitrary code execution; replace with `JsonUtility` or a safe serializer and validate schemas before deserialization.
- **[HIGH]** Downloading and executing AssetBundles from unverified URLs → malicious asset injection at runtime; verify bundle URLs against an allowlist and validate bundle hashes after download.
- **[HIGH]** Storing sensitive data (auth tokens, purchase receipts) in `PlayerPrefs` → written as plaintext to disk and registry; use encrypted storage or OS keychain APIs instead.
- **[HIGH]** Trusting client-reported game state without server-side validation → cheating via memory editors; authoritative game server must validate all state transitions.
- **[HIGH]** WebGL builds exposing full game logic to browser DevTools → JavaScript decompilation trivial; obfuscate builds and never embed secrets in client code.
- **[MEDIUM]** Sensitive save data written to `Application.persistentDataPath` without encryption → readable by any process with file access; encrypt with `AES` before writing.
- **[MEDIUM]** Hardcoded API keys or credentials committed in C# scripts → exposed in version history and decompiled assemblies; load from environment or encrypted config at runtime.

---

## Performance
- **[CRITICAL]** Heavy logic (physics queries, pathfinding, string operations) in `Update()` instead of event-driven patterns or coroutines → CPU overhead every frame at 60+ Hz; move to events, coroutines, or throttled polling.
- **[HIGH]** `GameObject.Find()` or `FindObjectOfType()` called in `Update()` → O(n) linear scene search every frame; cache references in `Awake()` or `Start()`.
- **[HIGH]** Frequent `Instantiate()`/`Destroy()` cycles for projectiles, particles, or enemies → GC pressure and frame spikes; implement an Object Pooling system.
- **[HIGH]** Textures not compressed with platform-appropriate formats (DXT on Windows, ETC2 on Android, ASTC on iOS) → excessive VRAM usage and slower GPU sampling.
- **[HIGH]** Component references retrieved via `GetComponent<T>()` every frame instead of cached `[SerializeField]` fields → repeated reflection-based lookups; cache in `Awake()`.
- **[MEDIUM]** `Camera.main` accessed in `Update()` → performs an O(n) tag search each call; cache the camera reference in `Awake()`.
- **[MEDIUM]** String concatenation or `string.Format()` in `Update()` → heap allocation every frame causing GC spikes; use `StringBuilder` or cached strings.
- **[MEDIUM]** `FixedUpdate` rate not tuned for game type → too high wastes CPU, too low makes physics feel loose; set `Project Settings > Time > Fixed Timestep` appropriately.
- **[LOW]** Release builds using Mono scripting backend instead of IL2CPP → lower runtime performance and easier decompilation; switch to IL2CPP for all shipping builds.

---

## Architecture
- **[HIGH]** MonoBehaviour acting as a God Object handling input, AI, physics, UI, and networking → untestable and unresusable; decompose into focused components and use composition.
- **[HIGH]** Inter-object communication via `Find`/`FindObjectOfType` instead of events, interfaces, or ScriptableObject channels → tight coupling that breaks on scene changes; use UnityEvents or ScriptableObject event channels.
- **[HIGH]** Game state stored in static fields → impossible to reset cleanly without a full restart; use a dedicated game state class, ScriptableObjects, or a scene-reload strategy.
- **[MEDIUM]** Shared configuration and data not using `ScriptableObject` assets → duplicated magic numbers across prefabs; centralize into ScriptableObject data containers.
- **[MEDIUM]** Game logic tightly coupled to Unity lifecycle methods → cannot be unit tested outside the editor; separate pure logic into plain C# classes called from MonoBehaviours.
- **[MEDIUM]** Large open-world scenes loaded as a single scene → long load times and no streaming; use additive scene loading with async `LoadSceneMode.Additive`.
- **[LOW]** Legacy Input Manager still used (`Input.GetKey`) → deprecated path with no rebinding support; migrate to the new Input System package.

---

## Code Quality
- **[HIGH]** Null checks using `if (component != null)` on destroyed GameObjects → Unity overrides `==` operator; a destroyed object is `== null` but not `is null`; use Unity's `==` and avoid `is null` or `?.` on UnityObjects.
- **[HIGH]** Coroutines started with `StartCoroutine()` but never stopped → run indefinitely after the owning object is disabled or the scene changes; always pair with `StopCoroutine()` or stop on `OnDisable()`/`OnDestroy()`.
- **[MEDIUM]** Layer mask indices and Animator parameter names as magic integers/strings → silent breakage on project changes; define named constants or use `Animator.StringToHash()`.
- **[MEDIUM]** Missing `[RequireComponent(typeof(T))]` attribute when a MonoBehaviour always depends on another component → runtime NullReference when component is absent; declare the dependency explicitly.
- **[MEDIUM]** Editor-only debugging code not wrapped in `#if UNITY_EDITOR` → shipped in builds and potentially crashing; guard all editor utilities.
- **[LOW]** Public fields used for Inspector exposure instead of `[SerializeField] private` → breaks encapsulation; prefer `[SerializeField]` with private backing fields.

---

## Common Bugs & Pitfalls
- **[CRITICAL]** Accessing a MonoBehaviour's properties or methods after `Destroy()` on the same frame → the object is destroyed at end-of-frame but references remain; null-check with Unity's `==` before access.
- **[HIGH]** Starting a Coroutine on a disabled or inactive GameObject → Unity silently refuses to start it and no warning is shown; ensure the GameObject is active, or use a persistent manager object.
- **[HIGH]** Event subscriptions (C# events, UnityEvents) added in `OnEnable()` not removed in `OnDisable()` or `OnDestroy()` → memory leaks and NullReferenceException callbacks after object destruction.
- **[HIGH]** `Awake()` and `Start()` execution order between objects not controlled → initialization race conditions when object A depends on object B's `Awake()` having run; use Script Execution Order settings or deferred initialization.
- **[MEDIUM]** Movement or animation speed not multiplied by `Time.deltaTime` → frame-rate dependent behaviour; always scale per-frame changes by `Time.deltaTime`.
- **[MEDIUM]** `DontDestroyOnLoad` manager objects duplicated when reloading the scene that created them → multiple singletons fighting; enforce singleton pattern with scene-existence check in `Awake()`.
- **[MEDIUM]** Physics queries (`Raycast`, `OverlapSphere`) using wrong layer masks → hitting unintended objects or missing targets; always specify a layer mask.
- **[LOW]** Hot `Vector3` arithmetic in tight loops creating intermediate structs → excessive stack pressure; use `ref`-parameter overloads or operate on components directly for hot paths.
