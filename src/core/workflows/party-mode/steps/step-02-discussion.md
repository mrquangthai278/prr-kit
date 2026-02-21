---
name: "step-02-discussion"
description: "Run the multi-reviewer discussion and compile unified findings"
---

# Step 2: Multi-Reviewer Discussion

## Sequence of Instructions

### 1. Round 1 — Each Reviewer's Initial Take

Go through the diff once per reviewer. For each reviewer, output their findings in their style:

---

**👁️ Alex says:**

[Alex reviews for: logic correctness, naming, readability, DRY violations, missing error handling, code style consistency]

Format each finding as:
```
🔴/🟡/🟢 [file.ts:line] — {finding description}
  → Fix: {suggested fix}
```

---

**🔒 Sam says:**

[Sam reviews for: secrets/credentials, SQL injection, XSS, authentication checks, authorization, rate limiting, error message exposure]

Format each finding as:
```
🔴/🟡/🟢 [file.ts:line] — {risk description}
  → Risk: {what could go wrong}
  → Fix: {suggested fix}
```

---

**⚡ Petra says:**

[Petra reviews for: N+1 queries, missing indexes, sync I/O, unbound queries, missing caching, large payloads, inefficient loops]

Format each finding as:
```
🔴/🟡/🟢 [file.ts:line] — {performance issue}
  → Impact: {estimated impact}
  → Fix: {suggested fix}
```

---

**🏗️ Arch says:**

[Arch reviews for: layer violations, circular dependencies, tight coupling, inconsistent patterns, God objects, missing abstractions]

Format each finding as:
```
🔴/🟡/🟢 [file.ts:line] — {architectural concern}
  → Pattern: {what pattern is violated}
  → Fix: {suggested refactor}
```

---

### 2. Round 2 — Cross-Review Discussion

After all reviewers have spoken, check for:

**Conflicts**: If two reviewers disagree (e.g., Alex says "extract this function" but Arch says "this is fine as-is"), facilitate a brief debate:
```
💬 Alex vs Arch on [file.ts:line]:
  Alex: "This function is too long and should be split"
  Arch: "It's a single responsibility — splitting would add unnecessary complexity"
  🏆 Verdict: [who wins and why]
```

**Amplifications**: If two reviewers flag the same file for different reasons, note the "hot zone":
```
🔥 Hot zone: [file.ts] — flagged by both Sam (auth issue) and Alex (logic issue)
   This file needs significant attention.
```

### 3. Compile Unified Findings

After discussion, produce a unified finding list, deduplicated and prioritized:

```
## 🎉 Party Mode — Unified Findings

**PR:** {target_branch} → {base_branch}
**Session participants:** Alex 👁️ + Sam 🔒 + Petra ⚡ + Arch 🏗️

### 🔴 Blockers ({count})
[list all blockers from all reviewers, attributed]

### 🟡 Warnings ({count})
[list all warnings, attributed]

### 🟢 Suggestions ({count})
[list suggestions, attributed]

### 🔥 Hot Zones
[files flagged by 2+ reviewers]

### 💬 Debates Resolved
[any conflicts with verdicts]

---
**Overall Verdict:** {APPROVED | NEEDS CHANGES | REQUEST CHANGES}
**Recommendation:** {1-2 sentence summary}
```

### 4. Offer Next Steps

```
Party Mode complete! What's next?

  [RR] Generate Report — compile into formal Markdown report
  [PC] Post Comments  — post findings to GitHub PR
  [IC] Improve Code   — get concrete code fixes for the blockers
```

**Workflow complete.** Return to agent menu.
