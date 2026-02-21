---
name: quick
description: "Full PR review pipeline in one command: select → describe → review → report"
main_config: '{project-root}/_prr/prr/config.yaml'
---

# Quick Review — Full Pipeline

**Goal:** Run the complete PR review pipeline end-to-end with minimal interruptions.
Only pause for user input when selecting the branch. Everything else runs automatically.

## INITIALIZATION

Load config from {main_config}: `user_name`, `communication_language`, `target_repo`, `review_output`, `auto_post_comment`.

Set `date` = today's date (YYYY-MM-DD).

**Note:** Context will be collected dynamically in Phase 2.5 after describing the PR.
No pre-collected context file needed. Context is always fresh and PR-specific.

---

## PHASE 1 — SELECT PR
*Execute steps 1a–1b automatically. Pause only at 1c.*

### 1a. Fetch latest
```bash
git -C {target_repo} fetch origin --prune
```
Show: `✓ Fetched latest from remote`

### 1b. List open PRs (primary) + recent branches (secondary)

**Primary — GitHub PRs** (if `{github_repo}` is configured):
```bash
gh pr list --repo {github_repo} --state open \
  --json number,title,headRefName,baseRefName,author,createdAt,isDraft --limit 20
```
Display as a table: `#N | title | head → base | author | age`

**Secondary — recent branches** (always):
```bash
git -C {target_repo} branch -r --sort=-committerdate \
  --format="%(refname:short) | %(objectname:short) | %(committerdate:relative) | %(contents:subject)" \
  | head -15
```

### 1c. Select PR ← **ONLY USER INPUT IN THIS WORKFLOW**

**If `{github_repo}` is configured** — ask:
> Select a PR to review:
> Enter PR number (e.g. `44`) or branch name (e.g. `feature/my-feature`):

Wait for response.

**If PR number entered:**
```bash
gh pr view {pr_number} --repo {github_repo} \
  --json number,title,headRefName,baseRefName,author,headRefOid
```
Set `target_branch` = `headRefName`, `base_branch` = `baseRefName` ← **exact from GitHub, not assumed**.
Set `pr_head_sha` = `headRefOid`.

**If branch name entered:**
Check if a PR exists for it via `gh pr list --head {branch}`.
If yes: use PR's `baseRefName`. If no: detect `origin/main` or `origin/master`.

---

**If `{github_repo}` is NOT configured** — ask two separate questions:

First, display EXACTLY:
```
🎯 Head branch (the branch to review)?

   You can:
     • Enter a number from the list  (e.g., 1)
     • Type the branch name directly  (e.g., feature/my-feature)
```
Wait for response. Set `target_branch` = input.

Then display EXACTLY:
```
🎯 Base branch (what to diff against)?

   You can:
     • Press Enter to use the default  [main]
     • Type the branch name directly   (e.g., develop)
```
Wait for response. If empty → detect `origin/main` or `origin/master`.
Set `base_branch` = input or detected default.
Set `diff_range` = `{base_branch}...{target_branch}`.

### 1d. Load diff
```bash
# If PR number available (preferred):
gh pr diff {pr_number} --repo {github_repo}

# Otherwise:
git -C {target_repo} diff {base_branch}...{target_branch} --stat
git -C {target_repo} diff {base_branch}...{target_branch}
```
Store diff in memory. Count files changed, lines added/removed.

### 1e. Save PR context
Write `{review_output}/current-pr-context.yaml`:
```yaml
target_branch: "{target_branch}"
base_branch: "{base_branch}"
date: "{date}"
```

Show summary:
```
✓ PR selected: {target_branch}
  Files changed: X | +Y / -Z lines
```

---

## PHASE 2 — DESCRIBE PR
*Execute automatically, no user input.*

### 2a. Classify PR type
Analyze the diff and classify as one of: `bugfix` | `feature` | `refactor` | `docs` | `test` | `chore` | `hotfix`

### 2b. Generate walkthrough
For each changed file, write a 1-2 sentence summary of what changed and why.
Group by: new files | modified files | deleted files | renamed files.

### 2c. Output description
Print to screen:
```
## PR Description

**Type:** {pr_type}
**Branch:** {target_branch}
**Summary:** {2-3 sentence overall summary}

### Files Changed
{walkthrough table}
```

---

## PHASE 2.5 — COLLECT PR-SPECIFIC CONTEXT
*Execute automatically, no user input. This is the key innovation.*

**Goal:** Dynamically collect fresh context relevant only to THIS PR's changed files.

### 2.5a. Analyze changed files
Determine:
- File types and extensions (`.vue`, `.js`, `.ts`, etc.)
- File categories (`pinia-store`, `vue-component`, `test`, etc.)
- Affected domains (`state-management`, `ui-components`, `security`, `api`, etc.)
- Inline code annotations (`@context:`, `@security:`, `@pattern:`, `@rule:`)

### 2.5b. Collect relevant context
From multiple sources based on files changed:

**1. Primary documentation:**
- `CLAUDE.md` - Extract sections matching domains
- `AGENTS.md` - Extract agent-specific rules
- `.github/CLAUDE_CODE_RULES.md`

**2. Config files (based on file types):**
- `.eslintrc*` - For `.vue`, `.js`, `.ts` files
- `.prettierrc*` - For code files
- `tsconfig.json` - For `.ts` files
- `vite.config.*` / `webpack.config.*` - Build configs

**3. Standards docs (based on domains):**
- `CONTRIBUTING.md` - Extract relevant sections
- `ARCHITECTURE.md` - Extract patterns for affected areas
- `docs/{domain}-guidelines.md` - Domain-specific docs

**4. Inline annotations:**
Extract from changed lines:
```javascript
// @context: This module handles authentication
// @security: All inputs must be validated
// @pattern: Use repository pattern
```

**5. External sources (if configured):**
- Company standards APIs
- Confluence/Wiki pages

**6. External tools (if `external_sources.enabled: true` and tools available in session):**
- **MCP knowledge bases** (Confluence, Notion, Obsidian) → team standards and ADRs not in local docs
- **MCP project management** (Jira, Linear, GitHub Issues) → linked issue, acceptance criteria from branch name
- **MCP design tools** (Figma, Zeplin) → design specs for UI-touching PRs only
- **RAG systems** (AWS Bedrock, GitHub Graph RAG, custom) → similar codebase patterns, past decisions
- **URL sources** → plain remote docs fetched via WebFetch
- Always graceful: skip silently if tool not available, never fail the workflow

### 2.5c. Build PR-specific knowledge base
Create structured context file: `{review_output}/pr-{pr_number}-context.yaml`

Contains:
- Files analysis (types, domains, categories)
- Relevant ESLint/Prettier rules ONLY for these file types
- Guidelines from docs relevant to changed domains
- Inline annotations from code
- External rules (if any)
- Review priorities specific to this PR

Show summary:
```
✅ PR-Specific Context Ready
   📊 ESLint rules: {n} | Guidelines: {m} | Annotations: {k}
   🎯 Domains: {domains}
   📚 Sources: {source_count} (CLAUDE.md, .eslintrc.js, ARCHITECTURE.md, ...)

   ✓ Context is fresh and PR-specific
```

**Why this phase matters:**
- ✅ Context is always latest (no stale cached rules)
- ✅ Only relevant rules (not entire project context)
- ✅ Includes inline code annotations
- ✅ No manual refresh needed

---

## PHASE 3 — REVIEW
*Execute all review types automatically, one by one.*

For each review, read the corresponding instructions file and apply it to `{pr_diff}`.
**Important:** Reviews now load `pr-{pr_number}-context.yaml` from Phase 2.5.

### 3a. General Review
Load and follow: `{project-root}/_prr/prr/workflows/3-review/general-review/instructions.xml`

Collect findings as `{general_findings}`.
Print section header: `## 👁️ General Review`

### 3b. Security Review
Load and follow: `{project-root}/_prr/prr/workflows/3-review/security-review/instructions.xml`

Collect findings as `{security_findings}`.
Print section header: `## 🔒 Security Review`

### 3c. Performance Review
Load and follow: `{project-root}/_prr/prr/workflows/3-review/performance-review/instructions.xml`

Collect findings as `{performance_findings}`.
Print section header: `## ⚡ Performance Review`

### 3d. Architecture Review
Load and follow: `{project-root}/_prr/prr/workflows/3-review/architecture-review/instructions.xml`

Collect findings as `{architecture_findings}`.
Print section header: `## 🏗️ Architecture Review`

### 3e. Business Review
Load and follow: `{project-root}/_prr/prr/workflows/3-review/business-review/instructions.xml`

Collect findings as `{business_findings}`.
Print section header: `## 💼 Business Review`

**Note:** Business Review runs last so it can reference and translate findings from GR/SR/PR/AR into business language and user impact.

---

## PHASE 4 — GENERATE REPORT
*Execute automatically.*

Compile all findings from phases 3a–3d.

Sort by severity: 🔴 Blockers first → 🟡 Warnings → 🟢 Suggestions → 📌 Questions.

Count totals:
- `{blocker_count}` = number of 🔴 findings
- `{warning_count}` = number of 🟡 findings
- `{suggestion_count}` = number of 🟢 findings

Generate report filename: `review-{target_branch_slug}-{date}.md`
where `{target_branch_slug}` = branch name with `/` replaced by `-`.

Write report to: `{review_output}/review-{target_branch_slug}-{date}.md`

Report format:
```markdown
# PR Review: {target_branch}
**Date:** {date} | **Reviewer:** AI Review Framework
**Type:** {pr_type} | **Files:** X | **Lines:** +Y/-Z

## Executive Summary
{2-3 sentence overall quality assessment}

**Totals:** 🔴 {blocker_count} blockers | 🟡 {warning_count} warnings | 🟢 {suggestion_count} suggestions

## Blockers 🔴
{all blocker findings}

## Warnings 🟡
{all warning findings}

## Suggestions 🟢
{all suggestion findings}

## Questions 📌
{all questions}

## Files Reviewed
{file list}
```

---

## PHASE 5 — DONE

Print completion summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Quick Review Complete

Branch:  {target_branch}
Report:  {review_output}/review-{target_branch_slug}-{date}.md

🔴 Blockers:    {blocker_count}
🟡 Warnings:    {warning_count}
🟢 Suggestions: {suggestion_count}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**If `auto_post_comment: true`** (from config):
→ Skip prompt. Automatically proceed to post comments.
→ Load and follow: `{project-root}/_prr/prr/workflows/6-report/post-comments/workflow.md`

**If `auto_post_comment: false`** (default):
→ Ask:
> Post these findings as inline comments to GitHub? (requires `gh` CLI and `github_repo` configured)
> Type **PC** to post, or **Enter** to finish.

If user types `PC`, load and follow: `{project-root}/_prr/prr/workflows/6-report/post-comments/workflow.md`
Otherwise, end session.
