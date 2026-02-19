---
name: "step-03-ask-context"
description: "Ask user for domain knowledge and architectural context that cannot be inferred from files"
nextStepFile: "./step-04-save-context.md"
---

# Step 3: Ask for Domain & Architecture Context

## Sequence of Instructions

### 1. Present Scan Summary

Show what was auto-discovered and what is still unknown:

```
📋 Auto-discovered context:
   ✅ Stack: {detected_stack}
   ✅ Linting: {n} hard rules, {n} soft rules
   ✅ Naming conventions: {n} documented, {n} inferred
   ✅ Architecture layers: {layer_order or "not documented"}
   ✅ Test framework: {framework or "not found"}

❓ Still need from you ({n} questions):
```

### 2. Ask Domain Questions

Ask these questions **one group at a time**. Wait for answer before continuing.

---

**Group A: Business Domain**

```
What does this project do? (1-3 sentences about the business domain)

Examples:
  "E-commerce platform for B2B wholesale orders"
  "Internal HR system for leave requests and payroll"
  "SaaS analytics dashboard for marketing teams"

Your answer:
```

Halt and wait for answer.

Then ask:

```
What are the key domain entities? (the main "things" the system manages)

Examples: User, Order, Product, Invoice, Report, Campaign, Shift, etc.

Your answer (comma-separated):
```

Halt and wait.

Then ask:

```
Are there any domain-specific rules that code must enforce?
(business rules reviewers should verify, not just code quality)

Examples:
  "An Order cannot transition from SHIPPED back to PENDING"
  "A User must have at least one Role"
  "Discount cannot exceed 50% without manager approval flag"
  "All monetary values must be stored as integers (cents), never floats"

Your answer (or press Enter to skip):
```

Halt and wait.

---

**Group B: Review Priorities**

```
What should reviewers focus on MOST for this project?
(select all that apply, or describe your priorities)

  1. Security — auth, injection, data exposure
  2. Performance — this is a high-traffic system
  3. Data integrity — DB transactions, consistency
  4. Test coverage — we require tests for all new code
  5. API contracts — breaking changes are critical
  6. Accessibility — frontend a11y matters
  7. Error handling — we need detailed error context

Your answer (numbers or description):
```

Halt and wait.

Then ask:

```
What should reviewers IGNORE or deprioritize?
(things that are intentional, handled elsewhere, or not worth flagging)

Examples:
  "console.log is allowed in development, we strip in CI"
  "We intentionally use callbacks in legacy modules, don't flag them"
  "Test files don't need JSDoc"
  "We allow 'any' in migration scripts"

Your answer (or press Enter to skip):
```

Halt and wait.

---

**Group C: Architecture Context** (only ask if architecture docs were NOT found in step-01)

```
How is the codebase organized? What are the main layers/modules?

Examples:
  "Vue 3 frontend (src/), Node/Express API (api/), shared types (shared/)"
  "Monorepo: apps/web, apps/api, packages/ui, packages/utils"
  "MVC: routes/, controllers/, services/, models/"
  "Feature-based: src/features/{feature}/{components,hooks,api}/"

Your answer:
```

Halt and wait.

Then ask:

```
Are there any known anti-patterns or tech debt areas reviewers should know about?
(so they don't waste time flagging known issues)

Examples:
  "auth module is legacy, will be rewritten — don't review deeply"
  "UserController is a God class — we know, it's being split"
  "Some old files still use callbacks — that's expected"

Your answer (or press Enter to skip):
```

Halt and wait.

---

**Group D: PR-specific guidelines**

```
Any specific rules for what needs review before merging?

Examples:
  "All PRs touching /api/payments must have security review"
  "DB migration files require architecture review"
  "Changes to auth/* always need two approvals"
  "Frontend PRs need accessibility check"

Your answer (or press Enter to skip):
```

Halt and wait.

### 3. Confirm Collected Context

Display a summary of all answers received:

```
✅ Context collected:

Domain: {domain_description}
Key entities: {entities}
Business rules: {rules or "none specified"}

Review priorities: {priorities}
Ignore list: {ignore_list or "none"}

Architecture: {architecture_description}
Known debt: {debt_notes or "none"}
PR-specific rules: {pr_rules or "none"}

Is this correct? [Y] Save  [E] Edit  [S] Skip remaining
```

Halt and wait for confirmation.

If `[E]` → ask which group to re-answer, then re-ask that group.
If `[S]` → proceed with what's collected so far.

### 4. Load Next Step

Add `step-03-ask-context` to `stepsCompleted`. Load: `{nextStepFile}`
