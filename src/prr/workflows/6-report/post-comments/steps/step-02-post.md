---
name: "step-02-post"
description: "Post comments via platform CLI/API, verify, clean up"
---

# Step 2: Post to Platform

## Sequence of Instructions

### 1. Post Based on Platform

**⚠️ Always use `{gh_path}` (the resolved full path from step-01), not bare `gh`.**
**⚠️ Always quote paths containing spaces.**

---

**GitHub:**
```bash
"{gh_path}" api repos/{platform_repo}/pulls/{pr_number}/reviews \
  --method POST \
  --header "Accept: application/vnd.github+json" \
  --input "{temp_dir}/prr-payload.json"
```

**Handle 422 errors — two known cases:**

**Case A — Self-review** (`"Review Can not request changes on your own pull request"`):
- The authenticated user is the PR author. GitHub disallows `REQUEST_CHANGES` on own PRs.
- Fix: Update `event` in the payload from `"REQUEST_CHANGES"` to `"COMMENT"` and retry once.
- Use whichever runtime is available (`{detected_runtime}` from step A earlier):

```bash
# Node.js
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('{temp_dir}/prr-payload.json','utf-8')); p.event='COMMENT'; fs.writeFileSync('{temp_dir}/prr-payload.json',JSON.stringify(p,null,2)); console.log('event → COMMENT')"

# Python3
python3 -c "import json; f=open('{temp_dir}/prr-payload.json','r+'); p=json.load(f); p['event']='COMMENT'; f.seek(0); json.dump(p,f,ensure_ascii=False,indent=2); f.truncate(); print('event → COMMENT')"
```
Then retry the POST above.

**Case B — Line not in diff** (`"Pull Request Review thread not found"` / line outside diff hunk):
- Remove the offending comment from the payload (the one with the invalid `path`/`line`), append its body to the summary `body` field as a fallback, then retry.
- Repeat until all comments are either posted inline or moved to summary.

---

**GitLab:**
```bash
# Post summary as MR note
glab mr note {pr_number} --repo {platform_repo} --message "$(cat '{temp_dir}/prr-summary.md')"

# Post each inline comment
for payload in "{temp_dir}/prr-payload-"*.json; do
  glab api projects/{encoded_repo}/merge_requests/{pr_number}/discussions \
    --method POST --input "$payload"
done
```
Where `{encoded_repo}` = `{platform_repo}` with `/` replaced by `%2F`.

---

**Azure DevOps:**
```bash
# Post summary as PR comment
az repos pr comment add --id {pr_number} --comment "$(cat '{temp_dir}/prr-summary.md')"

# Post each inline thread
for payload in "{temp_dir}/prr-thread-"*.json; do
  az repos pr thread create --id {pr_number} \
    --template-file "$payload"
done
```

---

**Bitbucket:**
```bash
# Post summary
curl -s -X POST \
  "https://api.bitbucket.org/2.0/repositories/{platform_repo}/pullrequests/{pr_number}/comments" \
  -H "Authorization: Bearer {BB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"content\": {\"raw\": \"$(cat '{temp_dir}/prr-summary.md')\"}}"

# Post each inline comment
for payload in "{temp_dir}/prr-bb-"*.json; do
  curl -s -X POST \
    "https://api.bitbucket.org/2.0/repositories/{platform_repo}/pullrequests/{pr_number}/comments" \
    -H "Authorization: Bearer {BB_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "@$payload"
done
```

---

### 2. Construct PR/MR URL

Build `{pr_url}` from available variables based on `{active_platform}`:

| Platform | URL pattern |
|----------|------------|
| `github` | `https://github.com/{platform_repo}/pull/{pr_number}` |
| `gitlab` | `https://gitlab.com/{platform_repo}/-/merge_requests/{pr_number}` |
| `azure` | `https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{pr_number}` |
| `bitbucket` | `https://bitbucket.org/{platform_repo}/pull-requests/{pr_number}` |
| `none` | *(not applicable)* |

For Azure, extract `{org}`, `{project}`, `{repo}` from `{platform_repo}` (format: `org/project/repo`).

If `{pr_number}` is empty (branch-only flow), set `{pr_url}` = *(not available)*.

---

### 3. Verify

Confirm the post was successful.

**⚠️ Do NOT pipe CLI output to `node -e` or `python -e` via stdin on Windows** — `/dev/stdin` does not exist. Use `--jq` (gh CLI built-in) or write output to a temp file first.

**GitHub:**
```bash
"{gh_path}" pr view {pr_number} --repo {platform_repo} --json reviews --jq '.reviews[-1].state'
```
Expected: `"COMMENTED"` or `"APPROVED"` or `"CHANGES_REQUESTED"`.

**GitLab:**
```bash
glab mr view {pr_number} --repo {platform_repo} --output json | jq '.user_notes_count'
```

**Azure:**
```bash
az repos pr thread list --id {pr_number} --query "length(@)"
```

**Bitbucket:** check response `id` field from the POST above.

---

### 4. Clean Up Temp Files

```bash
rm -f "{temp_dir}/prr-payload.json" \
       "{temp_dir}/prr-payload-"*.json \
       "{temp_dir}/prr-summary.md" \
       "{temp_dir}/prr-thread-"*.json \
       "{temp_dir}/prr-bb-"*.json \
       "{temp_dir}/build-payload.mjs" \
       "{temp_dir}/build-payload.py"
```

---

### 5. Display Completion

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
