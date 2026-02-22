# Three.js — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from 'three'`, `THREE.`, `WebGLRenderer`, `Scene`, `PerspectiveCamera`, `AnimationMixer`, `from '@react-three/fiber'`

---

## Security
- **[HIGH]** Loading 3D models (GLTF, OBJ, FBX) from user-supplied URLs without validation → SSRF, loading of malicious files from internal network. Validate URLs against an allowlist and load only from trusted origins.
- **[HIGH]** Executing code stored in `userData` property of loaded 3D objects → arbitrary code execution from untrusted model files. Never `eval` or invoke functions sourced from loaded model metadata.
- **[MEDIUM]** Cross-origin textures loaded with `THREE.TextureLoader` without explicit CORS policy on the asset server → WebGL security error or silent failure. Set `crossOrigin = 'anonymous'` on the loader and ensure the asset server sends CORS headers.
- **[MEDIUM]** Renderer canvas element accessible and writable by untrusted third-party scripts on the page → canvas poisoning or pixel data theft via `getImageData`. Apply Content Security Policy and isolate the canvas from third-party script access.
- **[LOW]** Debug helpers (`AxesHelper`, `GridHelper`, `Stats`) left in production builds → scene structure and performance metrics exposed. Gate all helpers behind a `DEBUG` flag.

---

## Performance
- **[CRITICAL]** Geometries, materials, and textures not disposed when objects are removed from the scene → GPU memory leak that grows indefinitely. Always call `geometry.dispose()`, `material.dispose()`, and `texture.dispose()` before removing objects, and call `renderer.dispose()` on teardown.
- **[HIGH]** Animation loop running without `requestAnimationFrame` (e.g., `setInterval`) → uncapped frame rate, excessive CPU/GPU usage, and frame timing drift. Always drive the render loop with `requestAnimationFrame` or R3F's `useFrame`.
- **[HIGH]** `castShadow` and `receiveShadow` enabled on all objects indiscriminately → shadow map recalculated for every shadow-casting object each frame. Enable shadows only on objects that require them and use `renderer.shadowMap.autoUpdate = false` for static scenes.
- **[HIGH]** High-polygon geometry without Level of Detail (LOD) → frame budget exceeded for distant or small objects. Implement `THREE.LOD` with reduced-poly meshes at increasing distances.
- **[HIGH]** Uncompressed textures (PNG/JPEG) loaded directly → excessive VRAM usage and long load times. Use KTX2/Basis compressed textures via `KTX2Loader` for GPU-native formats.
- **[MEDIUM]** New `THREE.Vector3`, `THREE.Color`, or `THREE.Matrix4` instantiated inside the animation loop → garbage collection pauses causing frame drops. Pre-allocate reusable objects outside the loop and use `.set()` to update values.
- **[MEDIUM]** No frustum culling awareness for large scenes with many off-screen objects → GPU draw calls wasted on invisible geometry. Enable `object.frustumCulled = true` (default) and avoid disabling it without reason.

---

## Architecture
- **[HIGH]** All scene setup, animation, and interaction logic in a single file or class → unmaintainable God object. Separate scene graph setup, animation system, asset loading, and input handling into distinct modules.
- **[HIGH]** Animation loop (`requestAnimationFrame` callback) not stopped on component unmount → renderer continues consuming GPU resources after the component is gone. Store the animation frame ID and call `cancelAnimationFrame(id)` on cleanup.
- **[MEDIUM]** Assets loaded without `GLTFLoader` Draco or Meshopt compression → large file sizes increasing time-to-interactive. Use `DRACOLoader` or `MeshoptDecoder` with `GLTFLoader` for geometry compression.
- **[MEDIUM]** Physics or game logic calculations tied directly to frame rate inside `renderer.render()` callback → simulation speed varies with display refresh rate. Use a fixed timestep accumulator pattern separate from the render loop.
- **[LOW]** No asset loading manager (`THREE.LoadingManager`) → no coordinated loading progress or error handling across multiple assets. Use a shared `LoadingManager` to track and report loading state.

---

## Code Quality
- **[HIGH]** `renderer.render(scene, camera)` called without a `resize` event handler updating renderer size and camera aspect ratio → distorted perspective on window resize or container size change. Add `ResizeObserver` or `window.resize` handler calling `renderer.setSize()` and updating `camera.aspect` then `camera.updateProjectionMatrix()`.
- **[MEDIUM]** Manual `requestAnimationFrame` loop used inside React components instead of R3F's `useFrame` hook → conflicts with R3F's render loop causing double renders. Use `useFrame` exclusively when working within React Three Fiber.
- **[MEDIUM]** Three.js objects not typed with JSDoc or TypeScript imports → autocompletion and type safety lost. Import types from `three` and annotate all scene object variables explicitly.
- **[MEDIUM]** `renderer.setPixelRatio(window.devicePixelRatio)` not capped → on high-DPI displays, pixel ratio of 3+ multiplies GPU work by 9x. Cap with `Math.min(window.devicePixelRatio, 2)`.
- **[LOW]** `Object3D.name` properties left empty on scene graph nodes → debugging via `scene.getObjectByName()` impossible and DevTools scene inspector uninformative. Assign meaningful names to all significant scene objects.

---

## Common Bugs & Pitfalls
- **[CRITICAL]** Geometry and material not disposed when mesh is removed from scene → GPU memory leak; application slows and crashes over time. Implement a disposal utility that traverses removed subtrees and calls `dispose()` on all geometry and material instances.
- **[HIGH]** Z-fighting artifacts from two coplanar geometries (e.g., decal on a surface) → flickering at shared depth. Apply `polygonOffset: true` with `polygonOffsetFactor` and `polygonOffsetUnits` to the front material.
- **[HIGH]** Camera aspect ratio not updated after renderer resize → scene appears squashed or stretched. Always call `camera.aspect = width / height` and `camera.updateProjectionMatrix()` in the resize handler.
- **[MEDIUM]** `AnimationMixer` actions not stopped and mixer not `uncacheRoot`'d before disposing the associated object → animation system holds a reference, preventing GC. Call `mixer.stopAllAction()` and `mixer.uncacheRoot(mesh)` before removal.
- **[MEDIUM]** `Raycaster` not updated by calling `raycaster.setFromCamera(mouse, camera)` immediately before `intersectObjects()` → intersection test uses stale camera state, returning wrong or no hits.
- **[MEDIUM]** `WebGLRenderer` created multiple times without disposing the previous instance → each renderer allocates a WebGL context; browsers limit WebGL contexts per page. Reuse a single renderer instance or dispose before creating a new one.
- **[LOW]** `OrbitControls` `update()` not called in animation loop when `enableDamping` is true → damping never resolves, camera movement is choppy. Call `controls.update()` every frame when damping is enabled.
