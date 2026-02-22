# MonoGame — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `MonoGame`, `Microsoft.Xna.Framework`, `Game`, `SpriteBatch`, `ContentManager`, `GameTime`, `*.mgcb`, `*.xnb`

---

## Security
- **[MEDIUM]** Content pipeline loading asset paths from user-provided input → directory traversal enabling reads outside the content directory; validate and canonicalize all paths before passing to `ContentManager.Load<T>()`.
- **[MEDIUM]** Save game data deserialized from disk without schema validation → malformed or tampered save files cause crashes or unexpected game state; validate all fields against expected ranges and types after loading.
- **[MEDIUM]** Online feature API keys or backend URLs embedded in the compiled assembly → decompilable with ILSpy or dnSpy; load secrets from environment variables or a server-side configuration endpoint at runtime.
- **[LOW]** Network multiplayer accepting game action packets without server-side authority → cheating via crafted packets; validate all game state changes on an authoritative server and reject invalid moves.

---

## Performance
- **[HIGH]** `SpriteBatch.Begin()` and `SpriteBatch.End()` called for each individual sprite instead of grouping sprites by texture atlas → each Begin/End pair flushes the GPU batch; group all sprites sharing a texture into a single Begin/End block.
- **[HIGH]** New `Texture2D`, `SoundEffect`, or `RenderTarget2D` objects created inside `Update()` or `Draw()` every frame → GC pressure causing periodic frame hitches; create all resources at load time and reuse them.
- **[HIGH]** `ContentManager.Load<T>("assetName")` called every frame → MonoGame's ContentManager does cache, but the overhead of repeated lookups and any missed caching causes unnecessary work; cache the returned asset reference in a field after the first load.
- **[MEDIUM]** `SpriteSortMode.Immediate` used when `SpriteSortMode.Deferred` is sufficient → Immediate mode flushes the batch on every `SpriteBatch.Draw()` call; use `Deferred` (the default) unless custom shader switching between sprites is required.
- **[MEDIUM]** `Game.IsFixedTimeStep` left as `true` with a mismatch between target elapsed time and monitor refresh rate → inconsistent timing; set `TargetElapsedTime` to match the display refresh rate or disable fixed timestep and use `gameTime.ElapsedGameTime` for variable timestep.
- **[LOW]** Audio `SoundEffectInstance` objects not stopped and disposed after use → audio resources accumulate; explicitly call `Stop()` and `Dispose()` on instances that are no longer needed.

---

## Architecture
- **[HIGH]** All game logic, rendering, input handling, and state management concentrated in `Game1.cs` → monolithic; decompose into `GameComponent` / `DrawableGameComponent` subclasses and dedicated manager classes (InputManager, SceneManager, AudioManager).
- **[MEDIUM]** `GameComponent` and `DrawableGameComponent` not used for modular subsystems → ad-hoc manager classes manually called each frame; derive from `GameComponent` (update-only) or `DrawableGameComponent` (update + draw) and register with `Components.Add()`.
- **[MEDIUM]** Game screens (menu, gameplay, pause, credits) managed with ad-hoc boolean flags instead of a state machine or screen manager → spaghetti transition logic; implement a `GameScreen` base class with a `ScreenManager` that maintains a stack of active screens.
- **[MEDIUM]** Content loading mixed with game initialization in the same method → assets load on every state transition; separate `LoadContent()` for one-time asset loading from screen-specific setup in `Initialize()`.
- **[LOW]** No separation between game world update logic and MonoGame's `Update(GameTime)` lifecycle → pure game logic is MonoGame-coupled and untestable; extract domain logic into framework-agnostic classes called from `Update()`.

---

## Code Quality
- **[HIGH]** `Texture2D`, `SpriteBatch`, `SoundEffect`, `RenderTarget2D`, and `Effect` instances not disposed when no longer needed → unmanaged GPU and audio resources leak; implement `IDisposable` on any class holding MonoGame resources and call `Dispose()` on shutdown or scene transition.
- **[MEDIUM]** Movement, animation speed, or physics not scaled by `gameTime.ElapsedGameTime.TotalSeconds` → frame-rate-dependent behavior; always multiply per-frame changes by elapsed seconds for consistent speed across frame rates.
- **[MEDIUM]** Screen resolution and safe area hardcoded as numeric literals instead of queried from `GraphicsDevice.Viewport` → breaks on different screen sizes; read dimensions from `GraphicsDevice.Viewport.Width` / `Height` and support `GraphicsDeviceManager` changes.
- **[MEDIUM]** `SpriteBatch.Draw()` used without specifying a `layerDepth` when `SpriteSortMode.BackToFront` or `FrontToBack` is used → undefined draw order; always provide explicit layer depths when using depth-sorted draw modes.
- **[LOW]** `ContentManager.Unload()` not called when transitioning between major scenes → assets from the old scene remain in memory; call `Content.Unload()` after a scene transition and reload only the assets needed for the new scene.

---

## Common Bugs & Pitfalls
- **[HIGH]** `SpriteBatch.Draw()` called outside of a `SpriteBatch.Begin()` / `SpriteBatch.End()` block → throws `InvalidOperationException: SpriteBatch.Begin must be called before SpriteBatch.Draw`; always structure draw calls within matched Begin/End pairs.
- **[HIGH]** `base.LoadContent()` not called first within an overridden `LoadContent()` → base class content loading skipped, causing NullReferenceException on built-in resources; always call `base.LoadContent()` as the first statement.
- **[HIGH]** `base.Update(gameTime)` or `base.Draw(gameTime)` not called in overrides → registered `GameComponent` objects not updated or drawn by the framework; always call the base method unless explicitly managing components manually.
- **[MEDIUM]** `Update()` running faster than `Draw()` when `IsFixedTimeStep = true` and frame rate drops → multiple `Update()` calls per `Draw()`, causing input events to be processed multiple times; account for this in input handling by consuming input state once per draw cycle.
- **[MEDIUM]** Sprite rotation origin defaulting to `Vector2.Zero` (top-left) instead of the sprite's center → rotation pivots from the wrong point; pass `new Vector2(texture.Width / 2f, texture.Height / 2f)` as the origin for centered rotation.
- **[MEDIUM]** Content built for one platform (Windows `xnb`) deployed to another (Android, iOS) → content pipeline output is platform-specific; build content for each target platform separately using the MGCB Editor's platform settings.
- **[LOW]** `Random` instantiated with `new Random()` inside a method called every frame → same seed can be generated multiple times per millisecond producing identical sequences; create a single `Random` instance and reuse it throughout the game lifetime.
