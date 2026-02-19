# PR Review Framework

<p align="center">
  <img src="docs/assets/banner.svg" alt="PR Review Framework" width="100%"/>
</p>

> AI-driven Pull Request code review — structured, multi-perspective, actionable.

Module system, agent YAML, step-file workflows, CLI installer with full IDE integration.

## Quick Start

```bash
# Install into your repo (interactive — recommended)
npx prr-kit install

# Or use the alias
npx pr-review install

# Silent install with defaults (edit config.yaml afterward)
npx prr-kit install --directory /path/to/repo --modules prr --tools claude-code --yes
```

Then open your IDE in the installed project and use `/prr-master` to start.

## How It Works

```
  Your IDE (Claude Code / Cursor / Windsurf / ...)
       │
       │  /prr-master  or  /prr-quick
       ▼
  ┌─────────────────────────────────────────────────┐
  │              PRR Master Agent                   │
  │   reads _prr/ · routes to workflows             │
  └────────────┬────────────────────────────────────┘
               │
       ┌───────▼────────┐
       │  select-pr      │  git fetch · list PRs via platform CLI
       │  (Step-file)    │  user selects PR/MR by number or branch
       └───────┬────────┘
               │  diff loaded into AI context
       ┌───────▼────────┐
       │  describe-pr   │  classify type · file-by-file walkthrough
       └───────┬────────┘
               │
       ┌───────▼────────────────────────────────┐
       │  Review agents (parallel or sequential) │
       │  GR · SR · PR · AR                     │
       │  each reads instructions.xml            │
       │  outputs structured findings            │
       └───────┬────────────────────────────────┘
               │
       ┌───────▼────────┐
       │  generate-report│  compile findings · sort by severity
       │                 │  write .md to _prr-output/reviews/
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │  post-comments  │  post inline comments via platform CLI
       │  (optional)     │  GitHub · GitLab · Azure · Bitbucket
       └────────────────┘
```

The framework installs into your project as a `_prr/` folder. Agents and workflows are Markdown/YAML files that your AI IDE reads and executes — no server, no background process, no API keys required beyond your IDE's AI.

## Configuration

After install, edit `_prr/prr/config.yaml` in your project:

```yaml
user_name: YourName
communication_language: English
target_repo: .                        # path to the git repo to review (. = current dir)
platform: auto                        # auto-detect from git remote, or: github / gitlab / azure / bitbucket
platform_repo: "owner/repo"          # required for PR listing and posting inline comments
output_folder: _prr-output
review_output: /abs/path/_prr-output/reviews
```

> `platform` defaults to `auto` — detects GitHub/GitLab/Azure/Bitbucket from the git remote URL.
> `platform_repo` is required for PR listing (`gh pr list`, `glab mr list`, etc.) and posting inline comments.
> Leave `platform_repo` empty to use local branch selection only.

## Platform Support

| Feature | None / Local | GitHub | GitLab | Azure DevOps | Bitbucket |
|---------|:---:|:---:|:---:|:---:|:---:|
| Core review (diff analysis) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auto-detect platform from remote URL | — | ✅ | ✅ | ✅ | ✅ |
| List open PRs/MRs | ❌ | ✅ `gh` | ✅ `glab` | ✅ `az` | ✅ `bb` |
| Select PR by number (auto base/head) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Load diff via platform CLI | ❌ | ✅ `gh pr diff` | ✅ `glab mr diff` | ⚠️ git fallback | ⚠️ git fallback |
| Post inline code comments | ❌ | ✅ Reviews API | ✅ MR discussions | ✅ PR threads | ✅ REST API |
| Post summary review | ❌ | ✅ | ✅ | ✅ | ✅ |
| Review verdict (approve / request changes) | ❌ | ✅ | ✅ | ✅ | ❌ |
| Required CLI | — | `gh` | `glab` | `az` + extension | `bb` / curl |

> **None / Local mode**: all review analysis runs locally via `git diff` — no platform CLI required. Findings are saved to `_prr-output/reviews/` only.

## Review Workflow

### Quick mode — one command, full pipeline

```
/prr-quick    or    /prr-master → QR
```

Runs automatically: **select PR → describe → all 4 reviews → generate report**
Only pauses once to ask which PR/branch to review.

### Manual mode — step by step

| Code | Command | Description |
|------|---------|-------------|
| `CP` | Collect Project Context | Scan ESLint/tsconfig/docs, extract coding rules, capture domain knowledge — **run once per project** |
| `SP` | Select PR | Fetch latest → list open PRs (via `gh`) or branches → select head + base → load diff |
| `DP` | Describe PR | Classify PR type, generate summary, file-by-file walkthrough |
| `GR` | General Review | Logic, naming, readability, DRY, best practices |
| `SR` | Security Review | OWASP Top 10, secrets, auth, rate limits, injection |
| `PR` | Performance Review | N+1 queries, memory leaks, async patterns, caching |
| `AR` | Architecture Review | SOLID, layers, coupling, consistency with codebase |
| `IC` | Improve Code | Concrete BEFORE/AFTER code suggestions |
| `AK` | Ask Code | Q&A about specific changes in this PR |
| `RR` | Generate Report | Compile all findings → Markdown report in `_prr-output/reviews/` |
| `PC` | Post Comments | Post inline code comments to GitHub PR via `gh` Reviews API |
| `PM` | Party Mode 🎉 | All 4 reviewers in one collaborative session |
| `HH` | Help | Show this guide |

### Selecting a PR (SP step)

**With `platform_repo` configured** — lists open PRs/MRs via platform CLI:
```
#45  "Add OAuth2 login"      feature/oauth → main    @alice  3h ago
#44  "Fix memory leak"       fix/memory    → main    @bob    1d ago
```
Enter PR number → base and head resolved automatically.

**Without `platform_repo`** — asks explicitly for both branches:
```
🎯 Head branch (the branch to review)?
   • Enter a number from the list  (e.g., 1)
   • Type the branch name directly  (e.g., feature/my-feature)

🎯 Base branch (what to diff against)?
   • Press Enter for default [main]
   • Type the branch name directly  (e.g., develop)
```

## Review Agents

| Agent | Slash Command | Speciality |
|-------|--------------|------------|
| PRR Master | `/prr-master` | Orchestrator — routes all workflows, full menu |
| PRR Quick | `/prr-quick` | One-command full pipeline (select → review → report) |

Specialist reviewer agents (Alex, Sam, Petra, Arch) are orchestrated internally by the master agent and party-mode workflow. Use `[PM] Party Mode` from the master menu to run all 4 reviewers in a collaborative session.

## Severity Levels

All findings use a standard format:

- 🔴 **[BLOCKER]** — Must fix before merge
- 🟡 **[WARNING]** — Should fix (with explanation)
- 🟢 **[SUGGESTION]** — Nice-to-have improvement
- 📌 **[QUESTION]** — Needs clarification from author

## Inline Code Comments

When `[PC] Post Comments` is run with `platform_repo` configured, it posts findings as **inline code comments** on the exact file and line — the same experience as a human reviewer.

| Platform | Method | Required CLI |
|----------|--------|-------------|
| GitHub | Reviews API | `gh auth login` |
| GitLab | MR Discussions API | `glab auth login` |
| Azure DevOps | PR Threads API | `az login` |
| Bitbucket | Inline Comments REST API | `bb` / `curl` |

## Supported IDEs

- **Claude Code** (preferred)
- **Cursor** (preferred)
- **Windsurf** (preferred)
- Cline, Roo, Gemini CLI, Kiro

## Requirements

- Node.js 20+
- Git
- Platform CLI (optional — only needed for PR listing and inline comments):
  - GitHub: [`gh`](https://cli.github.com/)
  - GitLab: [`glab`](https://gitlab.com/gitlab-org/cli)
  - Azure DevOps: [`az`](https://learn.microsoft.com/en-us/cli/azure/) + Azure DevOps extension
  - Bitbucket: [`bb`](https://bitbucket.org/atlassian/bitbucket-cli) or `curl`

## Development

```bash
npm install
npm test
```

## Project Structure

```
main-project/
├── src/
│   ├── core/          # Master agent, tasks, party-mode workflow
│   └── prr/
│       ├── agents/    # 4 specialist reviewer agents
│       └── workflows/
│           ├── 0-setup/     # [CP] Collect Project Context
│           ├── 1-discover/  # [SP] Select PR
│           ├── 2-analyze/   # [DP] Describe PR
│           ├── 3-review/    # [GR] [SR] [PR] [AR] Reviews
│           ├── 4-improve/   # [IC] Improve Code
│           ├── 5-ask/       # [AK] Ask Code
│           ├── 6-report/    # [RR] Generate Report, [PC] Post Comments
│           └── quick/       # [QR] Full pipeline in one command
├── tools/
│   └── cli/           # CLI installer + IDE handlers
├── test/              # Schema + component tests
└── docs/              # Documentation
```

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding workflows, reviewer agents, IDE integrations, and more.

## License

[MIT](LICENSE) © mrquangthai278
