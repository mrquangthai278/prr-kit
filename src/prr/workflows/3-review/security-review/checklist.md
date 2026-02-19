---
title: "Security Review Completion Checklist"
validation-target: "Security review output file"
---

# Security Review Checklist

## Coverage
- [ ] Secrets scan completed (hardcoded API keys, passwords, tokens)
- [ ] OWASP A01-A05 checked
- [ ] OWASP A06-A10 checked
- [ ] Auth/authorization logic reviewed (if applicable)
- [ ] Input validation reviewed (if applicable)
- [ ] New dependencies checked for known vulnerabilities

## Finding Quality
- [ ] Every finding states: WHAT the vulnerability is
- [ ] Every finding states: WHERE (file + line number)
- [ ] Every finding states: IMPACT (what could an attacker do)
- [ ] Every finding states: HOW TO FIX
- [ ] Severity: Critical/High/Medium/Low/Info (not just emojis)

## Output
- [ ] Findings written to `{review_output}/security-review-{date}.md`
- [ ] PR context updated with `security-review` in completed list
