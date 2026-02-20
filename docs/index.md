# PR Review Kit

AI-driven Pull Request code review framework with specialized reviewer agents.

## Overview

PR Review Kit (`prr`) provides specialized AI reviewer agents for comprehensive code review:

| Agent | Trigger | Focus |
|-------|---------|-------|
| PRR Master | `/prr-master` | Orchestrator, routes to all workflows |
| Alex (General) | `/general-reviewer` | Logic, naming, readability, DRY |
| Sam (Security) | `/security-reviewer` | OWASP, secrets, auth, injection |
| Petra (Performance) | `/performance-reviewer` | N+1, memory, async, caching |
| Arch (Architecture) | `/architecture-reviewer` | SOLID, coupling, consistency |

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
1. [SP] Select PR     — fetch + list branches + load diff
2. [DP] Describe PR   — classify PR type + file walkthrough
3. [GR] General Review
   [SR] Security Review
   [PR] Performance Review
   [AR] Architecture Review
4. [IC] Improve Code  — concrete BEFORE/AFTER suggestions
5. [AK] Ask Code      — Q&A about specific changes
6. [RR] Generate Report
   [PC] Post Comments — post to GitHub PR via gh CLI
```

Or run **[PM] Party Mode** to get all 4 reviewers in one session.

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
├── core/           # Core module (master agent, tasks, party-mode)
└── prr/            # PR Review module (agents, workflows, data)

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
- `gh` CLI (for posting GitHub comments, optional)

## Running Tests

```bash
npm test
```
