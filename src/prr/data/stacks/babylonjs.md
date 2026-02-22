# Babylon.js — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `babylonjs`, `from '@babylonjs/core'`, `BABYLON.`, `Engine`, `Scene`, `Mesh`, `ArcRotateCamera`, `babylon`

---

## Security
- **[HIGH]** Meshes or scenes loaded via `SceneLoader.ImportMesh()` from user-provided URLs → loading arbitrary 3D assets including GLTF files with embedded scripts; validate URLs against an allowlist and disable `allowPendingTexturesInBackground` for untrusted sources.
- **[HIGH]** GLTF files loaded without sanitization → GLTF 2.0 can embed custom extensions with executable logic; strip unrecognized extensions or load from trusted sources only.
- **[MEDIUM]** Babylon.js Inspector (`scene.debugLayer.show()`) exposed in production builds → full scene graph manipulation and state inspection available in the browser; guard with environment checks and strip from production bundles.
- **[MEDIUM]** Texture CDN not configured with appropriate CORS headers → cross-origin texture loading blocked or insecure wildcard `Access-Control-Allow-Origin: *`; configure CDN CORS specifically for your domain.
- **[LOW]** WebXR session not exiting properly when user navigates away → lingering XR session can lock browser XR APIs; handle `session.end()` in `beforeunload` and `visibilitychange` events.

---

## Performance
- **[CRITICAL]** Meshes, materials, or textures not disposed when removed from the scene → GPU memory leak accumulates over time; always call `mesh.dispose()`, `material.dispose()`, and `texture.dispose()` when objects are no longer needed.
- **[HIGH]** Shadow generators attached to point lights or multiple lights → shadow map rendering is extremely expensive; limit shadow generation to a single directional or spot light and use shadow-only meshes.
- **[HIGH]** Repeated identical geometry not using `InstancedMesh` → one draw call per mesh copy; use `mesh.createInstance()` for any geometry rendered more than a handful of times.
- **[HIGH]** Physics impostors attached to every small decorative mesh → unnecessary physics simulation overhead; apply physics only to meshes that require collision response.
- **[MEDIUM]** Large GLTF/GLB assets not compressed with Draco geometry compression and KTX2 texture compression → slow downloads and high memory usage; compress with `gltf-transform` before serving.
- **[MEDIUM]** LOD levels not configured for complex meshes via `mesh.addLODLevel(distance, lodMesh)` → full-detail meshes rendered at all distances; add at least two LOD levels for meshes visible across a large distance range.
- **[MEDIUM]** Render loop (`engine.runRenderLoop`) not stopped and engine not disposed when the component or page unmounts → continued GPU usage after navigation; call `engine.stopRenderLoop()` and `engine.dispose()` on cleanup.
- **[LOW]** `scene.getMeshByName()` or `scene.getMaterialByName()` called inside the render loop → O(n) linear scan every frame; cache references at scene creation time.

---

## Architecture
- **[HIGH]** All scene setup, game logic, animation, and input handling in a single file or function → monolithic; decompose into class-based systems (SceneManager, InputController, AssetLoader) with clear responsibilities.
- **[MEDIUM]** Inter-system communication done via direct object references instead of Babylon.js's `Observable` system → tight coupling; use `scene.onBeforeRenderObservable`, custom `Observable` instances, or an event bus for decoupled communication.
- **[MEDIUM]** Assets loaded ad-hoc with individual `SceneLoader` calls instead of a centralized `AssetsManager` → no load progress tracking and harder error handling; use `AssetsManager` with task queuing for all asset loading.
- **[MEDIUM]** Materials created per mesh even when identical → redundant GPU state changes; create one material and assign it to all meshes sharing the same appearance.
- **[LOW]** Scene hierarchy not organized with parent `TransformNode` containers for logical groups of meshes → difficult to apply group transforms; use `TransformNode` as a lightweight parent for organizing mesh groups.

---

## Code Quality
- **[HIGH]** Babylon.js used without TypeScript → full type definitions available via `@babylonjs/core`; use TypeScript to catch API misuse at compile time.
- **[HIGH]** `scene.dispose()` not called when switching between multiple scenes → previous scene's resources remain in GPU memory; always dispose the old scene before creating a new one.
- **[MEDIUM]** `engine.resize()` not called in a `window.resize` event listener → canvas rendering at wrong resolution after browser window resize; hook `window.addEventListener('resize', () => engine.resize())`.
- **[MEDIUM]** `Vector3` objects created inside the render loop for intermediate calculations → GC pressure from frequent heap allocation; use `Vector3.TransformCoordinatesToRef()` and in-place methods (`addInPlace`, `scaleInPlace`) for hot paths.
- **[MEDIUM]** Animation groups not stopped before mesh disposal → Babylon continues animating a disposed mesh → errors; always call `animationGroup.stop()` before `mesh.dispose()`.
- **[LOW]** Babylon.js version not pinned in `package.json` → breaking API changes across minor versions; pin to an exact version or use `~` patch-range pinning.

---

## Common Bugs & Pitfalls
- **[HIGH]** GPU memory leak from not disposing meshes, textures, and materials over the application lifetime → progressive slowdown and eventual browser crash; audit every dynamic object creation to ensure a corresponding `dispose()` call.
- **[HIGH]** Animation not stopped before its target mesh is disposed → Babylon.js throws errors on the next render frame; stop all animations targeting a mesh before disposing it.
- **[MEDIUM]** `Vector3` arithmetic methods (`add`, `scale`, `normalize`) returning new instances not assigned back → original vector unchanged; use `addInPlace`, `scaleInPlace`, `normalizeToRef` for mutation or capture the returned value.
- **[MEDIUM]** WebXR session not properly ended on user exit or navigation → browser WebXR API remains locked; listen to `xrSession.addEventListener('end', ...)` and handle cleanup explicitly.
- **[MEDIUM]** Babylon.js uses a left-handed coordinate system by default (unlike Three.js which is right-handed) → imported assets may appear mirrored; account for the handedness difference when migrating assets from other 3D frameworks.
- **[LOW]** `PickingInfo.hit` not checked before accessing `PickingInfo.pickedMesh` → `pickedMesh` is null when no mesh was hit; always guard with `if (pickResult.hit && pickResult.pickedMesh)`.
- **[LOW]** `scene.onPointerObservable` callbacks not removed when the associated UI or game object is destroyed → stale pointer handlers firing on removed objects; unregister with `observable.remove(observer)`.
