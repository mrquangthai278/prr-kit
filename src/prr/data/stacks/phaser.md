# Phaser — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `phaser`, `from 'phaser'`, `Phaser.Game`, `new Phaser.Game`, `this.physics`, `this.add.sprite`, `preload()`, `create()`, `update()`

---

## Security
- **[HIGH]** Asset URLs constructed from user-provided input and passed to `this.load.image()` or `this.load.atlas()` → loading arbitrary remote assets; validate all asset URLs against an allowlist before loading.
- **[HIGH]** `new Function()` or `eval()` used for mod scripting or dynamic game logic → arbitrary JavaScript execution in the browser; use a sandboxed expression evaluator or a restricted scripting API.
- **[MEDIUM]** Game state (score, level, items) stored only in client-side `localStorage` or URL hash → trivially modified by players; validate all meaningful state server-side for competitive or monetized games.
- **[MEDIUM]** WebSocket game server accepting move/action messages without server-side legality checks → cheating by sending crafted messages; authoritative server must validate every action independently.
- **[LOW]** Third-party Phaser plugins loaded from untrusted CDN without subresource integrity (SRI) hashes → supply-chain attack via CDN compromise; pin plugin versions and add `integrity` attributes.

---

## Performance
- **[HIGH]** Sprites and images not packed into texture atlases → one draw call per sprite; use `this.load.atlas()` with a texture packer tool to batch rendering into a single draw call.
- **[HIGH]** `this.add.sprite()`, `this.add.image()`, or `this.physics.add.*()` called inside `update()` → creates new game objects every frame; create objects once in `create()` and reuse via an object pool.
- **[HIGH]** Physics bodies attached to all game objects including static decorative elements → unnecessary physics simulation cost; only enable physics on objects that require collision or movement.
- **[MEDIUM]** Expensive calculations (pathfinding, distance checks across all entities) run every frame in `update()` → CPU bottleneck; throttle with frame counters or use Phaser's `Time.addEvent` for periodic checks.
- **[MEDIUM]** Camera not configured with `roundPixels: true` for tile-based or pixel-art games → sub-pixel rendering causes blurry, shimmering sprites; enable `roundPixels` in the game config.
- **[MEDIUM]** Tween animations re-created every time they play instead of using `TweenManager` restart → unnecessary allocation; create tweens once and call `tween.restart()`.
- **[LOW]** `antialias: true` (Phaser default) used for pixel-art games → bilinear filtering blurs pixel art; set `antialias: false` and `pixelArt: true` in game config.

---

## Architecture
- **[HIGH]** All game logic implemented in a single Scene class → God object that is impossible to test or extend; split into multiple Scenes (Boot, Preload, Menu, Game, UI) and use Phaser's Scene plugin system for shared services.
- **[HIGH]** Game state not managed via Phaser's Scene lifecycle → ad-hoc flags and globals shared between scenes; use `this.scene.start('GameScene', data)` to pass state and separate scene responsibilities cleanly.
- **[MEDIUM]** Cross-object communication done via direct method calls or global variables instead of Phaser's event emitter → tight coupling; use `this.events.emit()` / `this.events.on()` or the global `this.game.events` bus.
- **[MEDIUM]** Asset keys hardcoded as repeated magic strings (`'player'`, `'bullet'`) across multiple files → typo bugs cause silent load failures; centralize keys in a constants module.
- **[MEDIUM]** Input handling scattered across multiple `update()` functions without a dedicated input manager → inconsistent state; centralize input in a dedicated handler class or Scene plugin.
- **[LOW]** Manual animation loops in `update()` incrementing frame counters instead of using Phaser's `AnimationManager` → duplicated logic; define animations with `this.anims.create()` and play by key.

---

## Code Quality
- **[HIGH]** Assets not loaded in `preload()` before being used in `create()` or `update()` → runtime errors when texture key is missing; load all required assets in `preload()` with proper load-error handlers.
- **[MEDIUM]** Arrow functions not used for callbacks that reference `this` (e.g., `this.input.on('pointerdown', function() { this.jump() })`) → `this` is `undefined` or `window`; use arrow functions or `.bind(this)`.
- **[MEDIUM]** Physics overlap or collider callbacks referencing objects that may have been destroyed → callback fires on a destroyed object; check `gameObject.active` inside collision callbacks before processing.
- **[MEDIUM]** `this.scene.pause()` or `this.scene.stop()` not cleaning up event listeners added via `this.input.on()` → listeners persist across scene restarts; remove listeners in the Scene's `shutdown` event handler.
- **[LOW]** Debug physics rendering (`debug: true` in arcade physics config) left enabled in production → visible collision boxes and performance overhead; disable for non-development builds.

---

## Common Bugs & Pitfalls
- **[HIGH]** `this.add.image()` or `this.add.sprite()` called inside `update()` → thousands of overlapping game objects created in seconds; always create display objects in `create()` and toggle visibility instead.
- **[HIGH]** Input event listeners (`this.input.on(...)`) added in `create()` not removed in the Scene `shutdown` event → listeners survive Scene restarts, resulting in multiple handlers firing per event; clean up in `this.events.on('shutdown', ...)`.
- **[MEDIUM]** Texture key used in `this.add.sprite(x, y, 'key')` not matching the key used in `this.load.image('key', url)` → sprite renders as invisible or shows missing-texture error; keys must match exactly (case-sensitive).
- **[MEDIUM]** Camera bounds not set with `this.cameras.main.setBounds()` in tiled worlds → camera follows player off the edge of the map; always set bounds to match tilemap dimensions.
- **[MEDIUM]** `this.physics.add.group()` objects not recycled with `group.killAndHide()` + `group.get()` pattern → pool not used, defeating its purpose; use `classType` on the group and `get()`/`killAndHide()` for pooling.
- **[LOW]** `setInteractive()` not called on a game object before registering pointer events → pointer callbacks silently never fire; always call `setInteractive()` before `on('pointerdown', ...)`.
- **[LOW]** Scene `data` not cleared between runs → stale state from a previous play-through bleeds into the next; reset all scene-local state in the `create()` method or pass fresh data via `this.scene.restart(data)`.
