# Bash / Shell — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.sh`, `#!/bin/bash`, `#!/bin/sh`, `#!/usr/bin/env bash`, `.bashrc`, `.zshrc`, `Makefile` with shell recipes

---

## Security
- **[CRITICAL]** Unquoted variables in commands (`rm -rf $DIR`) → word splitting and glob expansion on values with spaces or wildcards causes unintended file deletion or command injection. Always double-quote variable expansions: `rm -rf "$DIR"`.
- **[CRITICAL]** `eval "$user_input"` or equivalent dynamic execution → arbitrary command execution by any attacker who controls the input. Never pass user-controlled data to `eval`; use parameter expansion and whitelisted commands instead.
- **[HIGH]** `curl | bash` pattern for installation scripts → remote code executed without inspection or integrity check. Download to a temp file, verify SHA-256/GPG signature, then execute.
- **[HIGH]** Temporary files created in `/tmp` with predictable names → symlink attacks redirect writes to arbitrary paths. Always create temp files with `mktemp` and remove them with a `trap ... EXIT`.
- **[HIGH]** Secrets (tokens, passwords) stored as plain text in scripts committed to the repository → extracted from git history. Use environment variables loaded from a secrets manager; add secret file patterns to `.gitignore`.
- **[HIGH]** Downloaded scripts executed without checksum verification → supply-chain compromise undetectable. Verify SHA-256 or GPG signature before executing any downloaded artifact.
- **[MEDIUM]** `chmod 777` applied to directories or files containing sensitive data → world-writable, any local user can modify. Use least-privilege permissions (e.g., `750` for dirs, `640` for files).
- **[MEDIUM]** `set -e` not set → script continues after a failing command, leaving system in a partially modified state. Add `set -euo pipefail` at the top of every script.

---

## Performance
- **[HIGH]** `cat file | grep pattern` (useless cat) → spawns an extra process for no benefit. Use `grep pattern file` directly.
- **[HIGH]** Command substitution `$(command)` inside a loop → spawns a subshell on every iteration; multiplied cost on large inputs. Capture the output once before the loop or use process substitution `< <(command)`.
- **[MEDIUM]** `find . | xargs cmd` without `-print0` / `-0` → breaks on filenames containing spaces or newlines, causing wrong files to be processed. Use `find . -print0 | xargs -0 cmd`.
- **[MEDIUM]** `while read line` without `IFS=` and `-r` flag → leading/trailing whitespace stripped and backslashes interpreted. Use `while IFS= read -r line`.
- **[MEDIUM]** Calling external tools (`sed`, `awk`, `cut`) for simple string operations achievable with bash parameter expansion → unnecessary subprocess overhead. Use `${var#prefix}`, `${var%suffix}`, `${var//pat/rep}` built-ins.
- **[LOW]** Not using `local` in functions → function variables pollute the global shell namespace and can cause subtle bugs in larger scripts. Declare all function variables with `local`.

---

## Architecture
- **[HIGH]** Monolithic script with no functions → not testable, reusable, or auditable. Break logic into named functions; consider `bats` or `shunit2` for unit testing.
- **[HIGH]** No error handling (`set -euo pipefail` absent) → silent partial failures leave the system in an unknown state. Add `set -euo pipefail` and trap on `ERR` to log and exit cleanly.
- **[MEDIUM]** Script not idempotent → running it twice causes errors or duplicate side effects. Guard each action with existence checks (`[ -f ... ]`, `[ -d ... ]`) before creating or modifying.
- **[MEDIUM]** Hardcoded absolute paths (`/opt/myapp`) → breaks in different environments. Use configurable variables at the top or derive paths from `$SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)`.
- **[LOW]** Scripts intended for others lack `--help`, argument validation, and usage messages → opaque interface for consumers. Add argument parsing with `getopts` and a `usage()` function.

---

## Code Quality
- **[HIGH]** Missing `set -euo pipefail` at the start of the script → errors in pipelines and unset variables go undetected. Add as the first non-comment line of every script.
- **[HIGH]** `[ $var == "value" ]` with unquoted variable → if `$var` is empty, the expression degrades to `[ == "value" ]` causing a syntax error. Quote all variable expansions inside `[ ]`.
- **[MEDIUM]** Using `[ ]` (POSIX `test`) instead of `[[ ]]` in bash scripts → `[ ]` requires quoting to prevent word splitting; `[[ ]]` is safer and supports pattern matching. Prefer `[[ ]]` in all bash (not sh) scripts.
- **[MEDIUM]** Missing or incorrect shebang → script executed by the wrong interpreter. Use `#!/usr/bin/env bash` for portability or `#!/bin/bash` for explicit path; never omit it.
- **[LOW]** Not running ShellCheck in CI → entire categories of bugs (quoting, globbing, SC codes) go undetected. Add `shellcheck *.sh` as a CI lint step.

---

## Common Bugs & Pitfalls
- **[HIGH]** `if [ $? -eq 0 ]` checked after intervening commands have reset `$?` → wrong exit code evaluated. Test the command directly: `if some_command; then ... fi`, or capture `ret=$?` immediately after.
- **[HIGH]** `for f in $(ls)` → fails on filenames with spaces; `ls` output is not reliably parseable. Use `for f in *` or `find` with `-print0` for recursive traversal.
- **[MEDIUM]** `[ $var = "" ]` fails with "unary operator expected" when `var` is unset → script aborts or branches incorrectly. Use `[ -z "${var}" ]` or `[ "${var:-}" = "" ]`.
- **[MEDIUM]** `exit` vs `return` not distinguished for sourced scripts → `exit` in a sourced script terminates the parent shell. Use `return` inside functions and sourced files; reserve `exit` for top-level script termination.
- **[LOW]** Trailing whitespace or mixed indentation in heredocs → unexpected literal whitespace in generated files or commands. Use `<<-HEREDOC` with tab indentation stripping, or prefer explicit `printf` / `cat` concatenation.
