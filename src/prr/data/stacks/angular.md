# Angular — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.component.ts`, `@Component(`, `@Injectable(`, `@NgModule(`, `angular.json`, `@angular/` in deps, `standalone: true`, `signal(`, `inject(`

---

## Security

- **[CRITICAL]** `bypassSecurityTrustHtml()` / `DomSanitizer.bypassSecurityTrust*()` with user-controlled content → XSS. Angular sanitizes by default; bypass only for fully trusted content.
- **[CRITICAL]** `[innerHTML]` binding with user content without sanitization → XSS.
- **[HIGH]** Route guard missing on protected routes (`canActivate`, `canActivateChild`, `canMatch`) → unauthenticated access.
- **[HIGH]** HTTP interceptor not adding auth header on all requests → API calls without credentials.
- **[HIGH]** `HttpClient` calls made without CSRF token on state-changing requests.
- **[HIGH]** Template injection via Angular's `templateUrl` loading from user-controlled path (server-rendered).
- **[HIGH]** Sensitive data stored in `localStorage` via Angular service → accessible to injected scripts.
- **[HIGH]** `window.location.href` set from route params without validation → open redirect.
- **[MEDIUM]** CORS configured permissively in Angular proxy config (`angular.json`) left in production.
- **[MEDIUM]** Error messages from HTTP errors shown directly to user → info disclosure.
- **[MEDIUM]** JWT stored in memory (signal/service) not cleared on logout → token persists in JS heap.
- **[LOW]** Angular DevTools enabled in production → component tree exposed.

---

## Performance

- **[HIGH]** Component not using `OnPush` change detection for data-heavy components → Angular checks entire tree on every event.
- **[HIGH]** Subscription not unsubscribed in `ngOnDestroy` (or not using `async` pipe / `takeUntilDestroyed`) → memory leak.
- **[HIGH]** `trackBy` missing on `*ngFor` / `@for` with large/dynamic lists → full DOM re-render on any change.
- **[HIGH]** Signal computed function doing expensive work → not memoized correctly if dependencies unstable.
- **[HIGH]** Multiple HTTP calls made sequentially that could be parallel → use `forkJoin` or `combineLatest`.
- **[HIGH]** Not using lazy-loaded feature modules / routes for large sections → oversized initial bundle.
- **[HIGH]** `BehaviorSubject.value` accessed synchronously in template → not reactive, stale value.
- **[HIGH]** `toSignal()` without `initialValue` causing nullable type complications and unnecessary null checks.
- **[MEDIUM]** Heavy computation in template expressions → recalculated every CD cycle; use `pipe` (pure) or `computed()`.
- **[MEDIUM]** `APP_INITIALIZER` doing slow async work → delays app startup; defer non-critical init.
- **[MEDIUM]** Zone.js detecting changes from unrelated third-party events (analytics, maps) → use `runOutsideAngular`.
- **[MEDIUM]** Images not using `NgOptimizedImage` → no lazy loading or size optimization.
- **[MEDIUM]** `ChangeDetectorRef.detectChanges()` called in a loop → manual CD triggering defeats OnPush benefits.
- **[LOW]** `async` pipe used multiple times on same observable in template → multiple subscriptions; use `as` syntax.
- **[LOW]** Not using `@defer` blocks (Angular 17+) for below-fold components.

---

## Architecture

- **[HIGH]** Business logic in component class → controllers should only handle view concerns; move to injectable service.
- **[HIGH]** Component directly calling `HttpClient` instead of going through service layer → untestable, tightly coupled.
- **[HIGH]** Circular dependency between services → Angular DI throws at runtime.
- **[HIGH]** `inject()` called outside injection context (not in constructor, field initializer, or factory) → runtime error.
- **[HIGH]** Smart/dumb component boundary violated — presentational component directly injecting services.
- **[HIGH]** State management done via service with plain properties instead of `BehaviorSubject`/`signal` → no reactivity.
- **[HIGH]** `NgModule` architecture mixed with standalone components without migration plan → confusion.
- **[MEDIUM]** Missing `providedIn: 'root'` vs module-scoped provider — wrong scope causes multiple instances.
- **[MEDIUM]** Using `any` type in component `@Input()`/`@Output()` → loses type safety at component boundary.
- **[MEDIUM]** `Subject` used where `BehaviorSubject` needed — late subscribers miss current value.
- **[MEDIUM]** Effects not used for signal-based side effects (Angular 17+) → mixing reactive and imperative.
- **[MEDIUM]** Route resolver overloading — doing too much data fetching causing slow navigation.
- **[LOW]** Module not feature-scoped — all declarations in `AppModule` → slow compilation, poor separation.
- **[LOW]** Not using `InjectionToken` for config values → relying on `string` tokens causing collision.

---

## Code Quality

- **[HIGH]** `ngOnInit` subscribing to Observable without `async` pipe or `takeUntilDestroyed` → memory leak.
- **[HIGH]** `@Input()` not using `required: true` (Angular 16+) for required inputs → runtime undefined with no warning.
- **[HIGH]** Signal mutations done with `set()` instead of `update()` when new value depends on old → stale value race.
- **[HIGH]** `EventEmitter` type not specified (`EventEmitter` vs `EventEmitter<string>`) → runtime type mismatch.
- **[MEDIUM]** Template reference variables (`#ref`) used for logic across complex templates → tight coupling.
- **[MEDIUM]** `@ViewChild` accessed before `ngAfterViewInit` → undefined access.
- **[MEDIUM]** `*ngIf` with multiple conditions not extracted to component method → unreadable template.
- **[MEDIUM]** RxJS operators not used (`switchMap`, `takeUntil`, `shareReplay`) → anti-patterns.
- **[MEDIUM]** `switchMap` used when `mergeMap` needed (or vice versa) → requests cancelled or duplicated.
- **[MEDIUM]** Not using Angular's new control flow (`@if`, `@for`, `@switch`) in Angular 17+ projects.
- **[LOW]** Missing `standalone: true` when upgrading from NgModule-based components (Angular 14+).
- **[LOW]** `console.log` left in component lifecycle hooks → production noise.
- **[LOW]** Pipes not used for data transformation in template → inline ternary/method calls everywhere.

---

## Common Bugs & Pitfalls

- **[HIGH]** `ExpressionChangedAfterItHasBeenCheckedError` — modifying bound value in `ngAfterViewInit` without `ChangeDetectorRef.detectChanges()`.
- **[HIGH]** `async` pipe used with cold observable that never completes → subscription held forever.
- **[HIGH]** `switchMap` in effects cancelling in-flight HTTP requests on rapid emissions → use `exhaustMap` for form submits.
- **[HIGH]** Signal `effect()` creating infinite loop — reading and writing same signal in effect body.
- **[HIGH]** `DestroyRef` injection not used with `takeUntilDestroyed()` outside constructor → requires injection context.
- **[HIGH]** `HttpClient` returning cold observable — not subscribing means request never fires.
- **[MEDIUM]** `Subject` vs `BehaviorSubject` confusion — using Subject where late subscribers need current value.
- **[MEDIUM]** Calling `markForCheck()` excessively in OnPush → defeats the purpose.
- **[MEDIUM]** Route params accessed via `snapshot` inside component that needs to react to param changes → use `paramMap` observable.
- **[MEDIUM]** Interceptor modifying request without cloning → mutating immutable `HttpRequest`.
- **[MEDIUM]** `providedIn: 'root'` on service with state meant to be scoped per module → shared state bug.
- **[LOW]** Forgetting `@Output()` decorator on EventEmitter → event never emits to parent.
- **[LOW]** `HostListener` not cleaned up — unlike subscriptions, it IS cleaned up by Angular but double-attaching is possible via manual `addEventListener`.
