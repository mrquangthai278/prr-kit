# Pygame — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `import pygame`, `pygame.init()`, `pygame.display`, `pygame.event`, `pygame.draw`, `QUIT`, `clock.tick`

---

## Security
- **[MEDIUM]** Asset paths constructed from user-provided input passed to `pygame.image.load()` or `pygame.mixer.Sound()` → path traversal allowing arbitrary file reads; sanitize and validate all file paths against an allowlist directory.
- **[MEDIUM]** Multiplayer game accepting player inputs over the network without server-side validation → cheating by sending crafted move packets; validate all game actions server-side and treat client input as untrusted.
- **[MEDIUM]** Save game files serialized with `pickle` → `pickle.loads()` on a tampered save file executes arbitrary Python code; use `json` with strict schema validation instead of `pickle` for save data.
- **[LOW]** Hardcoded server IP addresses or API keys in source code → exposed in the distributed package; load configuration from environment variables or an encrypted config file.

---

## Performance
- **[HIGH]** `pygame.display.flip()` or `pygame.display.update()` called without frame rate limiting → game loop runs at thousands of FPS consuming 100% CPU/GPU; add `clock.tick(target_fps)` every frame.
- **[HIGH]** `pygame.Surface` objects created inside the game loop (new images, text renders, drawn shapes) → heap allocations every frame causing GC pressure and hitches; create surfaces once at startup or load time and reuse.
- **[HIGH]** `pygame.image.load()` called inside the game loop or `update()` function → blocking disk I/O on every frame; load all assets before the game loop starts and cache the returned surfaces.
- **[MEDIUM]** Loaded surfaces not converted with `.convert()` or `.convert_alpha()` → slow blitting due to pixel-format conversion at draw time; call `surface.convert()` (opaque) or `surface.convert_alpha()` (transparent) immediately after loading.
- **[MEDIUM]** Full-screen `display.fill()` + full redraw every frame instead of dirty rectangle updates → unnecessary pixel writes; use `pygame.display.update(dirty_rects)` with a list of changed regions for pixel-art or static-background games.
- **[MEDIUM]** Per-sprite draw calls not using `pygame.sprite.Group.draw()` batching → manual loops with more Python overhead; use `sprite.Group` for batch rendering.
- **[LOW]** `pygame.font.SysFont()` called every frame for text rendering → expensive font lookup and surface creation; pre-render text to a surface and only re-render when the text value changes.

---

## Architecture
- **[HIGH]** Entire game (event handling, update logic, rendering, asset loading) written in one function or module → monolithic and untestable; separate into distinct classes or modules: Game, Scene/State machine, Renderer, InputHandler, AssetManager.
- **[HIGH]** Game loop lacking separation between fixed-timestep `update(dt)` and `draw()` → movement speed is frame-rate dependent; use a fixed-timestep accumulator pattern to decouple physics/logic updates from rendering.
- **[MEDIUM]** No state machine for game screens (menu, game, pause, game-over) → ad-hoc `if` flags spread across the loop; implement a `Scene` base class with `handle_events`, `update`, and `draw` methods and a scene stack/manager.
- **[MEDIUM]** Event handling code mixed directly with game logic in the same block → hard to test input in isolation; route events through a dedicated input handler that sets state flags consumed by the update step.
- **[LOW]** No separation between game objects and their rendering → game objects directly call `screen.blit()`; decouple by having a renderer that takes game state and produces draw calls.

---

## Code Quality
- **[HIGH]** `pygame.quit()` not called before `sys.exit()` or on application close → SDL resources not released cleanly, potential hang on some platforms; always call `pygame.quit()` before exiting.
- **[MEDIUM]** Screen dimensions, target FPS, colors, and tile sizes hardcoded as numeric literals throughout the codebase → magic numbers cause inconsistency when changed; define all constants in a dedicated `constants.py` or `config.py` module.
- **[MEDIUM]** Not all relevant event types handled in the event loop (e.g., `VIDEORESIZE`, `ACTIVEEVENT`, window focus) → game behaves incorrectly on window resize or focus loss; handle all events the game needs to respond to.
- **[MEDIUM]** `pygame.key.get_pressed()` used for single-press actions (menu selection, firing) → returns held state, fires every frame; use `KEYDOWN` events for single-press actions and `get_pressed()` only for held-key movement.
- **[LOW]** `pygame.Vector2` not used for 2D position and velocity math → manual tuple arithmetic is error-prone and verbose; use `pygame.Vector2` for all 2D math to benefit from built-in methods.

---

## Common Bugs & Pitfalls
- **[HIGH]** Forgetting to call `pygame.display.flip()` or `pygame.display.update()` at the end of the draw step → screen buffer never presented, game shows a black or frozen window.
- **[HIGH]** Event loop (`for event in pygame.event.get()`) not called every frame → SDL event queue fills up, OS marks the window as "not responding" and may terminate it; always drain the event queue every frame.
- **[MEDIUM]** `pygame.time.Clock()` instantiated inside the game loop instead of before it → each iteration creates a new Clock with no frame history, making `clock.tick()` ineffective for rate limiting; create the Clock once before the loop.
- **[MEDIUM]** Blit coordinates passed as floats (e.g., from `Vector2` position) → `pygame.Surface.blit()` truncates silently, but accumulated float positions cause drift; convert to `int` explicitly: `screen.blit(img, (int(pos.x), int(pos.y)))`.
- **[MEDIUM]** `pygame.mixer.init()` not called before playing sounds, or audio not initialized with correct frequency/buffer settings → `pygame.error: mixer not initialized`; initialize the mixer with explicit parameters before loading any audio.
- **[LOW]** RGB color tuples with component values outside the 0–255 range → pygame wraps or raises depending on the surface format; always clamp color values with `max(0, min(255, value))`.
- **[LOW]** `pygame.sprite.Sprite.kill()` not called when removing sprites from groups → sprite remains in the group and continues to receive `update()` calls; always call `sprite.kill()` to remove from all groups.
