# OpenGL — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `#include <GL/`, `#include <OpenGL/`, `glCreateShader`, `glDrawElements`, `glBindBuffer`, `GLSL`, `*.vert`, `*.frag`, OpenGL with C/C++/Python

---

## Security
- **[HIGH]** GLSL shader source compiled from user-provided or network-fetched strings → malformed shader source can trigger GPU driver crashes, hangs, or denial of service; only compile shader source from trusted, reviewed files bundled with the application.
- **[HIGH]** Buffer sizes not validated before passing to `glBufferData()` or `glBufferSubData()` → oversized uploads may corrupt driver memory or cause undefined behavior; validate buffer sizes against allocated storage before every upload.
- **[MEDIUM]** OpenGL error checking (`glGetError()`) not performed after resource creation calls → resource creation failures silently return invalid handles (0), causing subtle corruption later; check errors after every `glGen*`/`glCreate*` call in debug builds.
- **[LOW]** Debug output (`GL_DEBUG_OUTPUT`) not stripped or gated in release builds → verbose driver messages may leak internal renderer details; disable or redirect debug output in production.

---

## Performance
- **[CRITICAL]** Draw calls not batched → each `glDrawElements()` or `glDrawArrays()` call carries CPU-to-GPU synchronization overhead; batch geometry into a single VBO/VAO per material and use instanced rendering (`glDrawElementsInstanced`) for repeated geometry.
- **[HIGH]** `glGetError()` called every frame inside the render loop → synchronizes CPU and GPU pipeline, causing a stall; use `GL_DEBUG_OUTPUT` with a callback for development and remove all `glGetError()` from the hot render path.
- **[HIGH]** Vertex Array Objects (VAOs) not used or re-specified per draw call → full vertex attribute state must be re-configured each time; bind a VAO per unique vertex layout and reuse it.
- **[HIGH]** Vertex buffer data uploaded every frame for geometry that does not change → unnecessary CPU-GPU transfers; use `GL_STATIC_DRAW` hint for immutable geometry and only call `glBufferSubData()` for the portion that changes.
- **[HIGH]** Textures not using mipmaps for geometry rendered at variable distances → cache misses and aliasing artifacts on distant surfaces; generate mipmaps with `glGenerateMipmap()` and set `GL_TEXTURE_MIN_FILTER` to a mipmap mode.
- **[MEDIUM]** Uniform variables updated individually with repeated `glUniform*` calls instead of using Uniform Buffer Objects (UBOs) → excessive CPU-GPU round trips for shared per-frame data; pack shared uniforms (view/projection matrices, lights) into a UBO bound once per frame.
- **[MEDIUM]** Overdraw not managed (multiple opaque fragments rendered per pixel) → fragment shader runs on pixels whose result is discarded by a later opaque draw; sort opaque objects front-to-back and use early-Z testing.
- **[LOW]** Shader programs not shared between objects that use the same material → redundant `glUseProgram()` calls and duplicated GPU program state; sort draw calls by shader program to minimize state changes.

---

## Architecture
- **[HIGH]** OpenGL state machine state not tracked at the application level → leftover bindings from one draw pollute the next; maintain an explicit state cache or use a DSA (Direct State Access) approach to minimize implicit state.
- **[HIGH]** GPU resource handles (textures, buffers, shaders, framebuffers) not managed with RAII wrappers → handles leak when exceptions occur or ownership is unclear; wrap all handles in RAII classes with destructors that call the corresponding `glDelete*`.
- **[MEDIUM]** Raw OpenGL calls scattered throughout application code instead of behind a renderer abstraction → tightly coupled to OpenGL, impossible to port to Vulkan or Metal; abstract the GPU API behind a renderer interface.
- **[MEDIUM]** Shader source GLSL `#version` directive not matching the OpenGL context version → shaders may silently fall back to older GLSL or fail to compile; explicitly request the context version and match the `#version` directive.
- **[LOW]** No asset pipeline for compiling, validating, and caching SPIR-V or precompiled shaders → shaders compiled from source at startup every run; precompile shaders and cache binary programs with `glProgramBinary()`.

---

## Code Quality
- **[HIGH]** `glDeleteBuffers()`, `glDeleteTextures()`, `glDeleteShader()`, and `glDeleteProgram()` not called for every created resource → GPU memory and handle leaks accumulate over the application lifetime; audit every `glGen*`/`glCreate*` call for a corresponding `glDelete*`.
- **[HIGH]** Shader compilation result not checked with `glGetShaderiv(shader, GL_COMPILE_STATUS, &status)` → compilation errors silently produce an invalid program; always check compile and link status and retrieve the info log on failure.
- **[MEDIUM]** `GL_DEBUG_OUTPUT` not enabled during development → driver-level errors and performance warnings go undetected; enable with `glEnable(GL_DEBUG_OUTPUT)` and `glDebugMessageCallback()` in debug builds.
- **[MEDIUM]** Attribute and uniform locations hardcoded as integer literals instead of queried with `glGetAttribLocation()`/`glGetUniformLocation()` → breaks silently when the shader is modified; query locations after program linking and cache them.
- **[MEDIUM]** Fragment shader computing values that could be computed in the vertex shader → unnecessary per-fragment computation; move lighting precomputation and invariant calculations to the vertex stage where possible.
- **[LOW]** Y-axis direction inconsistency between OpenGL NDC (Y-up) and image coordinate space (Y-down) not handled → textures appear upside down; flip V coordinate in texture UVs or flip the image on load.

---

## Common Bugs & Pitfalls
- **[HIGH]** `glBindBuffer(GL_ARRAY_BUFFER, 0)` called before `glVertexAttribPointer()` → the VAO records a null buffer binding for that attribute → geometry invisible or garbage on screen; always bind the VBO before calling `glVertexAttribPointer()`.
- **[HIGH]** Clip-space coordinates outside NDC range `[-1, 1]` in X, Y, and `[0, 1]` or `[-1, 1]` in Z depending on depth range → geometry silently clipped and invisible; verify projection matrix parameters produce correct NDC for the scene's near/far planes.
- **[MEDIUM]** Texture coordinate `(0, 0)` assumed to be at top-left but OpenGL places it at bottom-left → textures rendered upside down; flip the V coordinate in UVs (`v_flipped = 1.0 - v`) or load images with vertical flip enabled.
- **[MEDIUM]** Depth buffer not included in `glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)` each frame → z-buffer retains previous frame's values → z-fighting and incorrect depth test results; always clear both color and depth buffers.
- **[MEDIUM]** Framebuffer completeness not checked with `glCheckFramebufferStatus()` after setup → incomplete framebuffer silently renders nothing; always check and log framebuffer status after attaching all textures and renderbuffers.
- **[LOW]** Front-face winding order (`GL_CW` vs `GL_CCW`) set inconsistently with asset exporter settings → back-face culling removes the wrong faces, making geometry invisible from the front; verify winding order matches the DCC tool's export convention.
- **[LOW]** `glEnable(GL_DEPTH_TEST)` not called when depth testing is needed → all fragments pass depth test regardless of Z value → incorrect overdraw; explicitly enable depth testing and set `glDepthFunc(GL_LESS)`.
