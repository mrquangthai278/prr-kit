# LibGDX — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `com.badlogicgames`, `Gdx.`, `ApplicationAdapter`, `SpriteBatch`, `AssetManager`, `Box2D`, `*.gdx`, `libgdx`

---

## Security
- **[MEDIUM]** User-provided level or save files loaded and parsed without validation → malformed data causes crashes or exploits memory parsers. Validate all external data against a schema before processing; reject files that fail validation.
- **[MEDIUM]** Reflection-based serialization (`Json.fromJson()`) with untrusted input → arbitrary class instantiation or field injection. Restrict JSON deserialization to a known set of types using a whitelist or switch to a safer format (e.g., Protocol Buffers).
- **[LOW]** Server endpoints for online features hardcoded in the binary → man-in-the-middle or reverse-engineering of API endpoints. Fetch endpoints from a signed configuration loaded at startup; pin SSL certificates for sensitive requests.

---

## Performance
- **[CRITICAL]** Object allocation (`new`, `ArrayList()`, etc.) inside `render()` → triggers Android GC, causing frame-rate spikes and jank. Pre-allocate all objects before game loop; use `com.badlogic.gdx.utils.Pool` for recycling frequently created/destroyed objects.
- **[HIGH]** Not using `AssetManager` → textures, sounds, and models loaded synchronously, blocking the render thread for seconds. Use `AssetManager.load()` with an async loading screen; check `AssetManager.isFinished()` each frame.
- **[HIGH]** Not using texture atlases (TexturePacker) → individual texture binds per sprite cause excessive GPU state changes and draw calls. Pack all sprites into atlases with `gdx-tools` TexturePacker; use `TextureAtlas` and `AtlasRegion` for lookups.
- **[HIGH]** Box2D physics step not using a fixed timestep → simulation becomes non-deterministic and unstable at varying frame rates. Accumulate delta time and step the world in fixed increments (`1/60f`); interpolate rendering between steps.
- **[MEDIUM]** `SpriteBatch.begin()`/`end()` called too frequently or interrupted by texture switches → extra flush calls reduce batching efficiency. Sort sprites by texture region; batch all draws for the same atlas region before flushing.
- **[LOW]** Not using `Pools` (`com.badlogic.gdx.utils.Pools`) for frequently created objects (e.g., `Vector2`, `Rectangle`) → unnecessary GC pressure from short-lived heap objects. Obtain from `Pools.obtain(Vector2.class)` and `Pools.free(v)` after use.

---

## Architecture
- **[HIGH]** All game logic implemented directly inside `ApplicationAdapter` or `ApplicationListener` → untestable, unmaintainable as game grows. Use the `Game` + `Screen` pattern; separate update logic into domain classes that are independent of LibGDX lifecycle.
- **[HIGH]** Not using the `Game`/`Screen` interface for managing game states → ad hoc state flags proliferate in the main class. Implement `Screen` for each game state (menu, gameplay, pause, game-over) and use `Game.setScreen()` to transition.
- **[MEDIUM]** Rendering and game logic update not separated → logic tied to frame rate causes speed variations on slower devices. Call `update(delta)` before `render()` and cap or accumulate delta to decouple simulation from frame rate.
- **[LOW]** Platform-specific differences (desktop vs Android vs HTML5 vs iOS) not abstracted behind interfaces → platform-conditional code scattered through game logic. Define platform interfaces and inject the appropriate implementation via the LibGDX `ApplicationListener` factory pattern.

---

## Code Quality
- **[HIGH]** `Texture`, `SpriteBatch`, `BitmapFont`, `AssetManager`, `Sound`, `Music`, or `ShaderProgram` not disposed when no longer needed → native OpenGL/OpenAL resources leak, causing OOM or driver instability. Implement `Disposable` on all resource-holding classes and call `dispose()` in `Screen.dispose()` and `ApplicationListener.dispose()`.
- **[MEDIUM]** Not using `gdx-tools` TexturePacker at build time → manually managed sprite sheets become out of sync with source art. Integrate TexturePacker into the build pipeline so atlases are regenerated on asset changes.
- **[MEDIUM]** `Gdx.app.log()` / `Gdx.app.error()` calls left unrestricted in production builds → log spam on end-user devices and potential information disclosure. Gate verbose logging behind a `BuildConfig.DEBUG` flag or a runtime log level setting.
- **[LOW]** GWT (HTML5) backend constraints not considered during development → classes not supported by GWT (reflection, some `java.util` features) cause HTML build failures. Test HTML5 target in CI; avoid GWT-incompatible APIs unless the HTML5 backend is explicitly excluded.

---

## Common Bugs & Pitfalls
- **[HIGH]** Texture or OpenGL resource created on a background thread → OpenGL context is thread-local on Android/desktop; creating resources off the render thread causes `GLException`. Always create GL resources on the render thread; post work to the render thread with `Gdx.app.postRunnable()`.
- **[HIGH]** `AssetManager.finishLoading()` called on the render thread as a blocking wait → freezes the render loop for the full load duration. Use the async pattern: call `update()` each frame and check `isFinished()` to proceed.
- **[MEDIUM]** `Vector2.tmp` or `Vector3.tmp` static scratch fields used in nested or multi-threaded calls → the same temporary object overwritten mid-calculation. Create local `Vector2` instances or use `Pools`; never rely on static tmp fields across method boundaries.
- **[MEDIUM]** `BitmapFont` created directly from a TTF or not disposed → underlying `Texture` leaks native memory. Create fonts via `AssetManager` with `FreetypeFontLoader` and let the manager handle disposal.
- **[LOW]** Android back button not handled (`Gdx.input.setCatchKey(Input.Keys.BACK, true)` not set) → app exits abruptly without saving state or showing a confirmation dialog. Catch the back key explicitly and implement the intended behavior (pause menu, confirm quit, etc.).
