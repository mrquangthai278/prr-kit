---
name: "step-02-post"
description: "Post comments via platform CLI/API, verify, clean up"
---

# Step 2: Post to Platform

## Sequence of Instructions

### 1. Post Based on Platform

**GitHub:**
```bash
gh api repos/{platform_repo}/pulls/{pr_number}/reviews \
  --method POST \
  --header "Accept: application/vnd.github+json" \
  --input {review_output}/.prr-payload.json
```

Handle 422 (line not in diff): remove the offending inline comment from payload, add to summary body, retry.

**GitLab:**
```bash
# Post summary as MR note
glab mr note {pr_number} --repo {platform_repo} --message "$(cat {review_output}/.prr-summary.md)"

# Post each inline comment
for payload in {review_output}/.prr-payload-*.json; do
  glab api projects/{encoded_repo}/merge_requests/{pr_number}/discussions \
    --method POST --input "$payload"
done
```
Where `{encoded_repo}` = `{platform_repo}` with `/` replaced by `%2F`.

**Azure DevOps:**
```bash
# Post summary as PR comment
az repos pr comment add --id {pr_number} --comment "$(cat {review_output}/.prr-summary.md)"

# Post each inline thread
for payload in {review_output}/.prr-thread-*.json; do
  az repos pr thread create --id {pr_number} \
    --template-file "$payload"
done
```

**Bitbucket:**
```bash
# Post summary
curl -s -X POST \
  "https://api.bitbucket.org/2.0/repositories/{platform_repo}/pullrequests/{pr_number}/comments" \
  -H "Authorization: Bearer {BB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"content\": {\"raw\": \"$(cat {review_output}/.prr-summary.md)\"}}"

# Post each inline comment
for payload in {review_output}/.prr-bb-*.json; do
  curl -s -X POST \
    "https://api.bitbucket.org/2.0/repositories/{platform_repo}/pullrequests/{pr_number}/comments" \
    -H "Authorization: Bearer {BB_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "@$payload"
done
```

### 2. Verify

Confirm the post was successful by checking for a `200` or `201` response.

**GitHub:** `gh pr view {pr_number} --repo {platform_repo} --json reviews --jq '.reviews[-1].state'`
**GitLab:** `glab mr view {pr_number} --repo {platform_repo} --output json | jq '.user_notes_count'`
**Azure:** `az repos pr thread list --id {pr_number} --query "length(@)"`
**Bitbucket:** check response `id` field from the post

### 3. Clean Up Temp Files

```bash
rm -f {review_output}/.prr-payload*.json \
       {review_output}/.prr-summary.md \
       {review_output}/.prr-thread-*.json \
       {review_output}/.prr-bb-*.json
```

### 4. Display Completion

```
✅ Review Posted!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Platform:  {active_platform}
  PR/MR #:   {pr_number}
  Inline:    {inline_count} comments on code lines
  Verdict:   {verdict_label}
  Link:      {pr_url}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Workflow complete.** Return to agent menu.
