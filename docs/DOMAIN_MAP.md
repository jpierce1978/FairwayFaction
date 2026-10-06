# FairwayFaction — Domain Map v0.1

## 1. Identity Domain

Responsible for:
- authentication
- account identity
- profile
- preferences

### Entities

**User**
- id
- email/auth identity
- createdAt

**Profile**
- userId
- displayName
- avatar
- homeCourseId
- preferredTee
- handicapIndex
- handicapProvider
- handicapProviderId
- preferences

## 2. Faction Domain

Responsible for persistent golf groups.

### Entities

**Faction**
- id
- name
- homeCourseId
- timezone
- createdBy
- settings

**FactionMember**
- factionId
- userId
- role
- status
- joinedAt

Roles initially:
- ADMIN
- MEMBER

Future roles may include:
- ORGANIZER
- SCORER

**FactionRoundTemplate**
- factionId
- name
- courseId
- schedule defaults
- defaultGamePresets
- defaultTeamMethod
- defaultRoundSettings

**FactionInvite**
- factionId
- token/code
- invitedBy
- expiration
- usage status

## 3. Scheduling Domain

Responsible for upcoming golf rather than completed golf.

### Entity

**ScheduledRound**
- id
- factionId
- scheduledAt
- courseId
- status

Statuses:
- UPCOMING
- OPEN_FOR_RSVP
- READY
- CONVERTED_TO_ROUND
- CANCELLED

**RoundRSVP**
- scheduledRoundId
- userId/memberId
- status
- updatedAt

Statuses:
- YES
- NO
- MAYBE
- NO_RESPONSE

A ScheduledRound eventually creates a real Round.

## 4. Course Domain

Responsible for golf-course metadata.

### Entities

**Course**
- id
- name
- location
- timezone
- numberOfHoles

**CourseTee**
- id
- courseId
- name
- color
- gender/category if necessary
- rating
- slope
- totalYardage

**Hole**
- id
- courseId
- holeNumber
- par

**TeeHole**
- courseTeeId
- holeId
- yardage
- handicapIndex

Future:

**HoleGeometry**
- green front
- green center
- green back
- hazards
- polygons
- mapping provider metadata

Course scoring data and GPS geometry should be separable.

## 5. Round Domain

Responsible for one actual played round.

### Round
- id
- factionId nullable
- scheduledRoundId nullable
- courseId
- startedAt
- completedAt
- status
- createdBy
- localVersion
- cloudVersion

Statuses:
- DRAFT
- READY
- ACTIVE
- FINALIZING
- COMPLETE
- CANCELLED

### RoundPlayer
Represents participation.

- id
- roundId
- userId nullable
- guestProfileId nullable
- displayNameSnapshot
- teeId
- handicapSnapshot
- scoringGroupId
- startOrder
- status

Snapshot important data so old rounds do not change when profiles later change.

### GuestProfile
- id
- displayName
- optional contact details
- createdBy

A guest does not need a FairwayFaction account.

## 6. Team Domain

### RoundTeam
- id
- roundId
- name
- displayOrder

### RoundTeamMember
- teamId
- roundPlayerId

Game modules consume teams where appropriate.

The Round domain owns teams.

Individual games may reference them rather than create duplicate team structures.

## 7. Scoring Domain

This is a core source-of-truth domain.

### ScoreEvent

One logical score record for:

`RoundPlayer + Hole`

Fields:
- id
- roundId
- roundPlayerId
- holeId
- grossScore
- putts nullable
- fairwayResult nullable
- gir nullable
- penalties nullable
- metadata
- updatedAt
- updatedBy
- deviceId
- version
- syncStatus

Unique logical key:

`roundPlayerId + holeId`

### Important Rule
Games read scoring data.

Games do not own golf scores.

## 8. Game Engine Domain

### GameDefinition

Defines a type of game.

Examples:
- skins
- nassau
- best-ball
- dots
- wolf

Fields:
- key
- name
- version
- description
- capabilities

GameDefinitions may be code-backed in early versions.

### GamePreset

Reusable configuration.

- id
- factionId nullable
- ownerId
- gameDefinitionKey
- name
- configuration JSON
- createdAt

Example:
**Saturday Best Ball**

### GameInstance

A configured game attached to a Round.

- id
- roundId
- gameDefinitionKey
- gameDefinitionVersion
- presetId nullable
- configuration JSON
- status

Statuses:
- PENDING
- ACTIVE
- COMPLETE
- INVALID

### GameModule Contract

Conceptually:

```ts
interface GameModule<TConfig, TState, TResult> {
  key: string;
  version: number;

  validateConfiguration(
    context: RoundContext,
    config: TConfig
  ): ValidationResult;

  initialize(
    context: RoundContext,
    config: TConfig
  ): TState;

  calculate(
    context: RoundContext,
    config: TConfig
  ): {
    state: TState;
    results: TResult[];
  };

  validateCompletion(
    context: RoundContext,
    config: TConfig
  ): CompletionValidation;
}
```

For MVP, calculations may recompute deterministically from round state instead of relying on complicated incremental mutation.

That is simpler and safer.

Optimize later only if necessary.

## 9. Game Results Domain

### GameResult

Normalized result output.

Example:
- gameInstanceId
- resultType
- winnerType
- winnerId
- loserId nullable
- unitCount
- description
- metadata

Examples:
`Team A won Front #1`

or:

`JP receives 1 unit from Paul`

The result is abstract.

## 10. Ledger Domain

Responsible only for translating game outcomes into obligations.

### LedgerEntry
- id
- roundId
- gameInstanceId
- fromRoundPlayerId
- toRoundPlayerId
- units
- unitType
- configuredValue nullable
- displayValue nullable
- description
- status

Statuses:
- CALCULATED
- ACKNOWLEDGED
- VOID

MVP does not require payment processing.

## 11. Statistics Domain

Derived from score data.

Examples:
- scoring average
- par/birdie/bogey rates
- fairways
- GIR
- putts
- game performance

Statistics should generally be computed or materialized from ScoreEvents rather than being another competing source of truth.

## 12. Leaderboard Domain

Consumes:
- completed rounds
- GameResults
- ScoreEvents
- configurable Faction rules

### Season
- factionId
- name
- startDate
- endDate

### LeaderboardDefinition

Examples:
- total wins
- points
- skins
- attendance
- season points

Avoid hardcoding one universal leaderboard philosophy.

## 13. Synchronization Domain

This is infrastructure but important enough to treat explicitly.

### LocalMutation
- id
- entityType
- entityId
- operation
- payload
- localTimestamp
- deviceId
- retryCount
- status

Statuses:
- PENDING
- SYNCING
- SYNCED
- FAILED
- CONFLICT

## Write Flow

```text
User Action
   ↓
Local SQLite
   ↓
Domain update
   ↓
UI update
   ↓
Game recalculation
   ↓
LocalMutation queued
   ↓
Cloud sync
```

Cloud availability must not sit between user input and local success.

## 14. Conflict Domain

Not necessarily its own database table initially, but a formal concept.

Conflict examples:
- Two users change the same score.
- Admin removes player while scorer is offline.
- Game configuration changes during play.

Use entity versions and timestamps.

Do not silently overwrite consequential golf scores when conflicting edits cannot safely be resolved.

## 15. Permission Domain

Permissions should be expressed as capabilities.

Examples:
- faction.manage
- faction.invite
- round.edit
- round.start
- round.finish
- round.score_self
- round.score_group
- score.correct_any
- game.configure

Roles map to capabilities.

Avoid scattering:

```ts
if (user.role === "ADMIN")
```

throughout UI components.

Use centralized authorization.

## 16. Entitlement Domain

Separate authorization from paid features.

Example:

User may have permission to configure a game but lack the subscription entitlement required for a premium game.

Future entities:

**Entitlement**
- FREE
- PLUS
- FACTION_PRO
- LIFETIME

Business logic should query capabilities such as:

`canUsePremiumGames`

rather than checking RevenueCat directly throughout UI code.

## 17. Domain Dependency Direction

Preferred dependency direction:

```text
Identity
    ↓

Faction ───────────────┐
                       ↓
Scheduling ───────→ Round
Course ───────────→ Round
                       ↓
                    Scoring
                       ↓
                   Game Engine
                       ↓
                   Game Results
                       ↓
                     Ledger

Round + Scores ───→ Statistics
Results ──────────→ Leaderboards
```

Infrastructure services:

```text
SQLite
Supabase
Sync
Notifications
GPS
RevenueCat
```

wrap the domains rather than define them.

## 18. Source-of-Truth Rules

### User identity
Cloud:
Supabase Auth

### Active round score entry
Immediate:
Local SQLite

Eventually synchronized:
Supabase

### Golf scores
Canonical logical entity:
ScoreEvent

### Game outcomes
Derived from:
Round + ScoreEvents + Game configuration

### Settlement
Derived from:
GameResults + Ledger configuration

### Statistics
Derived from:
ScoreEvents

Avoid maintaining multiple independent copies of derived values.

## 19. Initial Module Boundaries

Recommended project structure:

```text
src/

  app/
    routes/
    providers/

  domains/

    auth/
    factions/
    scheduling/
    courses/
    rounds/
    scoring/
    games/
    ledger/
    statistics/
    permissions/

  games/
    core/
    skins/
    nassau/
    best-ball/
    dots/

  infrastructure/

    database/
      sqlite/
      supabase/

    sync/

    gps/

    notifications/

    entitlements/

  components/

    ui/
    golf/
    forms/

  design/

    tokens/
    typography/
    spacing/

  hooks/

  utils/

  types/
```

Do not organize the entire application primarily by screens.

Business rules belong in domains.

Screens compose them.

## 20. Architectural Decision for MVP

For the first implementation:

### Use deterministic game recalculation.

Whenever a score changes:

1. Load relevant RoundContext.
2. Re-run each active GameModule calculation.
3. Replace/update calculated local game state/results.
4. Render.

Golf rounds contain tiny amounts of data by software standards.

Correctness and simplicity matter more than premature optimization.

This also makes:
- undo
- score corrections
- sync reconciliation
- testing

substantially safer.
