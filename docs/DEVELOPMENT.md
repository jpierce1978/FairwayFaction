# FairwayFaction — Development Guide

## Prerequisites

- Node 22+ (developed on Node 24) and npm 10+.
- iOS: Xcode + Simulator, or a device with **Expo Go** / a development build. Android: Android Studio or a device.
- Optional for cloud work: [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker.

## Setup

```bash
npm install
cp .env.example .env.local   # optional: leave Supabase values empty to use the dev auth mock
npx expo start               # then press i (iOS) or a (Android), or scan the QR in Expo Go
```

With no `EXPO_PUBLIC_SUPABASE_*` values the app runs against an **in-memory mock auth service**: any valid email
(+ 8-char password) creates an account for that session; sessions do not persist across launches. The Home screen shows
**development mock data** and a dev panel (simulate an active round, open the round shell).

`expo-sqlite` is part of Expo Go, so no development build is needed yet. Anything with new native code will need
`npx expo run:ios|android` or an EAS development build. Web is not supported (see ARCHITECTURE §10).

## Commands

| Command                    | Purpose                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `npm run check`            | typecheck + lint + all tests (run before finishing any change)         |
| `npm run typecheck`        | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`)                    |
| `npm run lint`             | `expo lint`                                                            |
| `npm test`                 | app tests, then Postgres/RLS tests                                     |
| `npm run test:app`         | Jest `app` project (jest-expo)                                         |
| `npm run test:db`          | Jest `supabase` project (PGlite, native ESM)                           |
| `npm run format`           | Prettier (specs in `docs/` are excluded and must never be reformatted) |
| `npx expo install --check` | verify dependency versions against the SDK                             |

Always add native-compatible dependencies with `npx expo install <pkg>`, not `npm i`.

## Supabase

```bash
supabase start
supabase db reset          # applies supabase/migrations/* in filename order
```

Copy the API URL and anon key into `.env.local`. `supabase/config.toml` disables email confirmation for local work.
Migrations: add a **new** file `supabase/migrations/<timestamp>_<name>.sql`; never edit one that has been applied
anywhere shared. The `tests/supabase.test.ts` suite runs every file in that folder against Postgres, so a migration
that does not apply cleanly, adds a table without RLS, or breaks a policy fails CI.

## Adding things

**A local table/column**: append a migration module in `src/infrastructure/database/sqlite/migrations/`, register it in
`index.ts`, add the matching Postgres migration, add a domain type + mapper, add the entity to `SYNCED_ENTITY_TYPES` if it syncs.

**A write path** (repository method): validate → open one transaction → write the row → `queue.enqueue(tx, …)`.
Never write to a synced table without queuing its mutation, and never `await` network calls inside the transaction.

**A game**: create `src/games/<key>/`, implement `GameModule`, register it in `createProductionRegistry()`, test it with
`contextWith(...)`-style pure fixtures (see `tests/helpers/context.ts`). Do not touch UI to add a game; the UI renders
the module's `summary`/results. Bump `version` (and keep the old module registered) when rules change.

**A capability**: add it to `CAPABILITIES`, map it in `ROLE_CAPABILITIES`/`resolveCapabilities`, and mirror the rule in an RLS policy.

**A screen**: put the route file in `src/app/` (thin), the screen in `src/screens/`, logic in a domain/view-model function with a test.
Every production screen must define loading, empty, offline, error, permission, back, and accessibility behaviour
(SCREEN_CONTRACTS §20); use `LoadingState`/`EmptyState`/`ErrorState`.

**A color**: change `src/global.css` **and** `src/design/tokens/colors.ts` (and `tailwind.config.js` for a new token);
`designTokens.test.ts` fails if they disagree.

## Conventions

- TypeScript strict; branded id types (`RoundId`, …) from `src/types/ids.ts`.
- Inject `IdGenerator`/`Clock` into services; tests use `sequentialIds()`/`fixedClock()`.
- No game logic, permission role checks, or SQL in components.
- Touch targets ≥ 56pt, state never conveyed by color alone (see `StatusPill`), text scales with system settings.
- Dev-only code (`src/dev/`, `__DEV__` blocks) must not leak into production paths.

## Troubleshooting

- _"Worker chunk not found … expo-sqlite/web"_ — you are bundling for web without `expoAdapter.web.ts`; do not remove it.
- _PGlite test fails with a dynamic-import error_ — run via `npm run test:db` (needs `--experimental-vm-modules`).
- _Styles missing_ — restart with `npx expo start --clear` after editing `tailwind.config.js` or `global.css`.
- _App stuck on "Opening FairwayFaction…"_ — check the Metro log; a migration error shows the error state, not a blank screen.
