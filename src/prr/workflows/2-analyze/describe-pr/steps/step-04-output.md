---
name: "step-04-output"
description: "Write PR description to file and display summary"
outputFile: "{review_output}/pr-description-{date}.md"
templateFile: "../templates/pr-description.template.md"
---

# Step 4: Output PR Description

## STEP GOAL

Compile all analysis into a structured PR description file and display summary to the reviewer.

## Sequence of Instructions

### 1. Generate PR Description

Using the template at `{templateFile}`, generate the PR description with:
- PR metadata (branch, base, PR number if applicable)
- PR type and risk level
- Executive summary (3-5 bullet points of key changes)
- File-by-file walkthrough
- Recommended reviews with rationale

### 2. Write to File

Write to `{outputFile}` (replace {date} with actual date: YYYY-MM-DD).

### 3. Update PR Context

Update `{review_output}/current-pr-context.yaml`:
- Add `description_generated: true`
- Add `pr_type: "{classified_type}"`
- Add `risk_level: "{risk_level}"`

### 4. Display Summary

Show the user:
```
✅ PR Description generated: {outputFile}

PR Type: {type} | Risk: {risk_level}
Summary:
{executive_summary_bullets}

Recommended next steps:
{recommended_reviews}
```

Workflow complete. Return to agent menu.
