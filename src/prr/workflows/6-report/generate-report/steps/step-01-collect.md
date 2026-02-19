---
name: "step-01-collect"
description: "Collect findings from all completed review files"
nextStepFile: "./step-02-organize.md"
---

# Step 1: Collect All Findings

## Sequence of Instructions

### 1. Load PR Context

Read `{review_output}/current-pr-context.yaml` to get list of completed reviews.

### 2. Collect Review Output Files

For each completed review in `review.completed` list, read the corresponding output file:
- `general-review` → `{review_output}/general-review-*.md` (latest)
- `security-review` → `{review_output}/security-review-*.md` (latest)
- `performance-review` → `{review_output}/performance-review-*.md` (latest)
- `architecture-review` → `{review_output}/architecture-review-*.md` (latest)
- `improve-code` → `{review_output}/improve-code-*.md` (latest)

### 3. Parse All Findings

From each file, extract all findings with their:
- Severity (🔴 Blocker / 🟡 Warning / 🟢 Suggestion / Critical/High/Medium/Low)
- Category (general/security/performance/architecture/improvement)
- File + line reference
- Description
- Suggested fix

### 4. Count Statistics

Count:
- Total findings by severity
- Findings by category
- Files with issues

### 5. Load Next Step

Add `step-01-collect` to `stepsCompleted`. Load: `{nextStepFile}`
