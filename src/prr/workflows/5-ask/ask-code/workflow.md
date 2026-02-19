---
name: ask-code
description: "Interactive Q&A about specific code changes in the selected PR"
main_config: "{project-root}/_prr/prr/config.yaml"
nextStep: "./steps/step-01-load-context.md"
---

# Ask Code Workflow

**Goal:** Allow the reviewer to ask specific questions about the code changes in the PR. Unlike other review workflows that scan the entire diff, this focuses on a specific question or code area.

Use cases:
- "What does this function do?"
- "Why was this pattern used instead of X?"
- "What are the potential issues with this approach?"
- "How does this change interact with the existing auth system?"
- "Is this the right way to handle this edge case?"

## WORKFLOW ARCHITECTURE

Interactive 2-step flow:
1. Load PR context and diff
2. Answer the user's specific question with full context

## INITIALIZATION

Load config from `{main_config}`.

## EXECUTION

Read fully and follow: `{nextStep}`
