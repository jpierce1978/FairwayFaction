# FairwayFaction — Decision Log

Decisions made during implementation that the three specs do not dictate. Newest last within each milestone.
Format: **ID · decision** — why · consequence/revisit trigger. Spec deviations are marked **[deviation]**.

## Milestone 1

**D-01 · Expo SDK 57 / React Native 0.86 / React 19, TypeScript strict, Expo Router, expo-sqlite, Supabase, NativeWind.**
Per the project brief. Versions are whatever `create-expo-app` pinned; `npx expo install --check` is clean.
`noUncheckedIndexedAccess` is on, so index access returns `T | undefined`.

**D-02 · NativeWind v4.2.7 + Tailwind 3.4, not NativeWind v5.**
v5 is a release candidate that requires Tailwind 4 and `react-native-css`. v4 is the stable line and works with this stack
(Metro bundle verified). Revisit when v5 is stable. The React Compiler experiment from the template was **disabled** to avoid an
untested combination with NativeWind's JSX transform.

**D-03 · Routes live in `src/app/`; providers in `src/providers/`; screen bodies in `src/screens/`. [deviation]**
DOMAIN_MAP §19 shows `app/routes` and `app/providers`, but Expo Router treats every file under its root as a route, so
non-route files cannot live there. Route files are thin wrappers; no business logic moved into `app/`. The "don't organize by
screens" rule is preserved: `src/screens` only composes; rules live in `domains/` and `games/`.

**D-04 · IDs are client-generated UUIDs with branded TypeScript types.**
Required for offline creation (a row has the same identity locally and in Postgres). Branding (`RoundId` vs `RoundPlayerId`)
prevents mixing ids. Mapper functions cast at the database edge. Test fixtures use readable non-UUID strings against SQLite
(SQLite doesn't care) and real UUIDs against Postgres.

**D-05 · A `SqlDatabase` seam over expo-sqlite; tests use `node:sqlite`.**
Lets migrations, the mutation queue and repositories run in Jest with no simulator. Only `expoAdapter.ts` imports expo-sqlite.
`transaction()` uses expo-sqlite's _exclusive_ transactions so other queries cannot interleave into a score write.
Residual risk: the Node and expo SQLite builds can differ in version/pragmas; verify on-device when a simulator is available.

**D-06 · Local migrations are TS modules with checksums.**
Metro cannot import `.sql` files without extra config. The runner refuses edited-after-applied migrations and databases newer than
the app. Cloud migrations are plain `.sql` for the Supabase CLI.

**D-07 · Local foreign keys only within a round's aggregate.**
`round → players/teams/scores/games/ledger` cascade. Cross-domain references (`course_id`, `user_id`, `faction_id`, `hole_id`)
are plain indexed columns so synced data can arrive in any order without FK failures.

**D-08 · `GameModule.validateConfiguration` takes `unknown`, not `TConfig`. [deviation]**
Configuration arrives from persisted JSON and presets, so the boundary must narrow untrusted data; typing it as `TConfig`
would hide invalid input. `calculate` returns a human-readable `summary` in addition to `{ state, results }` so the Games UI
displays module-generated text instead of computing anything (SCREEN_CONTRACTS §12). `TResult` is constrained to a
`GameResultDraft`; the engine stamps `gameInstanceId`.

**D-09 · The production game registry is empty; the sample module is registered only by `createDevelopmentRegistry()`.**
Milestone brief: prove the architecture, ship no real games. `__DEV__` selects the registry in `services.ts`.
Round start validation treats an unknown game key as invalid, which is also the behaviour when an old app opens a newer round.

**D-10 · Ties produce no result and are reported via `validateCompletion.unresolvedTies`.**
UX_SPEC §31: never silently invent a result. The Round Check screen (later) consumes this.

**D-11 · Permissions: capabilities in TS, mirrored by RLS.**
The brief and DOMAIN_MAP §15 want centralized capabilities. Server enforcement must be independent of the client, so Postgres
RLS re-expresses the same rules in SQL. The duplication is deliberate; the `supabase` tests pin the behaviour. Notable rules:
faction rounds can only be created by faction admins (matching the `round.start` capability); a **round creator** has manage
rights on their own round even without a faction role (solo rounds); `round.score_group` is implemented as "same
`scoring_group_id`".

**D-12 · Sync: transport not implemented; conflict policy deferred.**
Milestone 1 delivers the queue and `SyncService`. The app wires `unconfiguredTransport` (always retryable) so nothing is lost.
Open questions for the sync milestone: payload→column mapping, pull/merge, conflict detection using `ScoreEvent.version`/`updatedAt`,
and UX_SPEC §30's "which score is correct?" flow. RLS deliberately has **no status gate** on score writes: an offline scorer syncing
after the round was finalized must surface as a conflict, not a silent 403.

**D-13 · Invites are reusable until revoked/expired; joining is an RPC.**
`join_faction_by_code` (security definer) is the only way a non-admin becomes a member; `INVITE USED` status is reserved for
single-use invites. Removed members cannot rejoin via invite. `preview_faction_invite` backs the "Join Group" preview card.

**D-14 · Auth falls back to an in-memory mock when Supabase is not configured.**
So the app is runnable and testable offline from day one. It is flagged `isDevelopmentMock` and shown in dev builds only.
Supabase sessions are stored in the Keychain/Keystore (expo-secure-store) with value chunking (SecureStore limit ≈ 2 KB).
Apple/Google sign-in: buttons present (UX_SPEC §6), service returns `PROVIDER_NOT_CONFIGURED`.

**D-15 · Profile gating is local-first.**
"Has a profile" means a row exists in local SQLite for that user. First sign-in on a _new device_ for an existing account will
show the profile screen until profile pull-sync exists (sync milestone). Acceptable for now; noted so it isn't mistaken for a bug.

**D-16 · UX_SPEC §6 screen 4 ("Intent: join / create / just keep scores") is not built.**
It is not in the MVP screen inventory (§42) and depends on Faction creation/joining. Onboarding currently ends at the basic profile.

**D-17 · Web is unsupported.**
expo-sqlite's web build is experimental and needs extra bundler/worker config; this is a mobile product with on-device SQLite as
source of truth. `expoAdapter.web.ts` fails with a clear message so `expo start --web` doesn't crash the bundler.

**D-18 · Two Jest projects.**
`app` (jest-expo; component/navigation tests need it) and `supabase` (PGlite ships ESM using `import.meta`, so it runs as native ESM
under `--experimental-vm-modules`, which breaks jest-expo's CJS loading, hence separate runs). `npm test` runs both.
`@babel/preset-typescript` is declared explicitly for the ESM project.

**D-19 · Design tokens have three mirrors, enforced by a test.**
CSS variables (`global.css`, light/dark via `prefers-color-scheme`), TS tokens (for icons/nav chrome), Tailwind config.
`designTokens.test.ts` fails on drift and checks WCAG AA contrast for text pairs (UX_SPEC §39). Dark mode follows the system.

**D-20 · Prettier excludes the three specs.**
`.prettierignore` lists them; they are authoritative and byte-identical to what was provided.

**D-21 · No git repository was initialized.**
The workspace was not a repo and Milestone 1 did not request one. `.gitignore` is in place; run `git init` when ready.
