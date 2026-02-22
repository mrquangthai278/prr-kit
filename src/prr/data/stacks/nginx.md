# Nginx — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `nginx.conf`, `nginx`, `server {`, `location /`, `proxy_pass`, `upstream {`, `listen 80`

---

## Security
- **[CRITICAL]** Default server block (`server_name _;`) serving application content when no SNI match → unintended content served to scanners. Make the default server block return 444 or redirect.
- **[CRITICAL]** `autoindex on` in web root or uploads directory → full directory listing exposed. Set `autoindex off` globally and only enable where explicitly required.
- **[HIGH]** Missing security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security` → clickjacking, MIME sniffing, and downgrade attacks. Add these headers in the `server` block.
- **[HIGH]** `proxy_pass` to backend without `proxy_set_header Host $host` → backend receives wrong host, enabling host header injection. Always set `Host`, `X-Real-IP`, and `X-Forwarded-For` headers.
- **[HIGH]** `server_tokens on` (default) exposing nginx version → fingerprinting for targeted exploits. Set `server_tokens off` in the `http` block.
- **[HIGH]** Wildcard `Access-Control-Allow-Origin: *` added to authenticated API endpoints → any origin can make credentialed requests. Restrict to specific allowed origins using a `map` directive.
- **[MEDIUM]** SSL configuration allowing TLS 1.0 or 1.1 → connection vulnerable to POODLE and BEAST. Set `ssl_protocols TLSv1.2 TLSv1.3` and use a modern cipher suite.

---

## Performance
- **[HIGH]** `gzip off` or gzip not configured for compressible content types → large text responses sent uncompressed. Enable gzip with `gzip on` and set `gzip_types` for HTML, CSS, JS, JSON, and SVG.
- **[HIGH]** `keepalive_timeout 0` → a new TCP connection is established per request. Set a reasonable `keepalive_timeout` (e.g., 65s) to allow connection reuse.
- **[HIGH]** Static assets served without `expires` or `Cache-Control` headers → browsers re-fetch unchanged assets on every page load. Add `expires 1y` and `add_header Cache-Control "public, immutable"` for fingerprinted assets.
- **[MEDIUM]** `worker_processes 1` hardcoded → nginx does not use all available CPU cores. Set `worker_processes auto` to match the CPU count.
- **[MEDIUM]** `proxy_buffering off` for large upstream responses → responses streamed through nginx holding connections open and increasing memory pressure. Enable buffering and tune `proxy_buffer_size`.
- **[MEDIUM]** `worker_connections` set too low → connection limit reached under moderate load. Set to at least 1024 and tune based on `ulimit -n`.
- **[LOW]** `sendfile off` → file data copied through user space. Set `sendfile on` with `tcp_nopush on` for efficient static file serving.

---

## Architecture
- **[HIGH]** Monolithic `nginx.conf` with all server blocks inline → hard to manage multiple sites or services. Use `include /etc/nginx/conf.d/*.conf` and separate files per virtual host or service.
- **[HIGH]** Upstream backends defined as hardcoded IPs without an `upstream {}` block → no load balancing, health checks, or failover. Define named `upstream` blocks with multiple server entries.
- **[MEDIUM]** Rate limiting not applied to authentication or sensitive API endpoints → brute-force and credential stuffing attacks unconstrained. Add `limit_req_zone` and `limit_req` directives to login and API routes.
- **[MEDIUM]** Complex conditional routing implemented with `if` blocks → `if` inside `location` is fragile in nginx. Replace with `map` directives or separate `location` blocks.
- **[MEDIUM]** Access and error logs not directed to separate files per virtual host → all traffic mixed, hard to debug. Set `access_log` and `error_log` per `server` block.
- **[LOW]** Log rotation not configured for nginx logs → disk space exhaustion over time. Configure `logrotate` or use Docker log drivers with size limits.

---

## Code Quality
- **[HIGH]** `try_files` misconfigured: `try_files $uri $uri/ /index.html =404` — the `=404` fallback is never reached because `/index.html` always matches → 404 pages served as 200 with HTML content. Verify `try_files` order matches the intended fallback behaviour.
- **[MEDIUM]** `location` block order not documented or intentional → more specific locations accidentally shadowed by broader ones. Add comments explaining match precedence; prefer prefix locations over regex where possible.
- **[MEDIUM]** Custom `error_page` not defined for 404 and 50x errors → nginx default error pages shown to users. Define `error_page 404 /404.html` and `error_page 500 502 503 504 /50x.html`.
- **[MEDIUM]** `proxy_read_timeout` and `proxy_connect_timeout` left at defaults → either too short (premature 504) or too long (connections held open). Tune timeouts to match upstream SLAs.
- **[LOW]** Config not validated with `nginx -t` before reload → syntax errors cause nginx reload failure and potential downtime. Run `nginx -t` in CI and before any production config change.

---

## Common Bugs & Pitfalls
- **[HIGH]** `proxy_pass http://backend/` with a trailing slash → nginx strips the `location` prefix from the URI before forwarding, causing unexpected path rewriting. Remove the trailing slash unless prefix stripping is intended.
- **[HIGH]** WebSocket proxying missing `proxy_http_version 1.1`, `Upgrade`, and `Connection` headers → WebSocket connections fall back to HTTP and fail. Add all three directives inside the WebSocket `location` block.
- **[MEDIUM]** `limit_req_zone` defined in the `http` block but `limit_req` directive applied only in a nested `location` that does not inherit it → rate limiting not effective. Verify `limit_req` is in the correct `location` block and the zone name matches.
- **[MEDIUM]** SNI-based virtual hosting (`server_name`) not working with clients lacking SNI support → requests routed to wrong virtual host. Accept this as a known limitation and ensure the default server block is safe.
- **[MEDIUM]** `add_header` in a nested `location` block does not inherit `add_header` directives from the parent `server` block → security headers missing on specific routes. Repeat all required headers in every block that uses `add_header`.
- **[LOW]** `client_max_body_size` not set for file upload endpoints → nginx rejects uploads over 1MB with 413. Set `client_max_body_size` to a value appropriate for the maximum expected upload size.
