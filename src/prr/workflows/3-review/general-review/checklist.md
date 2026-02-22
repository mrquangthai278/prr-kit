---
title: "General Review Completion Checklist"
validation-target: "General review output file"
---

# General Review Checklist

## Coverage
- [ ] All changed files reviewed (or all chunks if large diff)
- [ ] Logic and correctness checked for each changed function
- [ ] Error handling reviewed
- [ ] Test coverage assessed
- [ ] Side effects reviewed (observer deps, resource cleanup, derived value purity, global state mutations)
- [ ] Cross-file impact assessed (shared modules, event/signal dispatch, API and contract changes)

## Finding Quality
- [ ] Every finding has: file path + line/function reference
- [ ] Every finding has: severity level (🔴/🟡/🟢/❓)
- [ ] Every finding has: suggested fix or improvement
- [ ] No vague findings ("this code is bad" — must specify why and what to do)
- [ ] ❓ QUESTION findings include: specific concern + which files may be affected + exact question to ask author
- [ ] Side effect findings include: the affected location OUTSIDE the diff (not just the changed file)

## Output
- [ ] Findings written to `{review_output}/general-review-{date}.md`
- [ ] PR context updated with `general-review` in completed list
- [ ] At least one positive observation included (balanced review)
