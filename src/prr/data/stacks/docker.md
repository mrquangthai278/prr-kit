# Docker — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `Dockerfile*`, `docker-compose*.yml`, `.dockerignore`, `FROM `, `RUN `, `COPY `, `docker` in CI scripts

---

## Security

- **[CRITICAL]** Running container as `root` (default) → if container escapes, attacker has root on host. Add `USER nonroot` after creating a non-root user.
- **[CRITICAL]** Secrets passed as `ENV` or `ARG` in Dockerfile → visible in image layers and `docker inspect`. Use Docker secrets, BuildKit `--secret`, or runtime env injection.
- **[HIGH]** `COPY . .` or `ADD . .` without `.dockerignore` → copies `.env`, `.git`, `node_modules`, build artifacts into image (sensitive data exposure + large image).
- **[HIGH]** Base image tagged as `latest` → non-deterministic builds, security regressions from upstream. Use specific version tags (`node:20.11-alpine`).
- **[HIGH]** Outdated base image with known CVEs. Check with `docker scout` or Trivy.
- **[MEDIUM]** `docker-compose.yml` with `privileged: true` without justification → excessive host access.
- **[MEDIUM]** Ports bound to `0.0.0.0` in production → exposed to all network interfaces. Bind to `127.0.0.1` for internal-only services.
- **[MEDIUM]** Hardcoded credentials in `docker-compose.yml` → committed to version control.

---

## Performance

- **[HIGH]** Layer order not optimized — frequently changing files (source code) copied before infrequently changing files (package.json + install) → cache invalidated on every build. Copy package files and install first.
- **[HIGH]** Not using multi-stage build for compiled languages → dev dependencies and build tools in final image.
- **[MEDIUM]** `RUN apt-get install` without `--no-install-recommends` → unnecessary packages bloating image.
- **[MEDIUM]** Multiple `RUN` commands instead of chained `&&` → extra layers in non-BuildKit builds.
- **[MEDIUM]** Large files in build context (videos, datasets) without `.dockerignore` → slow `docker build` context transfer.
- **[LOW]** Missing `--no-cache` consideration for `apt-get` in CI → stale package lists.

---

## Architecture

- **[HIGH]** Application state written to container filesystem → lost on container restart. Use volumes for persistent data.
- **[HIGH]** Missing health check (`HEALTHCHECK` instruction or `healthcheck` in compose) → orchestrator cannot detect unhealthy containers.
- **[MEDIUM]** `docker-compose.yml` used in production without orchestration (K8s, ECS) → no auto-scaling, no rolling updates.
- **[MEDIUM]** Hardcoded config in Dockerfile instead of environment variables → image not portable across environments.
- **[LOW]** Missing `ENTRYPOINT` — using only `CMD` → command can be accidentally overridden.

---

## Code Quality

- **[MEDIUM]** No `.dockerignore` file → unpredictable build context.
- **[MEDIUM]** `ADD` used when `COPY` is sufficient — `ADD` has implicit tar extraction and remote URL fetching; `COPY` is explicit.
- **[LOW]** Missing `LABEL` annotations on image (maintainer, version) → untracked images in registry.
- **[LOW]** Long `RUN` command without line continuation `\` → unreadable.
