---
name: generate-report
description: "Compile all review findings into a structured Markdown review report"
main_config: "{project-root}/_prr/prr/config.yaml"
nextStep: "./steps/step-01-collect.md"
---

# Generate Report Workflow

**Goal:** Collect all findings from completed review workflows and compile them into a single, well-structured Markdown review report.

## WORKFLOW ARCHITECTURE

3-step process:
1. Collect findings from all completed review output files
2. Organize by severity (🔴 → 🟡 → 🟢) and category
3. Write final report using the review report template

## INITIALIZATION

Load config from `{main_config}`.
Load PR context from `{review_output}/current-pr-context.yaml`.

## EXECUTION

Read fully and follow: `{nextStep}`
