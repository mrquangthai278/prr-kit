# PR Review Help

## What to do next

Use `/prr-help` anytime for guidance on what to do.

### Typical Review Flow

**Per PR — Quick mode (1 command):**
- **[QR] Quick Review** — Full pipeline: select branch → describe → collect context → all 4 reviews → report → optional post

**Per PR — Manual mode (step by step):**
1. **[SP] Select PR** — Fetch latest, list branches, choose what to review
2. **[DP] Describe PR** — Auto-generate PR type, summary, file-by-file walkthrough
   ↳ *Context collected automatically — fresh, PR-specific, no setup needed*
3. **[GR/SR/PR/AR] Review** — Run one or more specialized reviews
4. **[IC] Improve Code** — Get concrete code suggestions with inline fixes
5. **[AK] Ask** — Ask specific questions about the code changes
6. **[RR] Generate Report** — Compile all findings into a Markdown report
7. **[PC] Post Comments** — Post inline review comments to GitHub / GitLab / Azure DevOps / Bitbucket

### Available Reviewer Agents

- **PRR Master** 🔍 — Orchestrator, routes to all workflows
- **General Reviewer** 👁️ — Logic, naming, readability, best practices
- **Security Reviewer** 🔒 — OWASP, injection, auth, API key exposure
- **Performance Reviewer** ⚡ — N+1 queries, memory leaks, async patterns
- **Architecture Reviewer** 🏗️ — SOLID, layering, coupling, consistency

### Finding Severity Levels

- 🔴 **[BLOCKER]** — Must fix before merge
- 🟡 **[WARNING]** — Should fix, with explanation
- 🟢 **[SUGGESTION]** — Nice-to-have improvement
- 📌 **[QUESTION]** — Needs clarification from author
