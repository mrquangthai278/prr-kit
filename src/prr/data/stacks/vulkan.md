# Vulkan — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `vulkan`, `vk::`, `VkInstance`, `VkDevice`, `vkCreateInstance`, `vulkan.h`, `VK_`, SPIR-V, `*.spv`

---

## Security
- **[HIGH]** Validation layers disabled in debug builds to "improve performance" → API misuse, undefined behavior, and driver crashes go undetected during development; always enable `VK_LAYER_KHRONOS_validation` in debug and CI builds.
- **[HIGH]** Persistently mapped buffer memory (`vkMapMemory`) written by the CPU while simultaneously read by the GPU without synchronization → data corruption and undefined behavior; use proper pipeline barriers or semaphores to ensure CPU-GPU ordering before unmapping or flushing.
- **[MEDIUM]** SPIR-V shader binaries loaded from user-controlled file paths without validation → malformed SPIR-V can crash drivers or trigger undefined behavior; validate with `spirv-val` at build time and load only from bundled, pre-validated binaries.
- **[LOW]** Debug messenger (`VK_EXT_debug_utils`) not set up during development → Vulkan API misuse produces no diagnostic output; always install a debug messenger callback that logs all validation messages in non-shipping builds.

---

## Performance
- **[CRITICAL]** One `vkQueueSubmit` call issued per draw call → extreme CPU overhead from queue submission synchronization; record all draw commands into a single command buffer and submit once per frame.
- **[CRITICAL]** `VkFence` and `VkSemaphore` synchronization used incorrectly (e.g., waiting on a fence that was never signaled, signaling a semaphore that is never waited on) → GPU hangs, CPU deadlock, or undefined frame ordering; follow the canonical acquire-render-present synchronization pattern with per-frame fences and semaphores.
- **[HIGH]** Pipeline barriers specified with `VK_PIPELINE_STAGE_ALL_COMMANDS_BIT` as source or destination stage → unnecessarily broad barrier stalls the entire GPU pipeline; narrow to the precise pipeline stages that produce and consume the resource.
- **[HIGH]** Device memory allocated individually per resource with `vkAllocateMemory()` → drivers have a hard limit on allocation count (often 4096); use a GPU memory allocator library (VMA — Vulkan Memory Allocator) to suballocate from large blocks.
- **[HIGH]** Tile-based GPU architecture (mobile) not using render pass subpasses for on-chip framebuffer operations → intermediate render targets written to and read back from main memory; use `vkCmdNextSubpass` with input attachments to keep data on-chip.
- **[MEDIUM]** Descriptor sets allocated individually per frame per object → descriptor pool fragmentation and allocation overhead; pre-allocate descriptor sets for the maximum number of objects and rotate through them per frame.
- **[MEDIUM]** Command buffers re-recorded every frame for static scene geometry → unnecessary CPU work; pre-record static geometry command buffers once and only re-record when scene state changes.
- **[LOW]** Small per-draw-call data (model matrix, material index) passed via descriptor sets instead of push constants → unnecessary descriptor set update overhead; use `vkCmdPushConstants` for data up to 128 bytes that changes per draw call.

---

## Architecture
- **[HIGH]** Vulkan objects (Instance, Device, Swapchain, RenderPass) created without a clear ownership and lifecycle policy → objects destroyed in wrong order or leaked; establish a deterministic teardown order that is the reverse of creation order.
- **[HIGH]** Validation layers treated as optional rather than mandatory for development → bugs caught only by production GPU crashes on customer hardware; treat validation layer warnings as build-breaking errors in CI.
- **[MEDIUM]** Swapchain recreation on window resize not implemented → resize causes `VK_ERROR_OUT_OF_DATE_KHR` return from `vkQueuePresentKHR`, which crashes the application; handle `VK_ERROR_OUT_OF_DATE_KHR` and `VK_SUBOPTIMAL_KHR` by recreating the swapchain.
- **[MEDIUM]** Raw Vulkan API calls not abstracted behind a renderer interface → every backend detail exposed to application code; wrap in a renderer class that exposes high-level operations (beginFrame, drawMesh, endFrame).
- **[LOW]** Queue family indices hardcoded as `0` instead of queried from `vkGetPhysicalDeviceQueueFamilyProperties()` → code breaks on GPUs where graphics and present queues are different families; always query and select queue families by capability.

---

## Code Quality
- **[CRITICAL]** Return values of Vulkan API calls not checked against `VK_SUCCESS` → failures produce invalid handles that cause crashes or corruption far from the error site; check every Vulkan return code and handle or propagate errors immediately.
- **[HIGH]** `srcAccessMask` / `dstAccessMask` or `srcStageMask` / `dstStageMask` in `VkImageMemoryBarrier` / `VkBufferMemoryBarrier` set incorrectly → memory hazards where GPU reads stale data or races with writes; consult the Vulkan synchronization table and set exact access and stage masks.
- **[HIGH]** `VK_NULL_HANDLE` not checked after object creation → using a null handle crashes the driver; verify every created handle is non-null before storing or using it.
- **[MEDIUM]** SPIR-V shader binaries not validated with `spirv-val` before inclusion in the build → invalid SPIR-V silently rejected by some drivers, crashes others; add `spirv-val` as a build step for all shader binaries.
- **[MEDIUM]** Frame-in-flight count not matched between swapchain image count and synchronization primitive arrays → out-of-bounds access into fence/semaphore arrays; derive all per-frame array sizes from the swapchain image count.
- **[LOW]** Viewport and scissor not set as dynamic state before draw calls when `VK_DYNAMIC_STATE_VIEWPORT` / `VK_DYNAMIC_STATE_SCISSOR` is used in the pipeline → validation error and undefined draw behavior; always call `vkCmdSetViewport` and `vkCmdSetScissor` before every draw that uses dynamic state.

---

## Common Bugs & Pitfalls
- **[CRITICAL]** Vulkan object used after the corresponding `vkDestroy*` or `vkFree*` call → use-after-free crash, often deferred until the next GPU submission; enforce strict RAII ownership so destruction is automatic and sequenced correctly.
- **[HIGH]** Image layout transition not performed before using an image in a render pass or shader → validation error and undefined sampling or attachment behavior; always transition image layout with a barrier to the correct `VkImageLayout` before first use.
- **[HIGH]** Framebuffer created referencing swapchain image views that are then recreated on resize without recreating the framebuffer → framebuffer holds stale image view handles → crash on next render; recreate framebuffers whenever the swapchain is recreated.
- **[MEDIUM]** Semaphore signaled by `vkQueueSubmit` but never waited on by a subsequent submit or present → Vulkan requires every signal operation to have a matching wait; track all semaphore signal/wait pairs to ensure they are balanced.
- **[MEDIUM]** Depth/stencil image layout not transitioned from `VK_IMAGE_LAYOUT_UNDEFINED` before first render pass use → contents undefined, depth test produces garbage results; include an initial layout transition in the render pass `VkAttachmentDescription.initialLayout` or a preceding barrier.
- **[LOW]** `vkDeviceWaitIdle()` called every frame to avoid synchronization complexity → serializes CPU and GPU completely, destroying all parallelism; use per-frame fences with `vkWaitForFences` for proper double/triple buffering.
