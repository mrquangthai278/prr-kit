# PHP — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: *.php, <?php, $_GET, $_POST, $_SESSION, echo, mysqli_, PDO::, composer.json

---

## Security
- **[CRITICAL]** SQL injection via string concatenation in database queries → attacker alters query structure to exfiltrate or modify data. Always use PDO or MySQLi with prepared statements and bound parameters.
- **[CRITICAL]** XSS via echo $userInput without htmlspecialchars() → attacker injects arbitrary HTML and JavaScript into rendered pages. Escape all user-controlled output with htmlspecialchars($var, ENT_QUOTES, UTF-8).
- **[HIGH]** Missing CSRF tokens on state-mutating forms → cross-site form submissions accepted without validation. Generate a CSRF token per session, include it in every form, and verify it on POST/PUT/DELETE.
- **[CRITICAL]** File inclusion with user input (include($_GET[page]) or require($_REQUEST[file])) → remote or local file inclusion allows code execution or arbitrary file read. Never use user input in include/require; use a whitelist map of allowed page identifiers.
- **[CRITICAL]** eval() with user-provided data → arbitrary PHP code execution on the server. Remove all eval() calls; restructure to avoid dynamic code evaluation.
- **[CRITICAL]** $_FILES upload without MIME type and extension validation → attacker uploads a PHP file with an image extension and executes it. Validate file type with finfo_file(), restrict allowed extensions, and store uploads outside the web root.
- **[HIGH]** Session fixation not mitigated with session_regenerate_id() after login → attacker forces a known session ID on the victim, gaining access after they authenticate. Call session_regenerate_id(true) immediately after successful authentication.
- **[HIGH]** Sensitive data (passwords, API keys) stored in plaintext in database → DB breach exposes all credentials. Hash passwords with password_hash($pass, PASSWORD_ARGON2ID) and verify with password_verify().

---

## Performance
- **[HIGH]** N+1 database queries executed in loops → one query per iteration causes exponential DB load as dataset grows. Fetch related data in a single query using JOINs or batch lookups and map results in PHP.
- **[HIGH]** OPcache not enabled or misconfigured → PHP bytecode recompiled on every request, adding significant CPU overhead. Enable and configure OPcache with appropriate memory and file limits in php.ini.
- **[MEDIUM]** Large arrays processed without generators → entire dataset loaded into memory at once, causing high memory pressure. Use generators (yield) for lazy iteration over large datasets.
- **[HIGH]** Catastrophic backtracking regex patterns in preg_match or preg_replace → malformed input causes exponential execution time, enabling ReDoS. Audit regex patterns for nested quantifiers and test with adversarial inputs; set PCRE limits.
- **[MEDIUM]** Not using prepared statements for all queries, relying on string escaping instead → mysql_real_escape_string and similar functions are fragile substitutes. Use PDO with parameterized queries consistently for all database access.
- **[MEDIUM]** Outputting large amounts of HTML without output buffering control → slow page generation time before first byte sent to client. Use ob_start()/ob_end_flush() or streaming output strategies for large responses.
- **[HIGH]** Heavy computation (image processing, PDF generation) done synchronously in request handlers → slow response times and PHP-FPM worker pool exhaustion. Offload heavy tasks to a job queue (e.g., Beanstalkd, Redis Queue).

---

## Architecture
- **[HIGH]** Procedural code without separation of concerns (DB, business logic, HTML in one file) → code is untestable and unmaintainable. Adopt MVC or at minimum separate data access, logic, and presentation into distinct files.
- **[HIGH]** Mixing HTML markup and business logic in the same PHP file → presentation and logic changes affect each other, and XSS risks increase. Use templates (Twig, Blade) or at minimum separate view files from PHP logic.
- **[MEDIUM]** Not using Composer autoloading, relying on manual require chains instead → missing includes cause fatal errors; dependency management is ad hoc. Configure Composer autoloading and use PSR-4 namespacing for all classes.
- **[HIGH]** Global variables used for state sharing across functions and files → globals create hidden coupling and make testing impossible. Pass dependencies explicitly through function parameters or a service container.
- **[MEDIUM]** No environment-specific configuration management → production credentials hardcoded in source or committed to version control. Use environment variables or a .env file (loaded with vlucas/phpdotenv) and gitignore it.

---

## Code Quality
- **[HIGH]** error_reporting(0) or display_errors=On in production → errors suppressed in development hide real bugs; errors displayed in production expose internals to attackers. Set error_reporting(E_ALL) in development, log errors to a file in production.
- **[HIGH]** @ error suppression operator hiding real errors → genuine errors silently swallowed, making debugging extremely difficult. Remove all @ suppression; handle potential errors explicitly with try/catch or conditional checks.
- **[HIGH]** Type juggling with == instead of === leading to unexpected comparisons → 0 == false, "" == null, and similar comparisons produce incorrect logic. Use strict comparison === throughout; be explicit about types in all comparisons.
- **[CRITICAL]** magic_quotes_gpc or register_globals enabled (legacy PHP) → magic quotes corrupt data and create false security; register_globals exposes request data as variables. Disable both in php.ini; migrate away from any code relying on them.
- **[MEDIUM]** Not using strict_types declaration in PHP 7+ code → implicit type coercion causes unexpected behavior in function calls. Add declare(strict_types=1) at the top of every PHP file.
- **[LOW]** Not following PSR-12 or a consistent coding standard → inconsistent style makes code harder to review and maintain. Enforce a coding standard with PHP-CS-Fixer or PHPCS in the CI pipeline.

---

## Common Bugs & Pitfalls
- **[CRITICAL]** Type juggling authentication bypass: 0 == false or md5(password) == 0 pattern → loose comparison allows forged tokens to match any hash starting with 0e. Always use === for security-sensitive comparisons and hash_equals() for timing-safe comparison.
- **[LOW]** array_map vs array_walk confusion → array_map returns a new array while array_walk modifies in place; incorrect usage produces subtle bugs. Know the distinction: use array_map for transforming values, array_walk for side effects.
- **[MEDIUM]** intval() overflow on 32-bit systems for large IDs → IDs above PHP_INT_MAX wrap to negative values, causing incorrect queries or logic. Use 64-bit builds for production and handle large integers as strings when necessary.
- **[MEDIUM]** Timezone not configured via date_default_timezone_set() or php.ini → date and time calculations differ across servers, causing scheduling and expiry bugs. Set the timezone explicitly to UTC in application bootstrap.
- **[HIGH]** Not verifying file upload success before processing with move_uploaded_file() → partially uploaded or failed uploads processed as valid files, causing errors or overwriting data. Always check $_FILES[error] === UPLOAD_ERR_OK before processing.
- **[MEDIUM]** Using md5() or sha1() for password hashing → both are cryptographically broken and fast, enabling brute-force attacks. Replace with password_hash($pass, PASSWORD_ARGON2ID) and password_verify().
