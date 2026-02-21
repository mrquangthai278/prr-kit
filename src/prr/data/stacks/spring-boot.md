# Spring Boot — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `@SpringBootApplication`, `@RestController`, `@Service`, `@Repository`, `application.properties` / `application.yml`, `pom.xml` with spring-boot-starter

---

## Security

- **[CRITICAL]** `@PreAuthorize` / security check missing on sensitive endpoints → unauthorized access.
- **[CRITICAL]** JPQL/HQL or native query with string concatenation of user input → SQL/JPQL injection. Use `@Query` with `:param` binding or `CriteriaBuilder`.
- **[HIGH]** Returning JPA Entity directly from REST controller → over-exposes fields (passwords, internal IDs). Use DTO with `@JsonIgnore` or ModelMapper.
- **[HIGH]** Actuator endpoints (`/actuator/env`, `/actuator/heapdump`) exposed without authentication in production.
- **[HIGH]** `@CrossOrigin(origins = "*")` on authenticated endpoints → CORS credential leakage.
- **[HIGH]** Secrets in `application.properties` committed to version control → use environment variables or Spring Cloud Config.
- **[MEDIUM]** Missing Spring Security CSRF protection on state-changing endpoints.
- **[MEDIUM]** JWT secret too short or weak in config.

---

## Performance

- **[HIGH]** N+1 Hibernate queries — `@OneToMany` / `@ManyToMany` with default `FetchType.LAZY` in a loop. Use `JOIN FETCH` or `@EntityGraph`.
- **[HIGH]** `FetchType.EAGER` on collections → loads all related data on every query, even when not needed.
- **[HIGH]** Missing `@Transactional` on service methods that do multiple DB operations → separate transactions, inconsistency risk.
- **[MEDIUM]** Hibernate `OpenSessionInView` anti-pattern (loading relations in view layer) → slow requests, hard to profile.
- **[MEDIUM]** No pagination on repository `findAll()` → unbounded data return.
- **[MEDIUM]** Missing database connection pool configuration (`spring.datasource.hikari.*`).
- **[LOW]** `@Cacheable` not used on expensive, stable query results.

---

## Architecture

- **[HIGH]** Business logic in `@RestController` → controllers should only handle HTTP mapping. Move to `@Service`.
- **[HIGH]** `@Autowired` on fields instead of constructor injection → harder to test, hides dependencies.
- **[MEDIUM]** `@Repository` accessing another `@Repository` directly → breaks layered architecture.
- **[MEDIUM]** `@Transactional` on controller methods → transaction spans HTTP serialization, too wide.
- **[MEDIUM]** God service class >500 lines violating SRP.
- **[LOW]** Missing `@Valid` on `@RequestBody` → Bean Validation annotations on DTO not enforced.

---

## Code Quality

- **[HIGH]** `Optional.get()` without `isPresent()` check → `NoSuchElementException` at runtime. Use `orElse`/`orElseThrow`.
- **[MEDIUM]** `System.out.println` in production code → use SLF4J logger.
- **[MEDIUM]** Catching `Exception` too broadly in service methods and swallowing it.
- **[LOW]** Missing Lombok `@Slf4j` or logger declaration → verbose logging boilerplate.

---

## Common Bugs & Pitfalls

- **[HIGH]** `@Transactional` on `private` method → AOP proxy doesn't intercept private methods, annotation ignored.
- **[HIGH]** Calling `@Transactional` method from within same bean (self-invocation) → proxy bypassed, transaction not applied.
- **[MEDIUM]** `@Async` method in same class called internally → also bypasses proxy.
- **[MEDIUM]** `LocalDateTime` without timezone in entity → bugs in multi-timezone deployments. Use `ZonedDateTime` or `OffsetDateTime`.
