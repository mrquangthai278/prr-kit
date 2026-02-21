# Firebase — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `firebase` in deps · `initializeApp(` · `getFirestore(` · `getAuth(` · `collection(` · `import 'firebase/` · `firebase.json` · `.firebaserc`

---

## Security

- **[CRITICAL]** Firestore / Realtime Database security rules contain `allow read, write: if true` → anyone on the internet can read, write, or delete your entire database.
- **[CRITICAL]** Firebase Admin SDK service account JSON committed to version control → full administrative access to your Firebase project, bypasses all security rules.
- **[HIGH]** Firestore security rules not validating incoming data shape or field types → client can write documents with any structure, including oversized fields or unexpected types. Add `request.resource.data` validation.
- **[HIGH]** Authorization logic in client-side code only: `if (user.uid === doc.ownerId)` → client code can be bypassed. Enforce ownership and access control in Firestore security rules.
- **[MEDIUM]** Firebase API key visible in client-side code → expected (it's a public identifier), BUT ensure domain restrictions are configured in Firebase Console to prevent use from unauthorized domains.

---

## Performance

- **[HIGH]** `onSnapshot` listener not unsubscribed on component unmount → each mount adds a new listener; stale listeners fire callbacks on unmounted components, causing memory leaks and potential state updates after unmount.
- **[HIGH]** Fetching entire collection without a `where()` query → every read costs money; full collection scans on large datasets will exhaust quota and budget.
- **[MEDIUM]** Missing `limit()` on Firestore queries → unbounded reads; a growing collection causes increasing cost and latency over time.
- **[MEDIUM]** Real-time `onSnapshot` listener used where a one-time `getDoc()` / `getDocs()` suffices → continuous WebSocket connection maintained unnecessarily.
- **[LOW]** Not using `enableIndexedDbPersistence()` for offline support → queries fail when offline; consider offline capability for mobile-like use cases.

---

## Architecture

- **[HIGH]** Business logic placed in Firestore security rules (complex calculations, multi-step workflows) → rules are for access control only; complex logic belongs in Cloud Functions or the application layer.
- **[MEDIUM]** Deeply nested Firestore sub-collections more than 2 levels → Firestore cannot query across parent documents for sub-collections. Flatten the data model or use root-level collections with foreign key fields.
- **[MEDIUM]** `set()` used without `{ merge: true }` when partial update is intended → overwrites entire document, deletes unspecified fields. Use `update()` for partial updates.
- **[LOW]** Storing large blobs or images directly in Firestore documents → Firestore is optimized for structured data; store binaries in Firebase Storage and keep URLs/metadata in Firestore.

---

## Common Bugs & Pitfalls

- **[HIGH]** Direct array write instead of `arrayUnion` / `arrayRemove` for concurrent updates → two simultaneous writes both read the array, modify it, and write back; one write overwrites the other (last-write-wins). Use atomic array operations.
- **[HIGH]** `Timestamp.now()` used for ordering instead of `serverTimestamp()` → client clock may be wrong (wrong timezone, wrong time). Use `serverTimestamp()` for ordering and audit trails.
- **[MEDIUM]** Querying with `where('field', '!=', value)` without a composite index → Firestore throws an error at runtime pointing to the missing index. Check the Firebase Console for required indexes.
- **[MEDIUM]** `auth.currentUser` accessed synchronously on app load before auth state is initialized → may be `null` even if user is logged in. Always use `onAuthStateChanged` to react to auth state.
- **[LOW]** Firestore `where` inequality filter (`<`, `>`, `!=`) on a field combined with `orderBy` on a different field → requires a composite index and may throw a runtime error.
