---
name: quick
description: "Full PR review pipeline in one command: select → describe → review → report"
main_config: '{project-root}/_prr/prr/config.yaml'
---

# Quick Review — Full Pipeline

**Goal:** Run the complete PR review pipeline end-to-end with minimal interruptions.
Only pause for user input when selecting the branch. Everything else runs automatically.

## INITIALIZATION

Load config from {main_config}: `user_name`, `communication_language`, `target_repo`, `review_output`, `project_context`.

Set `date` = today's date (YYYY-MM-DD).

If `project_context` file exists at `{review_output}/project-context.yaml`, load it silently.
If it does not exist, notify: "⚠️ No project context found — run [CP] Collect Project Context first for better reviews. Continuing without it."

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

## PHASE 3 — REVIEW
*Execute all review types automatically, one by one.*

For each review, read the corresponding instructions file and apply it to `{pr_diff}`.

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

Then ask:
> Post these findings as inline comments to GitHub? (requires `gh` CLI and `github_repo` configured)
> Type **PC** to post, or **Enter** to finish.

If user types `PC`, load and follow: `{project-root}/_prr/prr/workflows/6-report/post-comments/workflow.md`
Otherwise, end session.
