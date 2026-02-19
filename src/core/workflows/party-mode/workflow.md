---
name: party-mode
description: "Multi-reviewer discussion: all specialized agents review and debate the PR together"
main_config: "{project-root}/_prr/prr/config.yaml"
nextStep: "./steps/step-01-load-reviewers.md"
---

# Party Mode Workflow 🎉

**Goal:** Simulate a multi-reviewer code review session where all specialized agents (General, Security, Performance, Architecture) each contribute their perspective on the PR, then debate any conflicting findings.

## WORKFLOW ARCHITECTURE

2-step process:
1. Load reviewer personas and assign sections
2. Run structured discussion with each reviewer contributing findings

## WHEN TO USE

Use Party Mode when you want:
- A comprehensive review from all angles in one session
- Reviewers to challenge each other's findings
- A realistic team code review feel
- Faster than running all 4 reviews separately

## INITIALIZATION

Load config from `{main_config}`.
Load PR context from `{review_output}/current-pr-context.yaml`.

If no PR context exists, prompt user to run [SP] Select PR first.

## EXECUTION

Read fully and follow: `{nextStep}`
