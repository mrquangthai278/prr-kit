---
name: "step-02-discussion"
description: "Run the multi-reviewer discussion and compile unified findings"
---

# Step 2: Multi-Reviewer Discussion

## Sequence of Instructions

### 1. Round 1 — Each Reviewer's Initial Take

Go through the diff once per reviewer. Each reviewer applies rules from the PR knowledge base loaded in step 1 in addition to their domain expertise.

---

**👁️ Alex says:**

[Alex reviews for: logic correctness, naming, readability, DRY violations, missing error handling, test coverage, side effects, resource cleanup, and stack-specific code quality issues from knowledge base]

Format each finding as:
```
🔴/🟡/🟢/❓ [file.ts:line] — {finding description}
  → Fix: {suggested fix}
```

---

**🔒 Sam says:**

[Sam reviews for: secrets/credentials, SQL injection, XSS, authentication checks, authorization, rate limiting, error message exposure, OWASP Top 10, and stack-specific security threats from knowledge base]

Format each finding as:
```
🔴/🟡/🟢/❓ [file.ts:line] — {risk description}
  → Risk: {what could go wrong}
  → Fix: {suggested fix}
```

---

**⚡ Petra says:**

[Petra reviews for: N+1 queries, missing indexes, sync I/O on hot paths, unbound queries, missing caching, large payloads, memory leaks, inefficient loops, and stack-specific performance issues from knowledge base]

Format each finding as:
```
🔴/🟡/🟢/❓ [file.ts:line] — {performance issue}
  → Impact: {estimated impact, e.g. "adds ~50ms per request"}
  → Fix: {suggested fix}
```

---

**🏗️ Arch says:**

[Arch reviews for: layer violations, circular dependencies, tight coupling, inconsistent patterns, shared module blast radius, backward compatibility breaks, and stack-specific architecture concerns from knowledge base]

Format each finding as:
```
🔴/🟡/🟢/❓ [file.ts:line] — {architectural concern}
  → Pattern violated: {what existing pattern this breaks}
  → Fix: {suggested refactor}
```

---

### 2. Round 2 — Biz Translates + Cross-Review Discussion

**💼 Biz speaks last** — synthesizes findings from Alex/Sam/Petra/Arch into business impact:

[Biz reviews for: user-facing regressions, feature completeness, data safety, deployment risk, observability gaps, compliance issues, and project-specific business concerns from knowledge base]

For each 🔴 finding from prior reviewers, Biz adds business consequence:
```
💼 Biz on [Sam's finding at file.ts:line]:
  → Business consequence: {what happens to real users/business if shipped as-is}
  → Risk level: CRITICAL / HIGH / MEDIUM / LOW
```

Biz also adds any standalone business findings not caught by others (empty states, missing analytics, hardcoded strings, etc.).

---

**Conflicts**: If two reviewers disagree, facilitate a brief debate:
```
💬 Alex vs Arch on [file.ts:line]:
  Alex: "This function is too long and should be split"
  Arch: "It's a single responsibility — splitting would add unnecessary complexity"
  🏆 Verdict: [who wins and why]
```

**Hot zones**: Files flagged by 2+ reviewers:
```
🔥 Hot zone: [file.ts] — flagged by Sam (auth) + Alex (logic)
   This file needs significant attention before merge.
```

### 3. Compile Unified Findings

After discussion, produce a unified finding list, deduplicated and prioritized:

```
## 🎉 Party Mode — Unified Findings

**PR:** {target_branch} → {base_branch}
**Session participants:** Alex 👁️ + Sam 🔒 + Petra ⚡ + Arch 🏗️ + Biz 💼

### 🔴 Blockers ({count})
[all blockers from all reviewers, attributed to reviewer]

### 🟡 Warnings ({count})
[all warnings, attributed]

### 🟢 Suggestions ({count})
[suggestions, attributed]

### ❓ Questions for Author ({count})
[all questions needing author clarification before judging]

### 🔥 Hot Zones
[files flagged by 2+ reviewers]

### 💬 Debates Resolved
[conflicts with verdicts]

### 💼 Business Verdict
**Risk:** {CRITICAL | HIGH | MEDIUM | LOW | MINIMAL}
**Top concern:** {1 sentence}
**Recommendation:** {ship now | ship with fixes | do not ship}

---
**Overall Verdict:** ✅ APPROVE / ⚠️ APPROVE WITH NOTES / 🚫 REQUEST CHANGES
```

### 4. Offer Next Steps

```
Party Mode complete! What's next?

  [RR] Generate Report — compile into formal Markdown report
  [PC] Post Comments  — post findings to GitHub/GitLab/Azure/Bitbucket PR
  [IC] Improve Code   — get concrete code fixes for the blockers
```

**Workflow complete.** Return to agent menu.
