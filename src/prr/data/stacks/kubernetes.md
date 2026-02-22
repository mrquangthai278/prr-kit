# Kubernetes Stack Rules

## Detection Signals
`*.yaml` with `apiVersion:` + `kind: Deployment/Service/Pod` · `kubectl` · `helm` charts · `kustomization.yaml` · `.k8s/` directory · `Dockerfile` + k8s manifests

---

## Security

**[CRITICAL]** Container running as root (`runAsUser: 0` or missing `securityContext`) → privilege escalation on container escape. Set `runAsNonRoot: true`, `runAsUser: 1000+` in pod securityContext.

**[CRITICAL]** `privileged: true` in container securityContext → equivalent to root on host node, full kernel access. Never use in production; remove the flag entirely.

**[CRITICAL]** `hostPID: true` / `hostNetwork: true` / `hostIPC: true` on pod → shares host namespaces, full host process/network visibility. Restrict to specific system workloads only.

**[HIGH]** Secrets stored in ConfigMap instead of Secret → ConfigMaps readable by anyone with namespace read access. Use Secret with encryption at rest via KMS provider.

**[HIGH]** Secrets passed as environment variables → visible in `kubectl describe pod`, `/proc/environ`, and crash dumps. Mount secrets as volumes with `secretKeyRef` instead.

**[HIGH]** Missing NetworkPolicy → all pods communicate freely by default, unrestricted east-west traffic. Define ingress/egress rules for least-privilege per workload.

**[HIGH]** RBAC ClusterRole with wildcard (`*`) verbs or resources → over-privileged service accounts that can read/write anything. Use minimal Role scoped to the specific namespace and resources needed.

**[HIGH]** `automountServiceAccountToken: true` (default) on pods not needing API access → service account token is a lateral movement vector. Set `automountServiceAccountToken: false` on the service account and pod spec.

**[HIGH]** `allowPrivilegeEscalation: true` (default) → child processes can gain more privileges than the parent. Set `allowPrivilegeEscalation: false` in container securityContext.

**[MEDIUM]** `readOnlyRootFilesystem: false` → malicious process can write to container filesystem and install tools. Set `readOnlyRootFilesystem: true` and use emptyDir volumes for writable paths.

**[MEDIUM]** Image pulled from public registry without digest pinning → image tag can be silently replaced (supply chain attack). Use `@sha256:` digest instead of mutable tags.

**[MEDIUM]** Ingress without TLS termination → traffic travels in plaintext from ingress controller to pod. Add cert-manager TLS annotation and configure HTTPS redirect.

**[LOW]** Namespaces without ResourceQuota → a single namespace can starve others of CPU/memory. Set CPU and memory quotas per namespace.

**[LOW]** Missing PodSecurityStandard policy (restricted/baseline) → pods can request dangerous capabilities without enforcement. Enable via namespace label pod-security.kubernetes.io/enforce: restricted.

---

## Performance

**[CRITICAL]** Missing resource requests → scheduler cannot place pods optimally, nodes become oversubscribed and unstable. Always set `requests.cpu` and `requests.memory` for every container.

**[CRITICAL]** Missing resource limits → pod can consume all node memory causing OOM kills of neighbouring pods. Set `limits.memory` always; consider omitting CPU limit to avoid throttling.

**[HIGH]** Single replica (`replicas: 1`) for stateless service → rolling update causes downtime, node failure kills service entirely. Use at minimum 2 replicas for any production workload.

**[HIGH]** Missing PodDisruptionBudget → `kubectl drain` terminates all replicas simultaneously during node maintenance. Define `minAvailable` or `maxUnavailable` for every critical deployment.

**[HIGH]** HPA without VPA for right-sizing → pods scale horizontally but individual pod requests are too large or too small. Combine HPA for horizontal scaling with VPA recommendations for request tuning.

**[HIGH]** `imagePullPolicy: Always` on every pod start → extra registry latency on each restart, deployment fails if registry is unreachable. Use `IfNotPresent` with immutable tags or digest pins.

**[HIGH]** Missing preStop hook and insufficient `terminationGracePeriodSeconds` → in-flight requests dropped when pod receives SIGTERM during rolling update. Add a preStop sleep hook and increase grace period to cover longest request duration.

**[MEDIUM]** CPU limit set too low (CPU throttling) → container is throttled even when node has available CPU, causing latency spikes. Set CPU limit 2-4x the request, or remove CPU limit and rely on node-level fairness.

**[MEDIUM]** Not using Cluster Autoscaler or Karpenter → nodes are under- or over-provisioned regardless of pod demand. Enable node autoscaling based on pending pod scheduling pressure.

**[MEDIUM]** JVM or Node.js container without heap size flags → runtime uses host memory detection and exceeds container memory limit, causing OOMKill. Set -Xmx to approximately 75% of limits.memory for JVM; set --max-old-space-size for Node.js.

**[MEDIUM]** Liveness probe too aggressive (short timeout + low failureThreshold) → healthy pods restarted during GC pause or slow startup. Increase `initialDelaySeconds`, `timeoutSeconds`, and `failureThreshold`.

**[LOW]** Not using `topologySpreadConstraints` → all pods scheduled on same node or availability zone, single point of failure. Define spread constraints by topology.kubernetes.io/zone.

**[LOW]** Pods without `priorityClassName` → low-priority batch jobs not evicted first during resource pressure, starving critical services. Assign priority classes: critical, default, low.

---

## Architecture

**[HIGH]** Stateful data written to pod local filesystem or emptyDir → data lost permanently when pod restarts or is rescheduled. Use PersistentVolumeClaim with appropriate StorageClass.

**[HIGH]** Image tag `:latest` → tag changes silently, deployments are non-reproducible, rollback is unreliable. Use semantic version tags or `@sha256:` digest pinning.

**[HIGH]** Missing readinessProbe → pod receives live traffic before the application finishes initialization, causing errors during startup. Define an HTTP or exec readinessProbe for every container.

**[HIGH]** Missing livenessProbe → Kubernetes cannot detect a deadlocked application and will never restart it automatically. Define a livenessProbe that checks only internal process health, not external dependencies.

**[HIGH]** ConfigMap or Secret not versioned or referenced by hash annotation → config changes do not trigger pod restart; app runs stale configuration. Use a checksum annotation or the Reloader operator to trigger rollouts on config change.

**[HIGH]** All microservices deployed to the default namespace → no RBAC or NetworkPolicy isolation between teams or environments. Use per-team or per-environment namespaces with dedicated service accounts.

**[MEDIUM]** Hardcoded registry URLs in manifests → migrating to a new registry requires mass find-and-replace across all manifests. Use Kustomize image transformers or Helm values for registry configuration.

**[MEDIUM]** Resources missing explicit `namespace` field → resources created in default namespace, mixing environments unpredictably. Always specify `metadata.namespace` in every manifest.

**[MEDIUM]** Direct Pod manifests instead of Deployments → bare pods are not rescheduled on node failure and cannot be rolled back. Always use Deployment, StatefulSet, or DaemonSet.

**[MEDIUM]** Helm chart values hardcoded in `values.yaml` without environment overrides → chart is not reusable across dev, staging, and production. Use environment-specific value files or Helmfile for per-environment configuration.

**[MEDIUM]** Not using Kustomize overlays for environment differences → manifests duplicated across environments, diverging over time. Use base + overlay structure with patches for per-environment differences.

**[LOW]** Missing Prometheus scrape annotations → metrics not collected by Prometheus Operator, no visibility into pod performance. Add prometheus.io/scrape and prometheus.io/port annotations or create a ServiceMonitor resource.

**[LOW]** Not using init containers for database migration → application starts before migration runs, causing schema mismatch errors at startup. Use an init container that runs migrations and exits before the main container starts.

---

## Code Quality

**[HIGH]** `kubectl apply` with generated manifests not tracked in git → configuration drift, no audit trail, no reliable rollback. Use GitOps (ArgoCD or Flux) to reconcile cluster state from a git repository.

**[HIGH]** Missing `namespace` field in manifest → resources created in wrong namespace, label selectors do not match, hard to diagnose. Always specify `metadata.namespace` on every resource.

**[HIGH]** Service selector labels not matching Deployment pod template labels → zero pods selected, all connections refused with no obvious error message. Cross-check spec.selector.matchLabels against spec.template.metadata.labels.

**[HIGH]** Not running `helm lint` or `kubectl --dry-run=client` before applying → invalid manifests deployed, misconfigured fields silently ignored. Add lint and dry-run steps to the CI pipeline before every apply.

**[MEDIUM]** YAML indentation errors → Kubernetes silently ignores misconfigured fields rather than rejecting them. Enforce yamllint in CI and use a schema validator such as kubeconform.

**[MEDIUM]** Not using `kubectl rollout status` to verify deployment success → deployment assumed complete when only submitted to API server. Add `kubectl rollout status deployment/name --timeout=120s` after every apply.

**[MEDIUM]** ConfigMap keys containing periods → keys with periods cannot be used as environment variable names. Use underscores for keys intended to be consumed as env vars.

**[MEDIUM]** Resource names exceeding 63 characters → DNS label limit exceeded; Service and Ingress creation fails with cryptic errors. Keep all resource names under 63 characters.

**[MEDIUM]** Resources not tagged with standard labels (app, version, component) → hard to query, filter, and correlate resources across the cluster. Apply app.kubernetes.io/* labels consistently to all resources.

**[LOW]** Not using Strategic Merge Patch for Kustomize overlay values → Kustomize performs full replacement instead of merge for some fields. Use Strategic Merge Patch type for lists (containers, volumes) in patches.

**[LOW]** Missing owner references on child resources → orphaned resources not garbage collected when parent is deleted, accumulating over time. Set ownerReferences on dynamically created child resources.

---

## Common Bugs & Pitfalls

**[HIGH]** Service selector mismatch with Pod template labels → traffic routes to zero pods, connection refused with no helpful error message. Compare Service.spec.selector with Deployment.spec.template.metadata.labels character by character.

**[HIGH]** PersistentVolumeClaim with `ReadWriteOnce` on a multi-node Deployment → second pod stays permanently Pending because volume can only be mounted by one node at a time. Use `ReadWriteMany` (NFS, EFS) or `ReadWriteOncePod` for single-pod guarantee.

**[HIGH]** HPA `targetCPUUtilizationPercentage` misunderstood as percentage of limit → HPA calculates utilization against requests, not limits; HPA never fires if limit is much larger than request. Set requests accurately to reflect typical load.

**[HIGH]** Deployment with `maxSurge: 0` and `maxUnavailable: 0` → rolling update deadlocks immediately, never terminates old pods or creates new ones. Set at least one of these to a non-zero value.

**[MEDIUM]** `kubectl apply` on manifest using `generateName` → creates a new resource on every apply instead of updating the existing one. Use a fixed `name` field for resources managed declaratively.

**[MEDIUM]** Init container failure not visible in main container logs → kubectl logs shows only the main container; init failure is invisible. Use kubectl logs with the --container flag specifying the init container name.

**[MEDIUM]** Secret value not base64 encoded in YAML manifest → Kubernetes rejects the manifest with a decode error. Base64-encode all values under `data:`, or use `stringData:` which accepts plaintext and encodes automatically.

**[MEDIUM]** Liveness probe hitting an endpoint that queries the database → cascading pod restarts during database slowdown kills all replicas simultaneously. Liveness probe should check only internal process health with no external dependency calls.

**[MEDIUM]** Using `kubectl replace` without specifying resourceVersion → concurrent replace loses changes made between read and write. Use `kubectl apply` for idempotent declarative updates.

**[LOW]** NodePort service unintentionally exposing an internal service externally → port accessible from outside the cluster without authentication. Use ClusterIP for internal services; front external access with an Ingress or LoadBalancer Service.

**[LOW]** CronJob without `concurrencyPolicy: Forbid` → jobs pile up when a previous run has not finished, exhausting cluster resources. Set `concurrencyPolicy: Forbid` or `Replace` depending on the desired behaviour.