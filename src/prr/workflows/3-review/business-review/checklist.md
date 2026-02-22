---
title: "Business Review Completion Checklist"
validation-target: "Business review output file"
---

# Business Review Checklist

## Coverage
- [ ] Feature completeness assessed (branch name, PR title, acceptance criteria if available)
- [ ] User impact traced (existing flows checked for regressions, new flows checked for clarity)
- [ ] Business risk evaluated for each 🔴 finding from prior reviews (SR, GR, PR, AR)
- [ ] Data and migration impact assessed (schema changes, storage migration, rollback plan)
- [ ] Observability gaps identified (analytics, error monitoring, logging, feature flags)
- [ ] Cross-cutting and deployment concerns reviewed (browser compat, API contracts, env parity)

## Finding Quality
- [ ] Every finding states: user impact (who is affected and what happens)
- [ ] Every finding states: severity level (🔴/🟡/🟢/❓)
- [ ] Technical findings from prior reviews translated into business language
- [ ] ❓ QUESTION findings include: specific concern + exact question to ask author
- [ ] Business Verdict section written: overall risk level (CRITICAL/HIGH/MEDIUM/LOW/MINIMAL)
- [ ] Deployment recommendation stated: ship now / ship with fixes / do not ship
- [ ] Post-ship monitoring noted: what to watch after deploy

## Output
- [ ] Findings written to `{review_output}/business-review-{date}.md`
- [ ] PR context updated with `business-review` in completed list
