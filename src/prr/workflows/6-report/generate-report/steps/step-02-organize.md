---
name: "step-02-organize"
description: "Organize findings by severity and category for the report"
nextStepFile: "./step-03-write.md"
---

# Step 2: Organize Findings

## Sequence of Instructions

### 1. Sort by Severity

Order: 🔴 Blockers (Critical/High) → 🟡 Warnings (Medium) → 🟢 Suggestions (Low) → ❓ Questions

### 2. Group by Category

Within each severity level, group by review category:
- 🔒 Security
- ⚡ Performance
- 🏗️ Architecture
- 👁️ General Quality
- 💼 Business Impact
- 💡 Improvements

### 3. Create Executive Summary

Write a two-part summary:

**Technical part:**
- Overall code quality assessment (1 sentence)
- Highest priority technical issues
- Positive findings (good practices found)

**Business part (if business-review was completed):**
- Overall business risk level: CRITICAL / HIGH / MEDIUM / LOW / MINIMAL
- Top business concern (1 sentence): what is the biggest real-world risk?
- Deployment recommendation from business perspective

**Combined verdict:**
- ✅ APPROVE — no blockers, low business risk, safe to ship
- ⚠️ APPROVE WITH NOTES — warnings only, medium business risk, monitor post-ship
- 🚫 REQUEST CHANGES — blockers present OR high/critical business risk

### 4. Compile Business Risk Summary

If business-review findings exist:
- Extract overall business risk level
- List top 3 business concerns with their severity
- List any data/migration risks
- Note observability gaps
- Note deployment concerns

### 5. Identify Files with Multiple Issues

List files that have 3+ findings — these may need more significant rework.

### 6. Load Next Step

Add `step-02-organize` to `stepsCompleted`. Load: `{nextStepFile}`
