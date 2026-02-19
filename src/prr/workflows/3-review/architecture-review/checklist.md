---
title: "Architecture Review Completion Checklist"
validation-target: "Architecture review output file"
---

# Architecture Review Checklist

## Coverage
- [ ] Layer/separation of concerns checked
- [ ] Coupling and module dependencies reviewed
- [ ] Consistency with existing codebase patterns assessed
- [ ] SOLID violations checked (only real ones, not theoretical)

## Finding Quality
- [ ] Every finding references the EXISTING pattern that should be followed
- [ ] Over-engineering suggestions are avoided (consistency > theoretical purity)
- [ ] Every finding has: file path + what pattern was violated
- [ ] Justification provided for why the finding matters (not just "violates SOLID")

## Output
- [ ] Findings written to `{review_output}/architecture-review-{date}.md`
- [ ] PR context updated with `architecture-review` in completed list
