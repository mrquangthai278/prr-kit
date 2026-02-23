---
name: "step-03-manual-context-input"
description: "Collect additional context manually from the user"
nextStepFile: "./step-04-build-knowledge-base.md"
---

# Step 3: Manual Context Input

## Goal
Give the user the opportunity to provide additional context that automated collection cannot capture — such as business rationale, known trade-offs, special constraints, or specific areas to focus on.

## Sequence of Instructions

### 1. Check Config

Read `context_collection.skip_manual_input_context` from the loaded config.

If `skip_manual_input_context: true`:

```
⏭️  Manual context input skipped (skip_manual_input_context: true in config)
```

Set `manual_context: null`. Add `step-03-manual-context-input` to `stepsCompleted`. Load: `{nextStepFile}`

**STOP — do not read further.**

---

### 2. Show Collection Summary

Print a brief summary of what was automatically collected so far:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 Auto-collection complete. Anything to add?

📊 Collected so far:
   🗂️  Files changed: {files_count}
   🎯 Domains: {domains_list}
   🧩 Stacks detected: {stacks_list or "none"}
   📘 Primary docs: {primary_docs_found}
   ⚙️  Config files: {config_files_found}
   📚 Standards docs: {standards_docs_found}
   💬 Inline annotations: {annotations_count}
   🔌 External tools: {mcp_and_rag_summary or "none"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3. Prompt User

Ask the user:

```
💬 Do you have any additional context for the reviewers?

You can share:
  • Business context or requirements behind this PR
  • Known trade-offs or constraints you accepted
  • Specific areas you'd like reviewers to focus on
  • Known issues or technical debt to be aware of
  • Links to related tickets, designs, or decisions

Type your notes and press Enter, or type "skip" to continue without adding context.
```

### 4. Capture Input

Wait for the user's response.

- If the user enters empty input, `skip`, `s`, `done`, or `no` → set `manual_context: null`, announce skip
- Otherwise → store the full text as `manual_context`

### 5. Acknowledge

**If user provided context:**
```
✅ Context noted — reviewers will treat this as ⚠️ high-priority input.
```

**If user skipped:**
```
⏩ Skipped — continuing with auto-collected context only.
```

### 6. Load Next Step

Add `step-03-manual-context-input` to `stepsCompleted`. Load: `{nextStepFile}`
