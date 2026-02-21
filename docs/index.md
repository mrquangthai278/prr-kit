# PR Review Kit

AI-driven Pull Request code review framework with specialized reviewer agents.

## Overview

PR Review Kit (`prr`) provides specialized AI reviewer agents for comprehensive code review:

| Agent | Trigger | Focus |
|-------|---------|-------|
| PRR Master | `/prr-master` | Orchestrator, routes to all workflows |
| General (GR) | `GR` | Logic, naming, readability, DRY |
| Security (SR) | `SR` | OWASP, secrets, auth, injection |
| Performance (PR) | `PR` | N+1, memory, async, caching |
| Architecture (AR) | `AR` | SOLID, coupling, consistency |
| Business (BR) | `BR` | User impact, risk, completeness, observability |

## Installation

```bash
npx pr-review install
```

Or with options:
```bash
node tools/cli/prr-cli.js install \
  --directory /path/to/your/repo \
  --modules prr \
  --tools claude-code \
  --target-repo . \
  --github-repo owner/repo
```

## Review Workflow

```
1. [SP] Select PR          — fetch + list branches + load diff
2. [DP] Describe PR        — classify PR type + file walkthrough
   ↳ collect-pr-context    — auto: scan changed files → collect ESLint rules,
                             CLAUDE.md, CONTRIBUTING.md, inline @annotations,
                             MCP tools (Confluence/Jira/Figma), RAG systems
                             → pr-{branch}-context.yaml (fresh, PR-specific)
3. [GR] General Review     — logic, naming, DRY, tests
   [SR] Security Review    — OWASP, XSS, secrets, auth
   [PR] Performance Review — N+1, async, memory
   [AR] Architecture Review— layers, SOLID, coupling
   [BR] Business Review    — user impact, risk, completeness, data safety
4. [IC] Improve Code       — concrete BEFORE/AFTER suggestions
5. [AK] Ask Code           — Q&A about specific changes
6. [RR] Generate Report    — compile all findings → Markdown report
   [PC] Post Comments      — post inline comments to GitHub/GitLab/Azure/Bitbucket

Utilities:
   [CL] Clear              — remove context files and/or review reports
   [HH] Help               — show guide and available commands
```

Or run **[QR] Quick Review** (`/prr-quick`) to run the full pipeline in one command.

## Configuration

See **[configuration.md](configuration.md)** for the full reference.

Minimal config (`_prr/prr/config.yaml`):

```yaml
user_name: YourName
communication_language: English
target_repo: .
platform: github
platform_repo: "owner/repo"
review_output: ./_prr-output/reviews

context_collection:
  enabled: true
  mode: pr-specific

external_sources:
  enabled: false   # set true to activate MCP + RAG enrichment
```

## Severity Levels

| Level | Meaning |
|-------|---------|
| 🔴 Blocker | Must fix before merge |
| 🟡 Warning | Should fix, explains why |
| 🟢 Suggestion | Nice-to-have improvement |
| 📌 Question | Needs clarification from author |

## Architecture

```
src/
├── core/           # Master agent, tasks (help, clear), workflow engine
└── prr/            # PR Review module
    ├── agents/     # Specialist reviewer agents
    ├── config-template.yaml
    └── workflows/
        ├── 1-discover/      # Select PR
        ├── 2-analyze/       # Describe PR + collect-pr-context
        ├── 3-review/        # GR SR PR AR BR
        ├── 4-improve/       # Improve Code
        ├── 5-ask/           # Ask Code
        ├── 6-report/        # Generate Report + Post Comments
        └── quick/           # Full pipeline

tools/
└── cli/            # CLI installer (Commander.js)
    ├── commands/   # install, uninstall, status
    ├── lib/        # utilities + agent compiler
    └── installers/ # core installer + IDE handlers
```

After installation, the framework deploys to `_prr/` in your target repository.

## Requirements

- Node.js 18+
- Git (for diff operations)
- `gh` CLI (for posting GitHub comments — optional)

## Running Tests

```bash
npm test
```
