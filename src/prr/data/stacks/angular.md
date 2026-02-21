# Angular — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.component.ts`, `@Component(`, `@Injectable(`, `@NgModule(`, `angular.json`, `@angular/` in deps

---

## Security

- **[CRITICAL]** `bypassSecurityTrustHtml()` / `DomSanitizer.bypassSecurityTrust*()` with user-controlled content → XSS. Angular sanitizes by default; bypass only for fully trusted content.
- **[CRITICAL]** `[innerHTML]` binding with user content → XSS if Angular's sanitization is bypassed anywhere in the chain.
- **[HIGH]** Route guard missing on protected routes (`canActivate`, `canActivateChild`) → unauthenticated access.
- **[HIGH]** Interceptor not adding auth header → API calls sent without credentials.
- **[MEDIUM]** Sensitive data stored in `localStorage` via Angular service → accessible to injected scripts.
- **[MEDIUM]** CSRF token not included in HTTP interceptor for state-changing requests.

---

## Performance

- **[HIGH]** Component not using `OnPush` change detection strategy for data-heavy components → Angular checks entire component tree on every event.
- **[HIGH]** Subscription not unsubscribed in `ngOnDestroy` (or not using `async` pipe / `takeUntilDestroyed`) → memory leak.
- **[HIGH]** `trackBy` missing on `*ngFor` with large/dynamic lists → full DOM re-render on any change.
- **[MEDIUM]** Heavy computation in template expressions → recalculated on every change detection cycle. Use `pipe` (pure) or component property.
- **[MEDIUM]** Multiple HTTP calls made sequentially that could be parallel → use `forkJoin`.
- **[MEDIUM]** Not using lazy-loaded feature modules for large sections → oversized initial bundle.
- **[LOW]** `APP_INITIALIZER` doing slow work → delays app startup. Defer non-critical init.

---

## Architecture

- **[HIGH]** Business logic in component class → move to injectable service.
- **[HIGH]** Component directly calling HTTP client instead of service layer → untestable, tightly coupled.
- **[HIGH]** Circular dependency between services → Angular DI will throw at runtime.
- **[MEDIUM]** Missing `providedIn: 'root'` vs module-scoped provider — wrong scope causes multiple instances.
- **[MEDIUM]** Smart/dumb component boundary violated — presentational component directly injecting services.
- **[MEDIUM]** Using `any` type in component Input/Output → loses type safety at component boundary.
- **[LOW]** Module not feature-scoped — all declarations in `AppModule` → slow compilation, poor separation.

---

## Code Quality

- **[HIGH]** `ngOnInit` subscribing to Observable without `async` pipe or explicit unsubscription → memory leak.
- **[MEDIUM]** `EventEmitter` type not specified (`EventEmitter` vs `EventEmitter<string>`) → runtime type mismatch.
- **[MEDIUM]** Template reference variables (`#ref`) used across components → tight coupling.
- **[LOW]** Missing `standalone: true` when upgrading from NgModule-based components (Angular 14+).
- **[LOW]** `console.log` left in component lifecycle hooks → production noise.

---

## Common Bugs & Pitfalls

- **[HIGH]** `ExpressionChangedAfterItHasBeenCheckedError` — modifying bound value in `ngAfterViewInit` without `ChangeDetectorRef.detectChanges()`.
- **[HIGH]** Async pipe used with cold observable that never completes — subscription held forever.
- **[MEDIUM]** `Subject` vs `BehaviorSubject` confusion — using `Subject` where late subscribers need current value.
- **[MEDIUM]** Calling `markForCheck()` excessively in OnPush → defeats the purpose of OnPush.
- **[LOW]** Forgetting `@Output()` decorator on EventEmitter → event never emits to parent.
