# Helm — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `Chart.yaml`, `values.yaml`, `templates/`, `helm`, `{{ .Values.`, `{{ include "`, `helmfile`

---

## Security
- **[CRITICAL]** Secrets committed to `values.yaml` in plain text → credentials in version control. Use External Secrets Operator, Sealed Secrets, or Vault Agent to inject secrets at deploy time.
- **[HIGH]** `hostNetwork: true` or `hostPID: true` in pod spec → container can access host network stack or process list. Remove unless explicitly required and documented.
- **[HIGH]** Containers running without `runAsNonRoot: true` in `securityContext` → process runs as root inside container. Set `runAsNonRoot: true` and `runAsUser` to a non-zero UID.
- **[HIGH]** Missing `readOnlyRootFilesystem: true` in container `securityContext` → container can write to its filesystem. Enable unless the app explicitly requires writes.
- **[HIGH]** `privileged: true` set in container security context → full host privilege escalation. Remove unless the workload is a node-level agent with documented justification.
- **[MEDIUM]** Default `values.yaml` uses production-scale resource limits that operators copy without review → accidental over-provisioning. Provide conservative defaults with comments showing production ranges.
- **[MEDIUM]** RBAC `ClusterRole` with broad resource/verb coverage instead of namespaced `Role` → unnecessary cluster-wide permissions. Scope to the minimum required namespace and verbs.

---

## Performance
- **[HIGH]** Resource `requests` and `limits` not defined for containers → noisy neighbour resource contention and OOM kills. Set CPU requests conservatively and memory limits firmly.
- **[HIGH]** `readinessProbe` not configured → Kubernetes sends traffic to pods that have not finished startup. Define a `readinessProbe` matching the application health endpoint.
- **[MEDIUM]** `strategy.type: Recreate` used for stateless deployments → causes full downtime during updates. Switch to `RollingUpdate` with appropriate `maxUnavailable` and `maxSurge`.
- **[MEDIUM]** HPA not configured for workloads with variable traffic → pods either over- or under-provisioned. Add a `HorizontalPodAutoscaler` resource keyed to CPU or custom metrics.
- **[MEDIUM]** `livenessProbe` configured identically to `readinessProbe` with a very short timeout → pod restart loops under temporary load. Tune liveness thresholds to be more lenient than readiness.
- **[LOW]** `topologySpreadConstraints` not set → all pods may schedule onto the same node. Add spread constraints to distribute replicas across zones.

---

## Architecture
- **[HIGH]** Business logic or environment-specific conditionals embedded directly in templates → hard to maintain across environments. Extract reusable snippets to `_helpers.tpl` and parameterize via values.
- **[HIGH]** `_helpers.tpl` not used for shared template fragments → duplication across templates causing drift. Define named templates in `_helpers.tpl` and call with `{{ include }}`.
- **[MEDIUM]** Chart not parameterized for environment differences → copy-paste charts per environment. Use a single chart with environment-specific `values-{env}.yaml` overrides.
- **[MEDIUM]** Subchart values not namespaced under the subchart key → values silently ignored or bleed into wrong scope. Always scope subchart overrides under the subchart alias key.
- **[MEDIUM]** No `NetworkPolicy` resources in chart → all pods can communicate unrestricted. Add default-deny ingress/egress policies and explicitly allow required traffic.
- **[LOW]** Chart `version` in `Chart.yaml` not incremented after template changes → `helm diff` shows no change when change exists. Bump `version` on every chart change.

---

## Code Quality
- **[HIGH]** `NOTES.txt` absent → users get no post-install instructions on how to reach the application. Add `NOTES.txt` with access instructions, default credentials note, and next steps.
- **[MEDIUM]** `required` function not used for mandatory values → chart renders with empty strings and fails at runtime with a cryptic error. Wrap mandatory values with `{{ required "message" .Values.key }}`.
- **[MEDIUM]** Chart not linted in CI with `helm lint` → syntax and structural errors ship. Add `helm lint .` as a required CI step before packaging.
- **[MEDIUM]** Labels not consistent across all resources → `kubectl` selectors and tooling break. Use the standard `helm.sh/chart`, `app.kubernetes.io/name` labels via `_helpers.tpl`.
- **[LOW]** `appVersion` in `Chart.yaml` not updated alongside application version → version mismatch in `helm list` output. Keep `appVersion` in sync with the container image tag default.

---

## Common Bugs & Pitfalls
- **[HIGH]** Image tag value not quoted: `tag: {{ .Values.image.tag }}` → numeric tags like `1.0` are parsed as a float and produce `1` in the manifest. Always use `| quote` for tag values.
- **[HIGH]** YAML indentation error in templates → produces silently wrong structure that Kubernetes accepts but behaves incorrectly. Use `helm template` + `kubeval` or `kubeconform` in CI.
- **[MEDIUM]** `helm upgrade --install` run without `--atomic` → failed release left in a broken partial state. Add `--atomic` to auto-rollback on failure, or `--cleanup-on-fail`.
- **[MEDIUM]** ConfigMap or Secret change not triggering pod restart → application continues using stale config. Add a checksum annotation: `checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}`.
- **[MEDIUM]** `with` block used where `range` is needed for maps → iteration skipped silently. Understand the difference: `range` for iteration, `with` for scope change on a single value.
- **[LOW]** `range` loop variable `$` scope not captured before entering loop → outer context values inaccessible inside loop. Capture with `{{- $root := . }}` before the `range` block.
