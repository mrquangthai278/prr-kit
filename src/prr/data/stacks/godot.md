# Godot — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.gd` GDScript files, `*.tscn` scenes, `extends Node`, `func _ready()`, `func _process()`, `export var`, `@export`, `Godot`, `project.godot`

---

## Security
- **[HIGH]** `OS.execute()` or `OS.shell_open()` called with user-controlled arguments → command injection on the host OS; never pass untrusted input to OS execution APIs.
- **[HIGH]** HTTP requests made to user-provided URLs without validation → SSRF and malicious content fetching; validate URLs against an allowlist before any network request.
- **[HIGH]** Save game files loaded with `JSON.parse()` or `ResourceLoader.load()` without schema validation → crashes or exploits from malformed data; validate all fields and types after deserialization.
- **[MEDIUM]** `get_node()` called with a `NodePath` derived from user input → accessing arbitrary nodes in the scene tree; never construct node paths from untrusted data.
- **[MEDIUM]** Autoload singletons storing authentication tokens or private game state accessible from any script → overly broad attack surface; restrict sensitive data access to dedicated, narrowly scoped systems.
- **[LOW]** GDScript source files not encrypted in exported project (`Export > Resources > Script export mode`) → readable with PCK extraction tools; use bytecode-only export and PCK encryption for commercial titles.

---

## Performance
- **[HIGH]** Heavy computation (pathfinding, collision queries, string building) in `_process(delta)` → called every frame at full refresh rate; move to `_physics_process`, signals, timers, or background threads via `Thread`.
- **[HIGH]** `get_node()` or `$NodePath` shorthand called every frame instead of cached in `_ready()` → repeated scene-tree traversal; cache all node references as member variables in `_ready()`.
- **[HIGH]** Nodes instantiated and freed every frame (bullets, particles, effects) without pooling → GC pressure and frame spikes; implement a node pool using `queue_free()` + `visible = false` recycling.
- **[HIGH]** Large images imported without enabling appropriate compression (VRAM-compressed formats like S3TC, ETC2, BPTC) → excessive VRAM usage; configure import settings per texture type.
- **[MEDIUM]** `await get_tree().process_frame` used in tight loops without frame budget awareness → logic spread across many deferred frames; batch work with explicit budgeting.
- **[MEDIUM]** Signals not disconnected when nodes are freed → potential callbacks on freed objects; always disconnect signals in `_exit_tree()` or use `connect(..., CONNECT_ONE_SHOT)`.
- **[LOW]** `VisibleOnScreenNotifier2D`/`VisibleOnScreenNotifier3D` not used for off-screen objects that run `_process` → wasted CPU on invisible nodes; disable processing when off-screen.

---

## Architecture
- **[HIGH]** Scene tree traversal using `get_parent().get_parent().get_child(2)` chains → brittle structural coupling; use signals, groups, or exported node references for cross-node communication.
- **[HIGH]** Autoloads used as a dumping ground for all shared state and logic → implicit global coupling that makes scenes non-portable; limit autoloads to truly global services and use scene-local composition otherwise.
- **[MEDIUM]** Node-to-node communication done by calling methods directly on sibling or parent nodes instead of emitting signals → tight coupling; emit signals upward and call methods downward.
- **[MEDIUM]** Game logic embedded in UI nodes (`Button`, `Label` subclasses with game rules) → untestable in isolation; separate game logic into non-UI Node or RefCounted classes.
- **[MEDIUM]** Data not modeled as `Resource` subclasses → ad-hoc dictionaries passed everywhere; use typed `Resource` subclasses with `@export` fields for all structured data.
- **[LOW]** Scenes not decomposed into reusable sub-scenes → monolithic tscn files that are hard to maintain; extract repeating structures into their own scenes.

---

## Code Quality
- **[HIGH]** `@export` variables declared without type hints (`@export var speed` instead of `@export var speed: float`) → no editor type validation or static analysis; always type all exported variables.
- **[HIGH]** Return value of `get_node()` used without null check on nodes that may be absent → "Invalid get index" runtime error; null-check or use `has_node()` before access.
- **[MEDIUM]** GDScript functions and variables declared without type hints → static analyzer and Godot's type checker cannot catch errors; add type annotations to all declarations.
- **[MEDIUM]** `match` statement without a default `_:` branch for enum-like values → unhandled states silently fall through; always include a default branch that asserts or logs.
- **[MEDIUM]** Signals defined but never emitted, or emitted but never connected → dead code or broken communication channels; audit all signal definitions for use.
- **[LOW]** Node names containing spaces (e.g., `"My Node"`) → `$My Node` shorthand breaks; use PascalCase or snake_case node names consistently.

---

## Common Bugs & Pitfalls
- **[HIGH]** Holding a reference to a node after `queue_free()` and accessing it on the next frame → "Object was deleted" crash; use `is_instance_valid(node)` before accessing any potentially freed node.
- **[HIGH]** Signal connected multiple times (e.g., inside `_process` or on scene re-entry) without checking for existing connections → callback invoked multiple times per event; use `is_connected()` guard or `CONNECT_ONE_SHOT`.
- **[HIGH]** `_ready()` called before parent node's `_ready()` has completed in child-first order → child accesses parent state that is not yet initialized; use `call_deferred()` or `await owner.ready` for deferred initialization.
- **[MEDIUM]** `CharacterBody2D`/`CharacterBody3D` velocity not reset to zero before applying new movement each frame → accumulated velocity causing unintended drift; reset or reassign `velocity` explicitly each physics frame.
- **[MEDIUM]** `@export` variable default value changed in script after the scene has been saved → saved scene retains old serialized value, script default ignored; reset the property in the scene inspector after changing script defaults.
- **[MEDIUM]** `Timer` node not stopped and freed when the owning node is removed → timer fires callback on a freed object; always call `timer.stop()` in `_exit_tree()`.
- **[LOW]** Integer division used unintentionally in GDScript 4 (`5 / 2 == 2`) → use `float(5) / 2` or `5.0 / 2.0` for fractional results.
