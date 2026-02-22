# Bevy — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `bevy`, `use bevy::`, `App::new()`, `add_systems(`, `Query<`, `Commands`, `Res<`, `ResMut<`, `Component`, `#[derive(Component)]`

---

## Security
- **[HIGH]** Scene files or asset files loaded from user-controlled paths via `AssetServer::load()` without path sanitization → directory traversal enabling access to sensitive files outside the asset directory; validate and canonicalize all user-supplied asset paths.
- **[MEDIUM]** Bevy's reflect system (`ReflectDeserialize`) used to deserialize untrusted data into registered types → arbitrary type instantiation via reflection; disable `ReflectDeserialize` on sensitive types or validate input schemas before deserialization.
- **[MEDIUM]** WebAssembly (WASM) builds exposing full game logic and asset paths in the browser bundle → no server-side authority; treat all WASM game state as untrusted for any competitive or monetized feature.
- **[LOW]** Debug systems (`bevy_inspector_egui`, world inspector) compiled into release builds → runtime scene manipulation exposed; gate debug plugins behind `#[cfg(debug_assertions)]`.

---

## Performance
- **[HIGH]** Systems with overly broad queries (`Query<&mut Transform>`) locking entire archetypes → prevents parallel system execution; narrow queries with `With<PlayerMarker>`, `Without<Static>`, and other filters to reduce contention.
- **[HIGH]** Missing `With<T>` or `Without<T>` filter markers in queries that iterate a subset of entities → Bevy schedules these as potentially conflicting with broader systems; add explicit filter components to enable parallelism.
- **[HIGH]** Compute-heavy work (pathfinding, physics solving, procedural generation) running in `Update` schedule without frame budget awareness → frame time spikes; offload to `AsyncComputeTaskPool` and poll results with `Task<T>`.
- **[HIGH]** Entities spawned and despawned every frame (projectiles, particles) without recycling → archetype fragmentation causing layout churn; use an object pool pattern with `Visibility` toggling and component reuse.
- **[MEDIUM]** Unnecessary `.chain()` on systems that have no actual data dependency → forces sequential execution where parallelism is possible; only chain systems that genuinely require ordering.
- **[MEDIUM]** Per-system local state stored in a `Resource` instead of `Local<T>` → shared resource access contends with other systems; use `Local<T>` for system-private state that no other system needs.
- **[LOW]** `bevy/trace` and `bevy/trace_chrome` features not used during profiling → bottlenecks identified only by guessing; enable tracing features to get a flame graph of system execution.

---

## Architecture
- **[HIGH]** Single large system handling input, physics updates, animation, and rendering logic → violates ECS principles and prevents parallelism; decompose into small, single-purpose systems with explicit scheduling relationships.
- **[HIGH]** Cross-system communication done via shared `ResMut<T>` instead of Bevy's `EventWriter<E>` / `EventReader<E>` → tight data coupling and ordering sensitivity; use Bevy events for decoupled, ordered inter-system communication.
- **[MEDIUM]** Game phase transitions (Menu → Loading → Playing → Paused → GameOver) not modeled with Bevy `States` → ad-hoc flags scattered across resources; define a `#[derive(States)]` enum and use `OnEnter`/`OnExit`/`in_state` to scope systems.
- **[MEDIUM]** Related systems, components, and resources not grouped into `Plugin` implementations → flat `App` setup becomes unmanageable; use the Plugin pattern to encapsulate cohesive game systems.
- **[MEDIUM]** Configuration and tuning data hardcoded in system logic → must recompile to tune; load from Bevy asset files (`ron`, `json`) via the asset system for hot-reloadable configuration.
- **[LOW]** No `Name` component added to spawned entities → Bevy Inspector and logging show only entity IDs with no context; add `.insert(Name::new("PlayerShip"))` to all meaningful entities.

---

## Code Quality
- **[HIGH]** `Query::get(entity).unwrap()` or `Query::single().unwrap()` used without error handling → panics when the entity is missing, despawned, or the query matches multiple entities; use `if let Ok(...)` or return early on `Err`.
- **[HIGH]** Multiple systems in the same schedule accessing the same `ResMut<T>` without explicit ordering → Bevy may warn or schedule them non-deterministically; add `.before()`/`.after()` constraints or split the resource.
- **[MEDIUM]** `#[derive(Resource)]` or `#[derive(Component)]` derive macros not used on custom types → manual impl required and easily missed; always derive these traits rather than implementing them manually.
- **[MEDIUM]** System ordering constraints not declared when a system reads data written by another in the same schedule → non-deterministic order between runs; use `app.add_systems(Update, writer.before(reader))`.
- **[MEDIUM]** `Commands` used to despawn entities and the same entity queried in a later system within the same schedule → despawn is deferred to end of schedule, query still sees it; be aware of command application timing.
- **[LOW]** Missing `Name` component on spawned entities → Bevy inspector and log output show raw `Entity(id, gen)` with no human-readable label; add `Name::new("description")` to entities during spawn.

---

## Common Bugs & Pitfalls
- **[HIGH]** Entity spawned with `Commands::spawn()` and then queried in the same system or a system in the same schedule set → `Commands` are applied at the end of the schedule; use `Added<T>` filter in a subsequent system to react to newly spawned entities.
- **[HIGH]** `Resource` not inserted into the `App` before a system that uses `Res<T>` or `ResMut<T>` runs → Bevy panics at startup with a "resource not found" error; ensure all resources are inserted via `app.insert_resource()` or `app.init_resource()` before any system accesses them.
- **[MEDIUM]** `Changed<T>` filter not triggering as expected → change detection is deferred; components mutably accessed via `Query<&mut T>` are marked changed even if the value was not actually modified; use `DetectChangesMut::set_if_neq()` to avoid spurious change detection.
- **[MEDIUM]** Exclusive systems (taking `&mut World` directly) blocking all parallel system execution → used unnecessarily for simple tasks that a normal system with appropriate queries could handle; reserve exclusive systems for operations that genuinely require full world access.
- **[MEDIUM]** Event not read by any system before it is cleared at the end of the next frame → Bevy clears events after two frames; if an event needs to persist longer, store it in a resource or use a `FixedUpdate` reader.
- **[LOW]** `App::run()` called on the main thread in a context that also needs async runtime access → `App::run()` blocks indefinitely; for non-game executables using Bevy for ECS only, use `app.update()` in a manual loop or run Bevy in a dedicated thread.
