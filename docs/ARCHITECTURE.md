# FairwayFaction — Architecture (Milestone 1)

This describes what is **built** after Milestone 1. The product and domain intent live in
[UX_SPEC.md](UX_SPEC.md), [SCREEN_CONTRACTS.md](SCREEN_CONTRACTS.md) and [DOMAIN_MAP.md](DOMAIN_MAP.md);
those remain the source of truth. Choices that go beyond them are recorded in [DECISIONS.md](DECISIONS.md).

## 1. Shape of the system

```text
 UI (Expo Router screens, NativeWind components)
        │ reads view models / calls services; contains no game or business rules
        ▼
 domains/*  ──  pure types + validation + capability rules (no I/O)
 games/*    ──  GameModule contract, registry, deterministic engine, game modules
        ▲
        │ wrapped by
 infrastructure/*  ──  SQLite · Supabase · sync queue · auth · config · entitlements seams
```

Dependency direction follows DOMAIN_MAP §17: infrastructure wraps domains, never the reverse.
`domains/` and `games/` import nothing from `infrastructure/`, `components/`, React Native or Expo
(checked by grep at the end of Milestone 1; consider an ESLint `no-restricted-imports` rule to enforce it).

## 2. Directory map

| Path                                    | Responsibility                                                                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`                              | Expo Router routes only. Files are thin: they import a screen and export it.                                                                              |
| `src/screens/`                          | Screen composition. Consume contracts/view models; hold no rules.                                                                                         |
| `src/providers/`                        | React context: `ServicesProvider` (DB + services), `AuthProvider` (session → `AuthStatus`).                                                               |
| `src/domains/<name>/`                   | `types.ts` (strongly typed models), `validation.ts`, rules. Auth, factions, scheduling, courses, rounds, scoring, games, ledger, statistics, permissions. |
| `src/games/core/`                       | `GameModule`, `RoundContext`, validation types, `GameRegistry`, `calculateGames`.                                                                         |
| `src/games/sample/`                     | The one **sample** module (`sample-low-total`). Dev/test registry only.                                                                                   |
| `src/infrastructure/database/sqlite/`   | `SqlDatabase` seam, expo-sqlite adapter, migrator + migrations, repositories.                                                                             |
| `src/infrastructure/database/supabase/` | Supabase client factory.                                                                                                                                  |
| `src/infrastructure/sync/`              | `LocalMutation`, `MutationQueue`, `SyncService`, transport/connectivity interfaces.                                                                       |
| `src/infrastructure/auth/`              | `AuthService` interface, Supabase + dev-mock implementations, secure session storage.                                                                     |
| `src/infrastructure/entitlements/`      | Entitlement seam (free tier only; no RevenueCat yet).                                                                                                     |
| `src/components/ui/`                    | Design-system primitives (`Text`, `Button`, `Card`, `Screen`, `TextField`, states).                                                                       |
| `src/design/`                           | Tokens: colors (mirrors `global.css`), spacing, typography.                                                                                               |
| `src/dev/`                              | Development-only mock data. Never imported by domain/infrastructure code.                                                                                 |
| `supabase/migrations/`                  | Postgres schema and RLS.                                                                                                                                  |
| `tests/`                                | Jest tests (see §9).                                                                                                                                      |

## 3. Local-first write flow

SQLite is the source of truth for an active round; Supabase is synchronized **from** it
(DOMAIN_MAP §13, §18). The network is never between a user action and local success.

```text
user action
  → repository method opens ONE SQLite transaction:
        1. validate input (domain validation)
        2. upsert the row                      (e.g. score_events)
        3. MutationQueue.enqueue(tx, …)        (local_mutations, status PENDING)
     commit  ─ both rows or neither
  → UI reads committed local state
  → game recalculation (pure, from local RoundContext)
  → later: SyncService drains local_mutations → SyncTransport → Supabase
```

`ScoreRepository.recordScore` is the reference implementation (no UI calls it yet). It is covered by
`tests/writeFlow.test.ts`, including rollback when the queue write fails and the full
write → load context → recalculate loop.

`MutationQueue` guarantees: FIFO claim (`rowid` order), claimed rows become `SYNCING`, transient failures
return to `PENDING` with `retryCount+1` until `maxRetries` then `FAILED`, conflicts are parked as `CONFLICT`
(never overwritten), and rows stranded `SYNCING` by a crash are released on the next sync.

`SyncService` coalesces concurrent calls, skips cleanly when offline, never holds a DB transaction across
network I/O, and stops draining when a pass makes no forward progress. **No real transport exists yet**:
the app wires `unconfiguredTransport`, which reports every push as a retryable failure so nothing is ever dropped.

> Note for the sync milestone: queued payloads are camelCase domain objects. The Supabase transport must map
> them to snake_case columns, drop local-only fields, and decide conflict resolution (see DECISIONS D-12).

## 4. Local database

- Access goes through `SqlDatabase`/`SqlExecutor` (`run/all/get/exec/transaction`). `expoAdapter.ts` is the only
  file importing `expo-sqlite`; tests use a `node:sqlite` adapter against the same SQL.
- Migrations are TypeScript modules (`migrations/NNN_name.ts`) so Metro bundles them. `runMigrations` is safe on
  every launch, applies each migration in its own transaction with its bookkeeping row, verifies a checksum of
  already-applied migrations (editing a shipped migration is an error), and refuses a database newer than the app.
- **Never edit a shipped migration; append a new one** in `migrations/index.ts`.
- Schema conventions: UUID `TEXT` ids, ISO-8601 `TEXT` timestamps, JSON as `TEXT`, booleans `0/1`, enums as `CHECK`s.
  Foreign keys only inside a round's aggregate; cross-domain references are plain indexed columns so cloud data can be cached in any order.

## 5. Cloud schema (Supabase / Postgres)

- `20261005000001_core_schema.sql`: every core entity from DOMAIN_MAP, enums, constraints, `updated_at` triggers, RLS enabled on **all** tables.
- `20261005000002_rls_policies.sql`: helper functions, policies, `join_faction_by_code`, `preview_faction_invite`.
- The "User" entity is Supabase's `auth.users`.
- RLS mirrors the capability model: faction admins manage; round creators/admins "manage" a round; players score
  themselves; members of a player's `scoring_group_id` score that group (the foursome scorer). Members join factions
  only through the `join_faction_by_code` RPC, never by inserting into `faction_members`.
- A test asserts every public table has RLS enabled **and** at least one policy.

## 6. Game engine

```ts
GameModule<TConfig, TState, TResult> {
  key, version, name, description, capabilities
  validateConfiguration(context, config: unknown): ValidationResult
  initialize(context, config): TState
  calculate(context, config): { state, results, summary }
  validateCompletion(context, config): CompletionValidation   // missing scores, unresolved ties
}
```

- `RoundContext` is a plain snapshot (round, course, holes, tees, players, teams, scores). Modules are pure
  functions of `(context, config)`; they never touch SQLite, Supabase or UI.
- `GameRegistry` is code-backed and versioned: `get(key)` returns the latest, `get(key, version)` the pinned
  version a round was created with; duplicate key+version is rejected.
- `calculateGames` recomputes every `GameInstance` deterministically (DOMAIN_MAP §20). One broken or unavailable
  game yields an `INVALID`/`UNAVAILABLE` outcome and never blocks the others. Ties are surfaced through
  `validateCompletion.unresolvedTies`; nothing invents a result (UX_SPEC §31).
- The UI displays `summary`/results; it never calculates. The production registry is **empty** in Milestone 1.

## 7. Permissions and entitlements

- `domains/permissions` defines `Capability`s (`faction.manage`, `round.edit`, `round.score_group`, …),
  role → capability mapping, and `resolveCapabilities(context)` (faction role + round creator + participant + scoring group).
- UI/services ask `can(caps, 'round.edit')`; no `role === 'ADMIN'` checks. Server-side enforcement is RLS (§5).
- Entitlements (paid features) are a separate seam (`EntitlementService`); RevenueCat is not integrated.

## 8. App shell and auth

- `ServicesProvider` opens SQLite, runs migrations, builds services, and shows loading/error states before anything else renders.
- `AuthProvider` maps a session to `AuthStatus`: `loading → signedOut → needsProfile → ready`.
- Root layout uses `Stack.Protected` groups so reachability is decided in one place:
  `(auth)` (signed out) · `(onboarding)` (signed in, no local profile) · `(tabs)` + detail routes (ready).
- `(tabs)`: Home / Play / Groups / Me. `round/[roundId]`: Score / Games / GPS / Round (replaces the main tabs, UX_SPEC §4).
- Without Supabase env vars the app uses an **in-memory dev auth mock** (flagged in the UI in dev builds).
  Apple/Google buttons exist but return a clear "not set up yet" message.
- Built screens: auth flow, basic profile, Home (mock data), Me, shells for everything else.

## 9. Testing

| Suite                | What it proves                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `migrations`         | tables exist, idempotent, ordered, failed migration rolls back, tamper/newer-DB refusal, schema constraints |
| `mutationQueue`      | enqueue/claim/retry/conflict/crash recovery, atomicity with domain writes, SyncService behaviour            |
| `writeFlow`          | local-first score write, version bump on correction, rollback, write → context → recalculation              |
| `domainValidation`   | auth/profile/faction/score/player/team/round-start rules                                                    |
| `gameRegistry`       | registry semantics, engine isolation + determinism, sample module                                           |
| `permissions`        | capability resolution                                                                                       |
| `home`, `navigation` | Home priority order/staleness; real route components: 4 main tabs vs 4 round tabs                           |
| `designTokens`       | CSS vars ⇄ TS tokens ⇄ Tailwind config in sync; WCAG AA contrast of text pairs                              |
| `auth`               | dev auth, chunked secure storage, config                                                                    |
| `supabase`           | migrations on real Postgres (PGlite) and RLS behaviour per role                                             |

## 10. Known limits after Milestone 1

- Not exercised on a physical device or simulator (no Xcode on the build machine). Verified by type-check,
  lint, Metro bundle, component/navigation tests, and a web render of the error state.
- The Supabase RLS suite runs on PGlite with `auth.users`/`auth.uid()`/roles stubbed; it is strong evidence, not a substitute for
  `supabase db reset` against the real stack.
- No cloud transport, no pull sync, no real-time, no production games, no GPS, no payments/RevenueCat/GHIN/push.
- Web is intentionally unsupported (expo-sqlite web is experimental).
