# Kubernetes — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.yaml` with `apiVersion:` + `kind: Deployment/Service/Pod` · `kubectl` usage · `helm` charts · `kustomization.yaml` · `.k8s/` directory

---

## Security

- **[CRITICAL]** Container running as root (`runAsUser: 0` or no `securityContext`) → privilege escalation path if container escape occurs. Set `runAsNonRoot: true` and a non-zero `runAsUser`.
- **[CRITICAL]** `privileged: true` in container `securityContext` → equivalent to `root` on the host node; full kernel access.
- **[HIGH]** Secrets stored in `ConfigMap` instead of `Secret` → ConfigMaps are unencrypted and readable by anyone with ConfigMap access. Use `Secret` (and ideally encrypt at rest with KMS).
- **[HIGH]** Secrets passed as environment variables → visible in `kubectl describe pod`, process `/proc/environ`, and crash dumps. Use volume mounts from Secret for sensitive values.
- **[HIGH]** Missing `NetworkPolicy` → all pods in the cluster can communicate with all other pods by default. Define ingress/egress rules to enforce least-privilege networking.
- **[MEDIUM]** `automountServiceAccountToken: true` (default) on pods that don't need API server access → token mounted at `/var/run/secrets/kubernetes.io/serviceaccount/token` is a lateral movement vector.
- **[MEDIUM]** Container with `allowPrivilegeEscalation: true` (default) → child processes can gain more privileges than parent. Set `allowPrivilegeEscalation: false`.

---

## Performance

- **[HIGH]** Missing resource `requests` → scheduler cannot make informed placement decisions; pod can starve other pods on the node. Always set `requests.cpu` and `requests.memory`.
- **[HIGH]** Missing resource `limits` → pod can consume all node CPU/memory, causing OOM kills of other pods. Set `limits.memory` always; consider `limits.cpu` carefully.
- **[MEDIUM]** Single replica (`replicas: 1`) for a stateless service → rolling update causes downtime; node failure kills the service. Use ≥2 replicas.
- **[MEDIUM]** Missing `PodDisruptionBudget` → `kubectl drain` during node maintenance can terminate all replicas simultaneously. Define `minAvailable` or `maxUnavailable`.
- **[LOW]** Missing `preStop` lifecycle hook and insufficient `terminationGracePeriodSeconds` → in-flight requests dropped during rolling update. Add sleep in `preStop` to allow load balancer to drain connections.

---

## Architecture

- **[HIGH]** Storing state in pod's local filesystem (`emptyDir` or container layer) → data lost when pod restarts. Use `PersistentVolumeClaim` for stateful data.
- **[MEDIUM]** Image tag `latest` in deployment → `latest` can silently change, breaking reproducibility. Use semantic version tags or image digest (`@sha256:...`).
- **[MEDIUM]** Missing `readinessProbe` → pod receives traffic from Service before application is ready to serve requests, causing errors during startup.
- **[MEDIUM]** Missing `livenessProbe` → Kubernetes cannot detect a deadlocked or frozen application and restart it.
- **[LOW]** All microservices in a single `Namespace` → no isolation of RBAC, NetworkPolicy, or resource quotas between teams or environments.

---

## Common Bugs & Pitfalls

- **[HIGH]** `imagePullPolicy: Always` in production → extra latency on every pod start, and deployment fails if the registry is temporarily unavailable. Use `IfNotPresent` with immutable tags.
- **[HIGH]** Service `selector` label mismatch with pod template labels → Service routes to zero pods, all requests get connection refused with no obvious error.
- **[MEDIUM]** `PersistentVolumeClaim` with `accessMode: ReadWriteOnce` mounted by multiple pods on different nodes → only one node can mount at a time; second pod stays `Pending`.
- **[MEDIUM]** `HorizontalPodAutoscaler` target metric unreachable → HPA scales up infinitely or oscillates. Verify metric server is running and metric names match.
- **[LOW]** `kubectl apply` on a manifest with `generateName` instead of `name` → creates a new resource on every apply instead of updating the existing one.
