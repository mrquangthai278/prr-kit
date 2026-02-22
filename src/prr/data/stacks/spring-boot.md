# Spring Boot — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `@SpringBootApplication`, `@RestController`, `@Service`, `@Repository`, `application.properties` / `application.yml`, `pom.xml` with spring-boot-starter, `@Entity`, `@Transactional`

---

## Security

- **[CRITICAL]** `@PreAuthorize` / security check missing on sensitive endpoints → unauthorized access.
- **[CRITICAL]** JPQL/HQL or native query with string concatenation of user input → injection. Use `:param` binding or `CriteriaBuilder`.
- **[CRITICAL]** Mass assignment via `@RequestBody` mapped directly to `@Entity` → over-posting (attacker sets `admin=true`). Use request DTOs.
- **[HIGH]** Returning `@Entity` directly from REST controller → exposes passwords, internal IDs. Use response DTOs with `@JsonIgnore`.
- **[HIGH]** Actuator endpoints (`/actuator/env`, `/actuator/heapdump`, `/actuator/beans`) exposed without auth in production.
- **[HIGH]** `@CrossOrigin(origins = "*")` on authenticated endpoints → CORS credential leakage.
- **[HIGH]** Secrets in `application.properties` committed to VCS → use env vars, Spring Cloud Config, or HashiCorp Vault.
- **[HIGH]** JWT secret too short or default value in `application.yml` → token forging.
- **[HIGH]** Missing CSRF protection on state-changing endpoints when using session auth.
- **[HIGH]** `@Secured` / method security not enabled (`@EnableMethodSecurity`) → annotations silently ignored.
- **[HIGH]** Path traversal via user-controlled file path in `FileSystemResource` / `Files.readAllBytes()`.
- **[MEDIUM]** XXE in XML processing without disabling external entities in `DocumentBuilderFactory`.
- **[MEDIUM]** Spring Security `permitAll()` too broad on `/api/**` prefix.
- **[LOW]** Swagger/OpenAPI UI accessible in production without authentication.

---

## Performance

- **[HIGH]** N+1 Hibernate queries — `@OneToMany` with `FetchType.LAZY` accessed in loop → use `JOIN FETCH` or `@EntityGraph`.
- **[HIGH]** `FetchType.EAGER` on collections → loads all relations on every query even when unneeded.
- **[HIGH]** Missing `@Transactional(readOnly = true)` on read-only queries → Hibernate dirty-checking overhead.
- **[HIGH]** `findAll()` without pagination → unbounded result set, OOM on large tables.
- **[HIGH]** Missing database connection pool config (`spring.datasource.hikari.maximum-pool-size`) → default 10 connections under load.
- **[HIGH]** `@Async` methods not configured with custom `TaskExecutor` → uses default single-threaded executor.
- **[HIGH]** `ResponseEntity` with large body not streaming → buffering entire response in memory.
- **[MEDIUM]** Hibernate `OpenSessionInView` (default enabled in Spring Boot) → lazy loading in view layer, hidden N+1.
- **[MEDIUM]** Missing `@Cacheable` on expensive, stable query results.
- **[MEDIUM]** Multiple `@Transactional` service calls not merged → separate transactions, round-trips.
- **[MEDIUM]** `@Scheduled` tasks running too frequently blocking scheduler thread pool.
- **[LOW]** Jackson serialization of large objects without `@JsonView` → over-fetching in API responses.
- **[LOW]** Not using Spring Data projections for partial entity fetching.

---

## Architecture

- **[HIGH]** Business logic in `@RestController` → move to `@Service`.
- **[HIGH]** `@Autowired` on fields instead of constructor injection → harder to test, hidden dependencies.
- **[HIGH]** `@Repository` calling another `@Repository` directly → breaks layered architecture.
- **[HIGH]** `@Transactional` on `@RestController` → transaction spans HTTP serialization, scope too wide.
- **[HIGH]** Domain `@Entity` classes used as API DTOs → tight coupling, security risk.
- **[HIGH]** Not using `@ControllerAdvice` for global exception handling → inconsistent error responses.
- **[MEDIUM]** God `@Service` class >500 lines → split by domain responsibility.
- **[MEDIUM]** `@Component` used where `@Service`/`@Repository`/`@Configuration` is semantically correct.
- **[MEDIUM]** Spring Events not used for decoupling → direct service-to-service calls creating coupling.
- **[MEDIUM]** Not using Spring Profiles for environment-specific config → hardcoded env checks.
- **[MEDIUM]** `@Configuration` class doing too much → split by concern.
- **[LOW]** Missing `@Valid` on `@RequestBody` → Bean Validation annotations on DTO ignored.
- **[LOW]** Circular bean dependencies → startup failure or unexpected behavior.

---

## Code Quality

- **[HIGH]** `Optional.get()` without `isPresent()` check → `NoSuchElementException`. Use `orElse`/`orElseThrow`.
- **[HIGH]** Missing `@Valid` / `@Validated` on input DTOs → no input validation.
- **[HIGH]** `NullPointerException` risk from JPA `findById()` returning `Optional` not handled.
- **[MEDIUM]** `System.out.println` in production → use SLF4J `@Slf4j`.
- **[MEDIUM]** Catching `Exception` too broadly and swallowing → silent failure.
- **[MEDIUM]** Not using Lombok (`@Data`, `@Builder`, `@Slf4j`) where it reduces boilerplate.
- **[MEDIUM]** `@RestController` methods returning `Object` instead of typed `ResponseEntity<T>`.
- **[MEDIUM]** Not using `@ConfigurationProperties` for typed config → scattered `@Value` strings.
- **[MEDIUM]** Magic strings for request mapping paths → use constants.
- **[LOW]** Not using Spring Boot DevTools in development → slower feedback loop.
- **[LOW]** Not using Actuator health endpoints for Kubernetes liveness/readiness.

---

## Common Bugs & Pitfalls

- **[HIGH]** `@Transactional` on `private` method → AOP proxy doesn't intercept private methods, annotation silently ignored.
- **[HIGH]** Calling `@Transactional` method from within same bean (self-invocation) → proxy bypassed, no transaction.
- **[HIGH]** `@Async` method called from same class → proxy bypassed, executes synchronously.
- **[HIGH]** `LazyInitializationException` — accessing lazy relation outside `@Transactional` context.
- **[HIGH]** `@Entity` `equals()`/`hashCode()` based on mutable fields → breaks JPA identity semantics. Base on `id` only.
- **[HIGH]** `@Scheduled` cron expression incorrect timezone → runs at wrong time in different TZ deployments.
- **[MEDIUM]** `LocalDateTime` without timezone in `@Entity` → bugs in multi-timezone deployments. Use `Instant` or `OffsetDateTime`.
- **[MEDIUM]** `@OneToMany` `cascade = CascadeType.ALL` with `orphanRemoval = true` deleting unintended records.
- **[MEDIUM]** Spring Security filter order → custom filter added without `@Order` or `addFilterBefore` → wrong execution order.
- **[MEDIUM]** `@Value("${property}")` on static field → never injected. Use `@PostConstruct` or non-static.
- **[LOW]** `CommandLineRunner` / `ApplicationRunner` beans running in production → ensure `@Profile("!prod")` if dev-only.
- **[LOW]** Bean name collision between auto-configured and custom beans → unexpected bean override.
