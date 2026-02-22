# Ansible — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.yml` with `hosts:`, `tasks:`, `playbook`, `ansible`, `roles/`, `inventory`, `- name:`, `ansible.cfg`

---

## Security
- **[CRITICAL]** Plaintext secrets/passwords in playbooks or vars files → credentials committed to version control. Use Ansible Vault to encrypt sensitive values.
- **[CRITICAL]** `command:` or `shell:` module used with user-controlled variables → command injection. Sanitize inputs or use purpose-built modules instead.
- **[HIGH]** `become: yes` applied at play level instead of per task → unnecessarily broad privilege escalation. Scope `become` to only the tasks that require it.
- **[HIGH]** SSH private keys stored unencrypted inside roles or repo → key material exposed. Store keys in Vault or an external secrets manager.
- **[HIGH]** `no_log: false` on tasks that handle credentials → secrets appear in Ansible logs. Set `no_log: true` on any task processing passwords or tokens.
- **[HIGH]** Galaxy roles installed without version pinning in `requirements.yml` → supply chain risk from updated or compromised role versions. Pin to a specific `version:` tag or commit.
- **[MEDIUM]** `validate_certs: no` in `uri:`, `get_url:`, or package tasks → MITM attacks possible. Remove the override and ensure proper CA trust is configured.

---

## Performance
- **[HIGH]** `gather_facts: true` (default) on plays that do not use facts → adds latency per host. Set `gather_facts: false` when facts are not needed.
- **[HIGH]** Long-running tasks executed sequentially instead of using `async` + `poll` → unnecessary wall-clock time. Use async tasks with a polling interval or `poll: 0` for fire-and-forget.
- **[MEDIUM]** No tags on tasks → entire playbook must run in CI when only a subset is needed. Tag tasks and roles to allow selective execution with `--tags`.
- **[MEDIUM]** Large files transferred with the `copy` module instead of `synchronize` (rsync) → slow transfers over the Ansible SSH connection. Use `synchronize` for directories and large files.
- **[MEDIUM]** Tasks that can run on the control node forced to execute on remote hosts → unnecessary round trips. Use `delegate_to: localhost` for control-node-eligible work.
- **[LOW]** `serial` not set for rolling updates on large inventories → all hosts updated simultaneously. Set `serial` to a count or percentage to limit blast radius.

---

## Architecture
- **[HIGH]** Single monolithic playbook containing all tasks → not reusable or maintainable. Refactor into roles with clear responsibilities.
- **[HIGH]** Hardcoded IP addresses in playbooks instead of dynamic inventory → breaks across environments. Use dynamic inventory plugins or inventory files with group variables.
- **[MEDIUM]** Role variable defaults not defined in `defaults/main.yml` → callers must know internal variable names. Expose all overridable values in defaults with documented choices.
- **[MEDIUM]** Variables defined at multiple precedence levels without documentation → unpredictable resolution order. Establish a clear precedence strategy and document it.
- **[MEDIUM]** No `handlers/main.yml` usage → services restarted inline causing unnecessary restarts on repeated runs. Use handlers triggered by `notify` for service restarts.
- **[LOW]** `meta/main.yml` not used to declare role dependencies → dependent roles must be listed manually. Declare dependencies so `ansible-galaxy install` resolves them automatically.

---

## Code Quality
- **[HIGH]** Missing `when:` conditionals on OS- or role-specific tasks → tasks run on incompatible host types. Add `when: ansible_os_family == '...'` or equivalent guards.
- **[HIGH]** `command:` or `shell:` tasks that change system state on every run → playbook is not idempotent. Add `creates:`, `removes:`, or `changed_when:` to reflect actual change status.
- **[MEDIUM]** Tasks without descriptive `name:` fields → unreadable output and hard to debug. Provide a human-readable `name` for every task.
- **[MEDIUM]** `template` module used without `validate:` for config files that support validation → invalid configs deployed silently. Use `validate:` with the appropriate check command.
- **[MEDIUM]** Not using FQCN (Fully Qualified Collection Name) for modules → name conflicts across collections. Prefix all modules with their collection namespace.
- **[LOW]** Tasks not compatible with `--check` mode → dry runs are inaccurate. Use `check_mode: yes` compatible modules and add `check_mode:` annotations where needed.

---

## Common Bugs & Pitfalls
- **[HIGH]** Jinja2 expression `{{ variable }}` evaluated at template-parse time rather than task execution time → wrong value used. Use `"{{ var }}"` quoting correctly and be aware of lazy vs eager evaluation in loops.
- **[HIGH]** `copy` module used where `template` is needed → Jinja2 variables not substituted in the file. Use `template` for any file containing `{{ }}` expressions.
- **[MEDIUM]** Loop variable `item` shadowed when nesting loops → inner loop overwrites outer `item`. Use `loop_var:` to rename the loop variable in nested loops.
- **[MEDIUM]** `changed_when: false` not set on read-only or check commands → task always reports changed. Add `changed_when: false` to commands that never modify state.
- **[MEDIUM]** `register` variable used without checking `.rc` or `.stdout` → silent failure consumed. Always check return codes or use `failed_when:` to define failure conditions.
- **[LOW]** YAML boolean trap: `yes`, `no`, `on`, `off`, `true`, `false` interpreted as booleans → unexpected type passed to module parameter. Quote string values that resemble booleans.
