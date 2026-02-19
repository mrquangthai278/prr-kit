---
name: "step-02-organize"
description: "Organize findings by severity and category for the report"
nextStepFile: "./step-03-write.md"
---

# Step 2: Organize Findings

## Sequence of Instructions

### 1. Sort by Severity

Order: 🔴 Blockers/Critical → 🟡 Warnings/High → 🟡 Medium → 🟢 Suggestions/Low → 📌 Questions

### 2. Group by Category

Within each severity level, group by review category:
- 🔒 Security
- ⚡ Performance
- 🏗️ Architecture
- 👁️ General Quality
- 💡 Improvements

### 3. Create Executive Summary

Write 3-5 bullet points summarizing the overall review:
- Overall quality assessment (1 sentence)
- Highest priority issues to address
- Positive findings (good practices found)
- Recommendation: approved / needs changes / request changes

### 4. Identify Files with Multiple Issues

List files that have 3+ findings — these may need more significant rework.

### 5. Load Next Step

Add `step-02-organize` to `stepsCompleted`. Load: `{nextStepFile}`
