# LÖVE 2D — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `main.lua` with `love.`, `love.load`, `love.update`, `love.draw`, `love.graphics`, `love.keypressed`, `*.love`

---

## Security
- **[HIGH]** `love.filesystem.load()` called with a path derived from user input → executes arbitrary Lua code from the loaded file; never load and execute files from untrusted paths, and restrict file loading to the game's save directory or fused archive.
- **[MEDIUM]** Sensitive data (auth tokens, player credentials, purchase state) written with `love.filesystem.write()` in plaintext → readable by any process with filesystem access; encrypt sensitive data before writing, or store server-side.
- **[MEDIUM]** Network multiplayer receiving game action messages without server-side authority → cheating via crafted UDP/TCP packets; treat all received client inputs as untrusted and validate legality on the server.
- **[LOW]** Third-party Lua libraries loaded from user-writable directories → malicious library substitution; load libraries only from the fused game archive and verify file integrity where possible.

---

## Performance
- **[HIGH]** New Lua tables, strings, or closures created inside `love.draw()` every frame → triggers the Lua garbage collector during rendering, causing periodic hitches; pre-allocate tables and strings before the game loop and reuse them.
- **[HIGH]** Large, uncompressed PNG images loaded without enabling GPU-side compression → excessive VRAM usage and slower texture sampling; use `love.graphics.newImage(path, {compress = true})` or pre-convert to compressed formats (DXT, ETC).
- **[HIGH]** `love.graphics.draw()` called individually for hundreds of identical images → one draw call per image; use `love.graphics.newSpriteBatch()` to batch all instances of the same image into a single draw call.
- **[MEDIUM]** Physics world `world:update(dt)` using variable `dt` directly → non-deterministic simulation that diverges between clients in multiplayer; use a fixed timestep accumulator: accumulate `dt` and step with a fixed interval until the accumulator is exhausted.
- **[MEDIUM]** Off-screen rendering results (UI panels, static backgrounds) redrawn from scratch every frame → wasted GPU work; render static or infrequently changing content to a `love.graphics.newCanvas()` and redraw the canvas only when the content changes.
- **[LOW]** `love.graphics.setFont()` called every frame when the font does not change → redundant state change; set the font once in `love.load()` and only call `setFont()` when switching between different fonts.

---

## Architecture
- **[HIGH]** All game code (input, physics, rendering, AI, UI) in a single `main.lua` → monolithic and unmaintainable; split into Lua modules using `require()`: `src/player.lua`, `src/world.lua`, `src/ui.lua`, with clear interfaces between them.
- **[MEDIUM]** Lua `require()` module system not used → global functions and tables defined in `main.lua` polluting the global namespace; organize code into module files that return a table of functions and use `local M = {}; return M` pattern.
- **[MEDIUM]** All game state stored in global Lua variables → implicit dependencies and namespace collisions; use module-local state or pass state explicitly through function arguments.
- **[MEDIUM]** No state management for game screens (main menu, gameplay, pause, game over) → ad-hoc `if currentState == "menu"` branches throughout `love.update` and `love.draw`; implement a `GameState` module with `enter()`, `update(dt)`, `draw()`, and `exit()` callbacks.
- **[LOW]** Third-party state/scene libraries (hump.gamestate, knife.system) not considered for complex games → reinventing patterns already solved by the LÖVE ecosystem; evaluate established libraries before writing a custom state manager.

---

## Code Quality
- **[HIGH]** `love.update(dt)` received but `dt` not used for movement, animation, or timer updates → frame-rate-dependent behavior that runs differently at 30 FPS vs 144 FPS; always multiply all per-frame changes by `dt` to produce time-based values.
- **[MEDIUM]** Magic numbers for entity positions, sprite dimensions, tile sizes, and speed constants scattered throughout update and draw functions → changing one value requires a global search; extract all tuning constants into a top-level `conf` or `constants` module.
- **[MEDIUM]** `love.keyboard.isDown()` used for discrete single-press actions (pause, jump, menu select) instead of `love.keypressed()` callback → `isDown` returns true every frame the key is held; use the `love.keypressed(key)` callback for one-shot actions and `isDown` only for continuous held input.
- **[MEDIUM]** `love.graphics.print()` called with concatenated strings every frame → string allocation GC pressure; pre-format strings and cache them, updating only when the displayed value changes.
- **[LOW]** `love.resize(w, h)` callback not implemented for resizable windows → layout and camera coordinates not updated on window resize; implement `love.resize` and update any coordinate systems that depend on window dimensions.

---

## Common Bugs & Pitfalls
- **[HIGH]** `love.graphics.*` functions called outside of `love.draw()` (e.g., in `love.update()` or `love.load()`) → LÖVE requires all drawing to happen in `love.draw()`; calling graphics functions elsewhere raises an error; restrict all draw calls to the `love.draw()` callback.
- **[HIGH]** `love.load()` not releasing resources (canvases, images, physics worlds) before a game restart → memory leak on repeated restarts; explicitly set resource variables to `nil` and call `:release()` on LÖVE objects before reinitializing.
- **[MEDIUM]** Lua `#table` operator used on non-sequence tables (tables with nil holes or non-integer keys) → `#` returns undefined length for non-sequences; use an explicit `count` field or `table.maxn()` for sparse tables, and only use `#` on pure sequence tables.
- **[MEDIUM]** Box2D physics body not destroyed with `body:destroy()` when the associated game object is removed → the physics body remains in the world, consuming memory and participating in collisions invisibly; always call `body:destroy()` when removing a physics-enabled entity.
- **[MEDIUM]** `love.audio.newSource()` called inside `love.update()` or a frequently called function → each call loads and decodes the audio file; call `newSource()` once in `love.load()` and reuse the source, calling `source:seek(0); source:play()` to replay.
- **[LOW]** `love.filesystem` save directory not accessible on all platforms in the same way as the game directory → attempting to load from the source directory on a fused build fails; use `love.filesystem.getSourceBaseDirectory()` and `love.filesystem.getSaveDirectory()` and understand which is appropriate for each file type.
- **[LOW]** Floating-point `dt` accumulated over many frames in timers without resetting → floating-point drift causes timers to fire slightly off-schedule over long sessions; use integer millisecond counters or reset accumulators after each trigger.
