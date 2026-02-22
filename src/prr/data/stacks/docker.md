# Docker — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `Dockerfile*`, `docker-compose*.yml`, `.dockerignore`, `FROM `, `RUN `, `COPY `, `EXPOSE`, `docker` in CI, `compose.yml`

---

## Security

- **[CRITICAL]** Container running as `root` (default) → container escape = root on host. Add `USER nonroot` after creating non-root user.
- **[CRITICAL]** Secrets passed as `ENV` or `ARG` in Dockerfile → visible in image layers and `docker inspect`. Use Docker BuildKit secrets (`--secret`) or runtime env injection.
- **[CRITICAL]** `.env` file copied into image via `COPY . .` without `.dockerignore` → secrets in image layer.
- **[HIGH]** Base image tagged as `latest` → non-deterministic builds, unexpected CVEs from upstream updates. Use `node:20.11.1-alpine3.19`.
- **[HIGH]** Outdated base image with known CVEs → scan with `docker scout cves` or Trivy.
- **[HIGH]** `docker-compose.yml` with `privileged: true` without justification → container escapes host namespaces.
- **[HIGH]** `volumes: /:/host` or similar host root mount → full filesystem access from container.
- **[HIGH]** Ports bound to `0.0.0.0` for internal services → exposed to all interfaces. Use `127.0.0.1:port:port`.
- **[HIGH]** Hardcoded credentials in `docker-compose.yml` committed to VCS → credential exposure.
- **[MEDIUM]** `--cap-add SYS_ADMIN` or `--security-opt seccomp=unconfined` → elevated privileges.
- **[MEDIUM]** No read-only filesystem (`--read-only`) for containers that don't need write access.
- **[LOW]** Docker socket (`/var/run/docker.sock`) mounted in container → full Docker daemon access = host escape.

---

## Performance

- **[HIGH]** Layer order wrong — source code copied before `package.json` + install → cache invalidated every code change. Copy lockfile + install first, then source.
- **[HIGH]** No multi-stage build for compiled languages → dev deps and build tools in production image.
- **[HIGH]** Large files/directories not in `.dockerignore` → slow build context transfer on every build.
- **[MEDIUM]** `RUN apt-get install` without `--no-install-recommends` → bloated image with unnecessary packages.
- **[MEDIUM]** Multiple separate `RUN` commands → extra layers. Chain with `&&` and `\`.
- **[MEDIUM]** Not using `--mount=type=cache` for package manager cache in BuildKit → re-downloading packages.
- **[MEDIUM]** Base image not using Alpine/distroless → unnecessarily large image.
- **[MEDIUM]** `COPY . .` before `npm install` → code changes invalidate dependency cache.
- **[LOW]** Not squashing layers in final image → history reveals sensitive intermediate steps.
- **[LOW]** `apt-get` without `apt-get clean && rm -rf /var/lib/apt/lists/*` → package cache in layer.

---

## Architecture

- **[HIGH]** Application state written to container filesystem → lost on restart. Use named volumes for persistent data.
- **[HIGH]** Missing `HEALTHCHECK` → orchestrator can't detect unhealthy container, continues sending traffic.
- **[HIGH]** Single container running multiple services → violates SRP, harder to scale, complicated restarts.
- **[HIGH]** Secret rotation requires image rebuild → use runtime secret injection (Vault, K8s Secrets, AWS SSM).
- **[MEDIUM]** `docker-compose.yml` used in production without orchestration → no auto-scaling, rolling updates.
- **[MEDIUM]** Config hardcoded in Dockerfile → image not portable across environments. Use env vars + config files.
- **[MEDIUM]** `depends_on` used without health check condition → service starts before dependency is ready.
- **[MEDIUM]** Not using `restart: unless-stopped` / `restart: on-failure` → container doesn't recover from crashes.
- **[LOW]** Missing `ENTRYPOINT` — only `CMD` → command accidentally overridden at runtime.
- **[LOW]** Not pinning Docker Compose version in CI → behavior changes with compose updates.

---

## Code Quality

- **[HIGH]** No `.dockerignore` file → unpredictable, large build context (`.git`, `node_modules`, `.env`).
- **[HIGH]** `ADD url ./` instead of `RUN curl + COPY` → `ADD` fetches during build, no verification.
- **[MEDIUM]** `ADD` used when `COPY` sufficient — `ADD` has implicit tar extraction and remote URL fetching; `COPY` is explicit.
- **[MEDIUM]** `ENV` variables not documented → unclear what configuration is available.
- **[MEDIUM]** `EXPOSE` port not matching actual application port → confusing, may break port mapping.
- **[MEDIUM]** Non-deterministic `apt-get` package versions → builds differ over time. Pin package versions.
- **[LOW]** Missing `LABEL` annotations (maintainer, version, description) → untracked images in registry.
- **[LOW]** Long `RUN` command without line continuation `\` → unreadable Dockerfile.
- **[LOW]** Not using `WORKDIR` → inconsistent working directory, fragile relative paths.

---

## Common Bugs & Pitfalls

- **[HIGH]** Process not handling `SIGTERM` → container doesn't stop gracefully, killed after timeout. Use `exec` form `["node", "app.js"]` not shell form.
- **[HIGH]** PID 1 not reaping zombie processes → memory leak. Use `--init` flag or `tini` as init process.
- **[HIGH]** `CMD ["npm", "start"]` without shell → environment variables from `ENV` not available in some contexts. Test both.
- **[MEDIUM]** Container timezone different from host → cron jobs run at wrong time. Set `TZ` env var.
- **[MEDIUM]** `COPY --chown` not used → files owned by root inside container, non-root user can't write.
- **[MEDIUM]** DNS resolution failing in container → missing `--dns` or network mode mismatch.
- **[MEDIUM]** Build arg (`ARG`) vs environment variable (`ENV`) confusion — `ARG` only available during build, `ENV` persists.
- **[LOW]** Port already in use on host → `docker run` fails with `bind: address already in use`.
- **[LOW]** Volume mount overwriting container files → `node_modules` from host overlays container's installed deps.
