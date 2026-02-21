# Clear PRR Output

**Goal:** Remove prr-kit context files and/or review reports from the output folder. Useful when starting fresh, switching projects, or cleaning up after a review session.

## EXECUTION

### 1. Load Config

Read `{project-root}/_prr/prr/config.yaml` to get `review_output` path.

### 2. Scan Output Folder

List all files currently in `{review_output}`:

```bash
ls "{review_output}/"
```

Group into two categories:

**Context files** (session state + knowledge bases):
- `current-pr-context.yaml` — active session state (which PR is selected)
- `pr-*-context.yaml` — per-PR knowledge bases built during context collection

**Review reports** (output artifacts):
- `review-*.md` — final review reports

### 3. Display What Exists

Show the user exactly what will be affected:

```
🗂️ PRR Output — {review_output}

Context files ({n}):
  • current-pr-context.yaml
  • pr-feature-auth-...-context.yaml
  • pr-feature-search-...-context.yaml
  ... (list all pr-*.yaml)

Review reports ({m}):
  • review-feature-auth-indexeddb-migration-2026-02-21.md
  • review-feature-add-search-functionality-2026-02-21.md
  ... (list all review-*.md)
```

If output folder is already empty or doesn't exist:
```
✅ Nothing to clear — output folder is already empty.
```
Then stop.

### 4. Ask Scope

Ask the user what to clear:

```
What would you like to clear?

  [1] All          — context files + review reports
  [2] Context only — clear session state and knowledge bases (keep reports)
  [3] Reports only — clear review .md files (keep context)
  [4] Cancel       — do nothing
```

Wait for user input.

### 5. Execute Deletion

**If [1] All:**
```bash
rm -f "{review_output}/current-pr-context.yaml"
rm -f "{review_output}"/pr-*-context.yaml
rm -f "{review_output}"/review-*.md
```

**If [2] Context only:**
```bash
rm -f "{review_output}/current-pr-context.yaml"
rm -f "{review_output}"/pr-*-context.yaml
```

**If [3] Reports only:**
```bash
rm -f "{review_output}"/review-*.md
```

**If [4] Cancel:**
```
❌ Cancelled — nothing was deleted.
```
Stop.

### 6. Confirm Deletion

Verify files are gone and report:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Clear complete

Deleted:
  🗑️  Context files: {n_ctx} file(s) removed
  🗑️  Review reports: {n_rpt} file(s) removed

Output folder: {review_output}
Status: clean

Ready for a fresh review session.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
