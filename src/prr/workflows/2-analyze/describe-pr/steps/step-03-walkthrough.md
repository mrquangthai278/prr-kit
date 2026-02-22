---
name: "step-03-walkthrough"
description: "Generate file-by-file walkthrough explaining what changed and why"
nextStepFile: "./step-04-output.md"
---

# Step 3: File-by-File Walkthrough

## STEP GOAL

Generate a concise walkthrough of each changed file — what changed, why it changed (based on diff + commit context), and what reviewers should pay attention to.

## Sequence of Instructions

### 1. Group Files by Purpose

Group changed files logically:
- **Backend** (controllers, services, models, routes, middleware)
- **Frontend** (components, views, stores, utils)
- **Config/Infrastructure** (docker, env, CI, package.json)
- **Tests**
- **Docs**

### 2. For Each Changed File, Generate Summary

For each file (or group of related files), describe:
- **What changed**: 1-2 sentences on the actual change
- **Why** (inferred from commit messages and context): 1 sentence
- **Review focus**: what should reviewers specifically look at

Format:
```
📄 backend/controllers/authController.js (+45 -12)
   What: Added JWT refresh token endpoint and token blacklisting logic
   Why:  Fixes security issue where expired tokens could still be used
   Focus: Check token validation logic and blacklist cleanup mechanism
```

### 3. Generate Impact Map

After summarizing each file, proactively scan for cross-cutting side effects. This map will be attached to the PR description output and used by all review phases.

#### 3a. Shared / Generic Module Changes

For each changed file that is a **shared, generic, or common** resource (utility modules, shared libraries, base classes, common interfaces/headers, core services, shared data models, global state, or any module imported by many others):

- Search the codebase (via grep/search tools on import/include/require/use statements) for all files that depend on it
- Count consumers and list up to 5 of the most significant ones (most widely depended-upon, or in the most critical workflows based on naming/context)
- Flag if the change is **breaking** (signature change, removed export, behavior change) or **additive**
- If codebase search is unavailable (diff-only context), note: "⚠️ Consumer scan not possible — flag for manual inspection by reviewer"

Format:
```
⚠️ IMPACT: src/common/HttpClient.ts — used by 34 files
   Change type: Public interface modified (added required param `timeout`)
   Key consumers: OrderService.ts, UserService.ts, NotificationService.ts
   Risk: BREAKING — all consumers must pass `timeout` or get a compile/runtime error
```

#### 3b. Side Effect Scan

For each changed file, identify any **observer/reactive dependencies** that may cause downstream effects in files NOT in the diff:

- **Observer / reactive patterns**: watchers, listeners, Rx streams, signals, delegates, callbacks, subscriptions that observe state changed in this PR — are their side effects scoped or global?
- **Lifecycle-bound resources**: listeners, timers, handles, connections, threads, or subscriptions created in setup/init — check that teardown/cleanup is still correct after this change
- **Shared / global state**: singletons, global variables, shared memory, context, state managers — who reads or writes this state outside the diff?
- **Event / signal dispatch**: new events, signals, notifications, or messages emitted/published — are all consumers/listeners accounted for? Is the payload backward compatible?
- **Cross-boundary contracts**: API response shape, function signatures, binary interfaces (ABI), serialization schemas (protobuf, JSON schema, GraphQL), DB schema — which consumers depend on the old shape?

Format:
```
⚡ SIDE EFFECT: src/core/SessionManager.cpp — `activeUser` state modified
   Observed by (outside diff): ProfileRenderer.cpp (callback), PermissionGuard.ts (derived)
   Risk: Logic change in activeUser may silently break profile display and permission checks
```

#### 3c. Impact Map Summary

Produce a concise block at the end of the walkthrough:

```
📊 IMPACT MAP
─────────────────────────────────────────────
Shared modules modified    : X file(s) — [list]
Blast radius (consumers)   : ~N files affected
Side effects / observers   : X location(s) — [list]
Cross-service dependencies : X (if applicable)
─────────────────────────────────────────────
⚠️  High-risk items for reviewers: [bullet list of top concerns]
```

If no cross-cutting impact is found, state explicitly:
```
📊 IMPACT MAP — No shared module or side effect impacts detected.
```

### 4. Load Next Step

Add `step-03-walkthrough` to `stepsCompleted`. Load: `{nextStepFile}`
