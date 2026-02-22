# Unreal Engine — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.cpp`/`*.h` in Unreal project, `UCLASS()`, `UPROPERTY()`, `UFUNCTION()`, `AGameMode`, `UObject`, `FString`, `TArray`, `GEngine`, `.uproject`

---

## Security
- **[HIGH]** Server RPC (`UFUNCTION(Server, Reliable)`) executing game-state changes without authority check → clients can call any server RPC arbitrarily; always verify `HasAuthority()` at the start of every server RPC.
- **[HIGH]** Unvalidated client-reported game state accepted by server → cheating via modified clients; keep authoritative logic on server and treat all client input as untrusted.
- **[HIGH]** Serialized save game data loaded without schema validation → malformed or tampered saves can crash the server or client; validate all fields before use after `LoadGameFromSlot`.
- **[MEDIUM]** Server URLs, API keys, or backend endpoints hardcoded in Blueprint or C++ → visible in packaged builds via asset extraction; load secrets from server-side config or use backend relay.
- **[MEDIUM]** UE_LOG calls and console commands (e.g., `cheats`, `showdebug`) accessible in Shipping builds → information leakage and cheat enablement; strip debug commands with `UE_BUILD_SHIPPING` guards.
- **[MEDIUM]** `UFUNCTION(Client, Reliable)` used to send sensitive data from server to a specific client without ownership check → data sent to wrong client; verify `GetOwner() == PC` before client RPCs.
- **[LOW]** Blueprint bytecode not protected in packaged build → decompilable with community tools; move security-critical logic to C++.

---

## Performance
- **[CRITICAL]** `AActor::Tick` enabled on actors that do not need per-frame updates → unnecessary CPU cost for every actor in the scene; set `PrimaryActorTick.bCanEverTick = false` in constructor for non-ticking actors.
- **[HIGH]** Garbage Collection hitches from large numbers of `UObject`-derived objects being allocated and released rapidly → GC pause spikes; pool objects and avoid frequent construction/destruction of UObjects.
- **[HIGH]** Static meshes without LOD levels in complex scenes → excessive polygon count at distance; set up LOD groups or use Nanite (UE5) for static geometry.
- **[HIGH]** Synchronous HTTP requests or blocking disk I/O executed on the game thread → frame stutter; use async task graph or UE's `FHttpModule` with async callbacks.
- **[HIGH]** Blueprint VM executing hot-path logic (AI, physics math, per-tick calculations) → Blueprint is 10-100x slower than native C++; move performance-critical code to C++ and expose via `BlueprintCallable`.
- **[MEDIUM]** Replication not gated by `NetUpdateFrequency` and `MinNetUpdateFrequency` → flooding the network with unnecessary updates; tune per-actor replication rates.
- **[MEDIUM]** Shader complexity not profiled with `viewmode shadercomplexity` → overdraw and expensive materials going undetected; budget material instruction counts.
- **[LOW]** Nanite not enabled for high-polygon static assets in UE5 → missed opportunity for virtualized geometry; enable Nanite on eligible meshes.

---

## Architecture
- **[HIGH]** Game logic implemented in Blueprints that would benefit from C++ for performance and testability → Blueprint-only codebases are hard to refactor and slow at runtime; use C++ base classes with Blueprint subclasses for data.
- **[HIGH]** Monolithic Actor classes handling movement, AI, UI, inventory, and audio → violates single responsibility; decompose into `UActorComponent` subclasses.
- **[MEDIUM]** Not following Unreal's GameMode / GameState / PlayerState / PlayerController / Pawn separation → game rules and per-player data mixed into Actor classes; respect the intended roles of each framework class.
- **[MEDIUM]** Hard references between assets (`UPROPERTY(EditAnywhere) UTexture2D*`) causing full asset load chains → large memory spikes; use `TSoftObjectPtr` and async loading for non-critical assets.
- **[MEDIUM]** Global services implemented as static methods or global variables instead of Unreal Subsystems → difficult to test and replace; use `UGameInstanceSubsystem`, `UWorldSubsystem`, or `UEngineSubsystem`.
- **[LOW]** Not using Unreal's Enhanced Input system (legacy `InputComponent` bindings deprecated in UE5) → missing rebinding and context-layered input support.

---

## Code Quality
- **[HIGH]** Raw C++ pointers to `UObject`-derived objects stored without `UPROPERTY()` → Unreal GC does not see the reference and may collect the object → dangling pointer crash; always mark UObject pointers with `UPROPERTY()` or use `TWeakObjectPtr`.
- **[HIGH]** `Cast<T>()` return value used without null check → returns `nullptr` on type mismatch; always null-check before dereferencing cast results.
- **[HIGH]** Not using `IsValid()` before accessing a `UObject` pointer → object may be pending kill; use `IsValid(Ptr)` instead of `Ptr != nullptr`.
- **[MEDIUM]** `FString` used for identifiers and map keys where `FName` is appropriate → FName is hashed and interned; use `FName` for asset names and identifiers, `FText` for display strings.
- **[MEDIUM]** `TArray` modified (elements added/removed) while iterating with range-for → iterator invalidation and undefined behaviour; iterate a copy or use index-based loops with care.
- **[LOW]** Unreal naming conventions not followed (prefix `A` for Actors, `U` for UObjects, `F` for structs, `I` for interfaces, `E` for enums) → reduces readability and breaks tooling assumptions.

---

## Common Bugs & Pitfalls
- **[CRITICAL]** `UObject` pointer not marked with `UPROPERTY()` → Garbage Collector silently frees the object → crash on next access; add `UPROPERTY()` to every UObject pointer member.
- **[HIGH]** Calling Blueprint-callable functions or virtual functions from a `UObject` constructor → object not fully initialized at construction time; defer initialization to `BeginPlay()` or `PostInitializeComponents()`.
- **[HIGH]** Server RPC called from client code without the `Server` UFUNCTION specifier → call silently dropped; always pair `Server` specifier with `_Implementation` and `_Validate` methods.
- **[HIGH]** `BeginPlay()` execution order across Actors not guaranteed → initialization dependencies between actors can fail silently; use deferred initialization or `PostBeginPlay` ordering.
- **[MEDIUM]** Delegates and dynamic multicast delegates not unbound in `EndPlay()` or `BeginDestroy()` → stale references firing after object destruction.
- **[MEDIUM]** Replication of a `TArray` relying on element-level delta → Unreal replicates the whole array on any change; use `FFastArraySerializer` for large replicated arrays.
- **[LOW]** Hot Reload breaking native class changes (added/removed member variables) → corrupted class layout; always do a full compile after structural class changes.
