# PR Review Help

## What to do next

Use `/prr-help` anytime for guidance on what to do.

### Typical Review Flow

**Per PR — Quick mode (1 command):**
- **[QR] Quick Review** — Full pipeline: select branch → describe → collect context → all 5 reviews → report → optional post

**Per PR — Manual mode (step by step):**
1. **[SP] Select PR** — Fetch latest, list branches/PRs, choose what to review
2. **[DP] Describe PR** — Auto-generate PR type, summary, file-by-file walkthrough
   ↳ *Context collected automatically — fresh, PR-specific, no setup needed*
3. **[GR/SR/PR/AR/BR] Review** — Run one or more specialized reviews
4. **[IC] Improve Code** — Get concrete code suggestions with inline fixes
5. **[AK] Ask** — Ask specific questions about the code changes
6. **[RR] Generate Report** — Compile all findings into a Markdown report
7. **[PC] Post Comments** — Post inline review comments to GitHub / GitLab / Azure DevOps / Bitbucket

### Available Reviews

- **[GR] General Reviewer** 👁️ — Logic, naming, readability, DRY, best practices
- **[SR] Security Reviewer** 🔒 — OWASP Top 10, injection, auth, secrets, API key exposure
- **[PR] Performance Reviewer** ⚡ — N+1 queries, memory leaks, async patterns, bundle size
- **[AR] Architecture Reviewer** 🏗️ — SOLID, layering, coupling, consistency, blast radius
- **[BR] Business Reviewer** 💼 — User impact, business risk, feature completeness, data safety, observability

### Finding Severity Levels

- 🔴 **[BLOCKER]** — Must fix before merge
- 🟡 **[WARNING]** — Should fix, with explanation
- 🟢 **[SUGGESTION]** — Nice-to-have improvement
- ❓ **[QUESTION]** — Cannot determine intent from diff — ask author before judging

### Utilities

- **[CL] Clear** — Remove context files and/or review reports from output folder. Useful when starting fresh or cleaning up after a session. Choose: All / Context only / Reports only.
