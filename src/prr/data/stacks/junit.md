# JUnit — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `junit`, `@Test`, `@BeforeEach`, `@AfterEach`, `import org.junit`, `@ExtendWith`, `MockitoExtension`, `@SpringBootTest`

---

## Security
- **[HIGH]** Real credentials or API keys in test configuration files (`application-test.yml`, `application.properties`) committed to the repository → secrets in version control. Use Spring Boot test property overrides with environment variables: `@Value("${API_KEY:default}")` and inject via CI.
- **[HIGH]** Tests making real HTTP calls to external services → external data returned; sensitive requests logged; tests fail when services are unavailable. Mock all external HTTP with `WireMock`, `MockWebServer`, or `@MockBean` on HTTP client beans.
- **[MEDIUM]** Test data containing PII (real email addresses, names, IDs) not cleaned from the test database → PII retained in staging DB indefinitely. Use generated fake data (`Faker`) and truncate test tables in `@AfterEach` or use `@Transactional` on the test class to auto-rollback.
- **[MEDIUM]** `@SpringBootTest` loading full application context including production beans (email sender, payment client) during integration tests → accidental real side effects triggered in test runs. Override production beans with `@MockBean` or use `@TestConfiguration` to provide stub implementations.
- **[LOW]** Test logs not suppressed for verbose beans → sensitive data from request/response logging appears in CI output. Configure `logging.level.root=WARN` in `application-test.properties` to suppress verbose logging during tests.

---

## Performance
- **[HIGH]** `@SpringBootTest` used for simple unit tests that do not require the full application context → Spring context startup adds 5-30 seconds per test class. Use `@WebMvcTest` for controller tests, `@DataJpaTest` for repository tests, and plain JUnit for service logic.
- **[HIGH]** No test parallelization configured in Maven Surefire or Gradle test task → large test suites run sequentially, blocking CI pipelines for minutes. Configure `<forkCount>` in Surefire or `maxParallelForks` in Gradle; ensure tests are stateless first.
- **[HIGH]** Database not rolled back between tests → test order dependency and state pollution cause intermittent failures. Annotate test classes with `@Transactional` to roll back after each test, or use an embedded H2 database that is re-seeded for each run.
- **[MEDIUM]** Heavy Mockito setup repeated in every `@Test` method instead of shared `@BeforeEach` → boilerplate inflates test methods and slows reading. Move common mock setup to `@BeforeEach` and assert specific behaviors per test.
- **[MEDIUM]** Test method execution order not defined with `@TestMethodOrder` when tests are order-dependent → test order is non-deterministic across JVM runs. Either make tests order-independent (preferred) or explicitly annotate with `@TestMethodOrder(MethodOrderer.OrderAnnotation.class)`.
- **[LOW]** Spring application context not cached across test classes → context restarted for each test class that uses a different configuration. Keep test configurations consistent; use `@DirtiesContext` only when the context genuinely needs to be reset.

---

## Architecture
- **[HIGH]** Tests not following Given-When-Then (or Arrange-Act-Assert) pattern → test intent is unclear; reviewers cannot tell what behavior is verified. Structure test methods: given (setup), when (invoke), then (assert) with blank line separation or comments.
- **[HIGH]** Single test method testing multiple independent behaviors → a failure does not isolate which behavior broke; other assertions not reached after first failure. Write one assertion per test method (or one logical behavior); use `@ParameterizedTest` for multiple inputs.
- **[MEDIUM]** No separation of unit, integration, and end-to-end tests via Maven profiles or Gradle source sets → slow integration tests run on every build; developers skip running them locally. Configure separate profiles: `unit` (always), `integration` (CI only), `e2e` (nightly).
- **[MEDIUM]** Shared mutable test fixtures causing test interdependence → tests pass when run in order but fail individually. Replace shared mutable state with immutable test data created fresh in `@BeforeEach`.
- **[MEDIUM]** Integration tests not using a containerized database (Testcontainers) → tests rely on a pre-existing local DB; environment drift causes flakiness. Use `@Testcontainers` with `@Container` to spin up a real database in Docker for integration tests.
- **[LOW]** Test classes not organized to mirror the production source structure → locating tests for a given class requires searching. Place test classes in the same package as the production class: `com.example.service.UserServiceTest` for `com.example.service.UserService`.

---

## Code Quality
- **[HIGH]** `assertTrue(result != null)` instead of `assertNotNull(result)` → failure message says "expected true but was false" with no context. Use specific assertion methods: `assertNotNull`, `assertEquals`, `assertThrows`, `assertIterableEquals`.
- **[HIGH]** Empty catch blocks in tests swallowing failures (`try { ... } catch (Exception e) {}`) → exceptions silently ignored; test passes when it should fail. Remove try/catch from test bodies unless explicitly testing exception behavior; use `assertThrows` instead.
- **[MEDIUM]** `@ParameterizedTest` not used for data-driven test cases → multiple nearly identical test methods for slight input variations. Replace with `@ParameterizedTest` and `@MethodSource` or `@CsvSource` to consolidate.
- **[MEDIUM]** Assertions missing a descriptive failure message → failure output shows no context about what was expected. Pass a message as the first argument: `assertEquals(expected, actual, "User ID should match after creation")`.
- **[MEDIUM]** Not using AssertJ or Hamcrest for fluent assertions → JUnit 5 built-in assertions have limited expressiveness; complex assertions are verbose. Add AssertJ: `assertThat(result).isNotNull().hasSize(3).containsExactly(...)`.
- **[LOW]** Test class visibility not public in JUnit 4 → test methods not discovered by the JUnit 4 runner. Ensure all JUnit 4 test classes are `public`; JUnit 5 relaxes this requirement but consistency is preferred.

---

## Common Bugs & Pitfalls
- **[HIGH]** `@BeforeAll` instance method without `static` modifier in JUnit 5 → JUnit 5 throws a runtime exception: "method must be static". Either make the method `static` or annotate the class with `@TestInstance(Lifecycle.PER_CLASS)`.
- **[HIGH]** `Mockito.verify()` not called after interactions that should be asserted → mock interactions go unchecked; test passes even if the expected method was never called. Add `verify(mock, times(1)).methodName(expectedArg)` for every interaction the test intends to assert.
- **[MEDIUM]** `@Transactional` on a test class rolling back after each test → the rollback means no actual database commit behavior is tested; bugs in commit-time constraints missed. Add a separate integration test without `@Transactional` for commit-path behavior.
- **[MEDIUM]** `@MockBean` vs `@Mock` confusion in Spring tests → `@Mock` creates a Mockito mock but does not inject it into the Spring context; `@MockBean` replaces the Spring bean. Use `@MockBean` in `@SpringBootTest` or `@WebMvcTest` tests; use `@Mock` with `@InjectMocks` in plain unit tests.
- **[MEDIUM]** Static utility methods not mockable with standard Mockito → tests require Mockito-inline or PowerMock dependencies; test complexity increases. Refactor static utility calls to instance methods injected as dependencies; test via the interface.
- **[LOW]** Test class not annotated with `@ExtendWith(MockitoExtension.class)` in JUnit 5 → `@Mock` annotations not processed; fields remain null causing NullPointerExceptions. Add `@ExtendWith(MockitoExtension.class)` to every test class that uses Mockito annotations.
