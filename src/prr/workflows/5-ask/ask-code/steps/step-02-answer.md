---
name: "step-02-answer"
description: "Answer the user's question about the code changes"
---

# Step 2: Answer the Question

## Sequence of Instructions

### 1. Analyze the Question in Context

Using the full diff and PR context:
- Locate the relevant code sections
- Understand the full context around the specific area being asked about
- Consider how it interacts with the rest of the codebase

### 2. Provide a Focused Answer

Structure the answer as:
1. **Direct answer** to the question (1-3 sentences)
2. **Supporting evidence** from the code (cite specific lines)
3. **Additional context** if relevant (related code, implications)
4. **Follow-up considerations** if the answer reveals potential issues

### 3. Offer to Continue

After answering:

```
💬 Does this answer your question?
   Feel free to ask another question about the code, or return to the menu for review commands.
```

**HALT — this workflow supports multiple questions in the same session.**
If the user asks another question, loop back to answering it without reloading context.
If the user returns to the menu, workflow is complete.
