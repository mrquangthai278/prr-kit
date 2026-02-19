---
name: "step-03-write"
description: "Write the final review report to file"
outputFile: "{review_output}/review-report-{pr_branch}-{date}.md"
templateFile: "../templates/review-report.template.md"
---

# Step 3: Write Report

## Sequence of Instructions

### 1. Generate Report

Using `{templateFile}`, write the complete review report to `{outputFile}`.

The report includes:
- PR metadata and review summary
- Executive summary with overall verdict
- All findings organized by severity and category
- Files with multiple issues highlighted
- Recommended actions (must-fix vs nice-to-have)

### 2. Display Completion

```
✅ Review Report Generated!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 File: {outputFile}

Summary:
  🔴 Blockers: {blocker_count}
  🟡 Warnings: {warning_count}
  🟢 Suggestions: {suggestion_count}
  📌 Questions: {question_count}

Verdict: {verdict}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
  [PC] Post Comments — post these findings to GitHub PR
  or share the report file directly with the PR author
```

**Workflow complete.** Return to agent menu.
