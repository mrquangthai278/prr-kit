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

### 1b. List open PRs/MRs (primary) + recent branches (secondary)

**Primary — Platform PRs/MRs** (if `{platform_repo}` is configured):

Use the appropriate command based on `{platform}` (or `{detected_platform}`):

**GitHub:**
```bash
gh pr list --repo {platform_repo} --state open \
  --json number,title,headRefName,baseRefName,author,createdAt,isDraft --limit 20
```

**GitLab:**
```bash
glab mr list --repo {platform_repo} --state opened --output json
```

**Azure DevOps:**
```bash
az repos pr list --repository {repo} --project {project} --org {org_url} --status active --output json
```

**Bitbucket:**
```bash
curl https://api.bitbucket.org/2.0/repositories/{platform_repo}/pullrequests?state=OPEN
```

Display as a table: `#N | title | head → base | author | age`

**Secondary — recent branches** (always):
```bash
git -C {target_repo} branch -r --sort=-committerdate \
  --format="%(refname:short) | %(objectname:short) | %(committerdate:relative) | %(contents:subject)" \
  | head -15
```

### 1c. Select PR/MR ← **ONLY USER INPUT IN THIS WORKFLOW**

**If `{platform_repo}` is configured** — ask:
> Select a PR/MR to review:
> Enter PR/MR number (e.g. `44`) or branch name (e.g. `feature/my-feature`):

Wait for response.

**If PR/MR number entered**, fetch metadata using the active platform:

**GitHub:**
```bash
gh pr view {pr_number} --repo {platform_repo} \
  --json number,title,headRefName,baseRefName,author,headRefOid
```
Set `target_branch` = `headRefName`, `base_branch` = `baseRefName` ← **exact from platform, not assumed**.
Set `pr_head_sha` = `headRefOid`.

**GitLab:**
```bash
glab mr view {pr_number} --repo {platform_repo} --output json
```
Set `target_branch` = `source_branch`, `base_branch` = `target_branch`.
Get head SHA: `git -C {target_repo} rev-parse origin/{target_branch}` → `pr_head_sha`.

**Azure DevOps:**
```bash
az repos pr show --id {pr_number} --output json
```
Set `target_branch` = `sourceRefName` (strip `refs/heads/`), `base_branch` = `targetRefName` (strip `refs/heads/`).

**Bitbucket:**
```bash
curl https://api.bitbucket.org/2.0/repositories/{platform_repo}/pullrequests/{pr_number}
```
Set `target_branch` = `source.branch.name`, `base_branch` = `destination.branch.name`.

**If branch name entered:**
Check if a PR/MR exists for it on the platform. If yes: use its base branch. If no: detect `origin/main` or `origin/master`.

---

**If `{platform_repo}` is NOT configured** — ask two separate questions:

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

Use the first available method based on platform:

**GitHub** (if `active_platform = github` and `pr_number` is set):
```bash
gh pr diff {pr_number} --repo {platform_repo}
```

**GitLab** (if `active_platform = gitlab` and `pr_number` is set):
```bash
glab mr diff {pr_number} --repo {platform_repo}
```

**Azure DevOps / Bitbucket / fallback:**
```bash
git -C {target_repo} diff {base_branch}...{target_branch} --stat
git -C {target_repo} diff {base_branch}...{target_branch}
```
Store diff in memory. Count files changed, lines added/removed.

### 1e. Save PR context
Write `{review_output}/current-pr-context.yaml`:
```yaml
pr:
  target_branch: "{target_branch}"
  base_branch: "{base_branch}"
  pr_number: "{pr_number}"
  pr_title: "{pr_title}"
  platform: "{active_platform}"
  platform_repo: "{platform_repo}"
  date: "{date}"
review:
  completed: []
  findings: []
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
Analyze the diff and classify as one of: `bugfix` | `feature` | `refactor` | `performance` | `security` | `docs` | `test` | `config` | `chore` | `hotfix`

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
*Execute automatically. May pause once to ask the user for additional context (unless `skip_manual_input_context: true` in config).*

Execute the collect-pr-context workflow in full:
`{project-root}/_prr/prr/workflows/2-analyze/collect-pr-context/workflow.md`

This workflow analyzes changed files, detects technology stacks, collects relevant context from all sources (primary docs, config files, standards docs, inline annotations, stack-specific rules, external MCP/RAG tools), asks the user for any additional context (marked ⚠️ IMPORTANT if provided), and builds a structured PR-specific knowledge base at `{review_output}/pr-{pr_number}-context.yaml`.

On completion, store `pr_knowledge_base` = path to the generated context file.

---

## PHASE 3 — REVIEW
*Execute all review types automatically, one by one.*

**Before each review, set these variables so the review instructions resolve correctly:**
- `pr_context` = `{review_output}/current-pr-context.yaml`
- `target_branch` = `pr_context.pr.target_branch`
- `base_branch` = `pr_context.pr.base_branch`
- `pr_number` = `pr_context.pr.pr_number`
- `pr_knowledge_base` = path stored in `pr_context` (set by Phase 2.5)
- `target_repo`, `communication_language` = from config
- `output_file` = per-review path defined below *(ensures findings are saved to disk for [RR] and [PC] later)*

### 3a. General Review
Set `output_file` = `{review_output}/general-review-{date}.md`
Load and follow: `{project-root}/_prr/prr/workflows/3-review/general-review/instructions.xml`

Collect findings as `{general_findings}`.
Print section header: `## 👁️ General Review`

### 3b. Security Review
Set `output_file` = `{review_output}/security-review-{date}.md`
Load and follow: `{project-root}/_prr/prr/workflows/3-review/security-review/instructions.xml`

Collect findings as `{security_findings}`.
Print section header: `## 🔒 Security Review`

### 3c. Performance Review
Set `output_file` = `{review_output}/performance-review-{date}.md`
Load and follow: `{project-root}/_prr/prr/workflows/3-review/performance-review/instructions.xml`

Collect findings as `{performance_findings}`.
Print section header: `## ⚡ Performance Review`

### 3d. Architecture Review
Set `output_file` = `{review_output}/architecture-review-{date}.md`
Load and follow: `{project-root}/_prr/prr/workflows/3-review/architecture-review/instructions.xml`

Collect findings as `{architecture_findings}`.
Print section header: `## 🏗️ Architecture Review`

### 3e. Business Review
Set `output_file` = `{review_output}/business-review-{date}.md`
Load and follow: `{project-root}/_prr/prr/workflows/3-review/business-review/instructions.xml`

Collect findings as `{business_findings}`.
Print section header: `## 💼 Business Review`

**Note:** Business Review runs last — it references and translates findings from GR/SR/PR/AR into business language and user impact.

---

## PHASE 4 — GENERATE REPORT
*Execute automatically.*

Compile all findings from phases 3a–3e.

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
{2-3 sentence overall technical quality assessment}

**Verdict:** ✅ APPROVE / ⚠️ APPROVE WITH NOTES / 🚫 REQUEST CHANGES
**Business Risk:** CRITICAL / HIGH / MEDIUM / LOW / MINIMAL  *(if Business Review ran)*

**Totals:** 🔴 {blocker_count} blockers | 🟡 {warning_count} warnings | 🟢 {suggestion_count} suggestions | ❓ {question_count} questions

## Business Impact 💼
*(Include this section only if Business Review [3e] was completed)*
**Risk Level:** {risk_level}
**Top concerns:** {top_3_business_concerns}
**Deployment recommendation:** {ship_now | ship_with_fixes | do_not_ship}
**Post-ship monitoring:** {what_to_watch}

## Blockers 🔴
{all blocker findings — sorted by category: 🔒 Security · ⚡ Performance · 🏗️ Architecture · 👁️ General · 💼 Business}

## Warnings 🟡
{all warning findings}

## Suggestions 🟢
{all suggestion findings}

## Questions 📌
{all questions for author}

## Files Reviewed
{file list with issue counts per file; highlight files with 3+ findings}
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
> Post these findings as inline comments to the PR/MR? (requires platform CLI and `platform_repo` configured)
> Supports: GitHub (`gh`), GitLab (`glab`), Azure DevOps (`az`), Bitbucket (API)
> Type **PC** to post, or **Enter** to finish.

If user types `PC`, load and follow: `{project-root}/_prr/prr/workflows/6-report/post-comments/workflow.md`
Otherwise, end session.
