# FairwayFaction — Screen Contracts v0.1

## Purpose

A screen contract defines four things for every major screen:

1. What data the screen needs.
2. What the user can do.
3. What state changes those actions create.
4. Where the user goes next.

UI components should consume these contracts rather than contain business logic themselves.

## 1. Home

### Purpose
Show the user the single most relevant golf activity right now.

### Required Data
- Current user
- Active round, if one exists
- Next upcoming round
- User's Factions
- Recent completed rounds

### Priority Order
1. Active round
2. Upcoming round
3. Group activity
4. Recent history

### Primary Actions

#### Return to Active Round
Condition:
- User belongs to an active round.

Action:
- Open Active Round → Score.

#### View Upcoming Round
Action:
- Open Round Preview.

#### Open Faction
Action:
- Open Faction Home.

#### Start Round
Action:
- Open Start Round flow.

### Offline Behavior
Home should show cached information.

If stale:
Display:

**Last updated [time]**

Do not block access to an already-downloaded active round.

## 2. Faction Home

### Purpose
Serve as the operational home for a persistent golf group.

### Required Data
- Faction
- Current user's membership and role
- Next scheduled round
- RSVP status
- RSVP totals
- Recent round
- Standings preview

### Member Actions
- RSVP Yes
- RSVP No
- View next round
- View standings
- View members
- View history

### Admin Actions
Additionally:
- Manage upcoming round
- Invite members
- Modify Faction defaults
- Manage members

### State Changes
RSVP actions create/update `RoundRSVP` or, before a concrete round exists, `FactionEventRSVP`, depending on scheduling implementation.

### UX Rule
Admin controls should not dominate the screen.

## 3. Round Preview

### Purpose
Show the upcoming round without exposing full configuration complexity.

### Required Data
- Course
- Date/time
- Players
- RSVP status
- Round status
- Teams if generated
- Games
- Tee assignments

### Member Actions
- Change RSVP
- View player list
- View teams
- View game summary

### Admin Actions
- Edit players
- Generate/edit teams
- Change games
- Change tees
- Start round

### Start Condition
A round may begin if:
- At least one player exists
- Course exists
- Required game configuration is valid

Missing optional information should not block the round.

## 4. Quick Start Round

### Purpose
Start a recurring group round with almost no setup.

### Required Data
Inherited from `FactionRoundTemplate` including:
- default course
- default tees
- default game presets
- team-generation method
- normal round settings

Plus today's:
- RSVPs
- guests
- overrides

### Primary Action
#### Start Round

Creates or activates:
- Round
- RoundPlayers
- RoundTeams
- GameInstances
- TeeAssignments

Then:
- Persist locally
- Queue cloud sync
- Navigate to Score

### Secondary Actions
- Change Players
- Change Teams
- Change Games
- Change Tees
- More Options

### UX Rule
If nothing changed, one button should start the round.

## 5. Player Selection

### Purpose
Determine who is participating.

### Required Data
- RSVP Yes players
- Faction members
- Existing guests
- Current selections

### Actions
- Select player
- Deselect player
- Add guest
- Remove guest from round

### Validation
At least one player must remain selected.

### Save Behavior
Do not create duplicate user records for guests.

Guests belong initially to the round and may optionally be converted into persistent profiles later.

## 6. Team Assignment

### Purpose
Assign participating players to teams.

### Required Data
- RoundPlayers
- Existing team assignments
- Team size requirements from selected GameModules

### Actions
- Randomize
- Drag/move player
- Add/remove team
- Reset

### Future Actions
- Balance by handicap
- Balance by recent performance

### Validation
Game modules determine whether team composition is valid.

The Team screen itself should not hardcode game-specific team rules.

## 7. Game Selection

### Purpose
Attach one or more GameInstances to a round.

### Required Data
- Available GameDefinitions
- Faction favorite presets
- Current GameInstances

### Actions
- Enable game
- Disable game
- Select saved preset
- Configure game
- Save configuration as preset

### Output
Each selected game produces a `GameInstance` with:
- gameDefinitionId
- configuration
- status

### UX Rule
Never make the golfer rebuild a commonly used game configuration.

## 8. Game Configuration

### Purpose
Configure one selected game.

### Required Data
Defined dynamically by the GameModule.

### Validation
Performed by `GameModule.validateConfiguration()`.

UI should display validation errors returned by the module.

UI should not independently implement game rules.

## 9. Live Score

### Purpose
Record scores as quickly as possible.

This is the most important interaction surface in the application.

### Required Data
- Current hole
- Current scoring group/foursome
- Player scores for current hole
- Course hole metadata
- Relevant live GameResults
- Local sync status

### Primary Action
#### Enter Gross Score

Creates or updates `ScoreEvent` immediately in local storage.

Sequence:
1. User taps score.
2. SQLite transaction commits.
3. UI updates.
4. Local game engine recalculates.
5. Sync mutation is queued.
6. Cloud receives change when available.

Network connectivity must not be required.

### Secondary Actions
- Correct score
- Previous hole
- Next hole
- Open advanced stats
- Open Games
- Open GPS
- Open Round menu

### UX Rules
- No confirmation modal for normal score entry.
- Score buttons should be large.
- Likely scores should be presented first.
- Numeric keyboard should rarely appear.
- Haptic confirmation should be supported.
- Undo should be available.

## 10. Advanced Hole Stats

### Purpose
Optionally collect richer golf statistics.

### Required Data
- ScoreEvent
- User tracking preferences

### Optional Fields
- putts
- fairway result
- GIR
- penalties
- bunker
- future shot data

### UX Rule
Advanced statistics must never be required merely to save a golf score.

## 11. Full Scorecard

### Purpose
Review the entire round in matrix format.

### Required Data
- All RoundPlayers
- All ScoreEvents
- Hole metadata
- Totals

### Actions
- Review
- Select cell
- Correct score if authorized

### Offline
Fully functional.

## 12. Games

### Purpose
Explain the current state of all games attached to the round.

### Required Data
For each GameInstance:
- current GameState
- GameResults
- display summary generated by module

### Actions
- Expand game
- View details

Admin may additionally:
- adjust configuration if module permits mid-round edits

### UX Rule
The Games screen displays calculated results.

It does not perform game calculations itself.

## 13. GPS

### Purpose
Provide location-based golf information.

### Initial Required Data
- User position
- Current hole
- green coordinates
- selected course geometry

### Initial Actions
- View front distance
- View center distance
- View back distance

### Future Actions
- Tap-to-distance
- hazards
- shot tracking
- club suggestions
- green maps

### Failure Mode
If GPS or course geometry is unavailable:
Score entry remains fully functional.

## 14. Round Menu

### Purpose
Contain functions that are important but not part of routine hole-by-hole scoring.

### Items
- Full Scorecard
- Players
- Teams
- Games
- Course
- Sync Status

Admin-only:
- Edit Round
- Correct Scores
- Finish Round

### UX Rule
Rare actions belong here rather than cluttering Score.

## 15. Finish Round / Round Check

### Purpose
Validate the round before finalization.

### Required Checks
- Missing required scores
- Invalid game configurations
- Unresolved score conflicts
- Unresolved game ties
- Incomplete game state

### Actions
- Fix issue
- Resolve tie
- Return to round
- Finalize

### State Change
Round:
`ACTIVE → FINALIZING → COMPLETE`

Finalization should be idempotent.

Running it twice must not duplicate ledger entries.

## 16. Results

### Purpose
Present winners clearly.

### Required Data
- Final GameResults
- Player/team results
- Score summary

### Actions
- View Settlement
- View Full Scorecard
- Share Results
- Done

### UX Rule
Make this screen visually suitable for screenshots and sharing.

## 17. Settlement

### Purpose
Tell each golfer the smallest useful set of obligations.

### Required Data
`LedgerEntries`

### Default View
Show:
- user receives
- user owes
- net

### Advanced View
Full Ledger Matrix

### Critical Rule
Ledger calculations consume game outputs.

Game modules do not transfer money and do not directly process payment.

## 18. Round History

### Required Data
Completed rounds for:
- user
- optional Faction filter

### Actions
- Open completed round
- View scorecard
- View results
- View settlement
- View statistics

## 19. Me

### Required Data
- Profile
- Handicap
- preferred tees
- tracking preferences
- groups
- subscription entitlement

### Actions
- Edit profile
- Set preferred tee
- Set statistics preference
- View history
- Manage subscription
- App settings

## 20. Universal Screen Contract Rules

Every screen must explicitly define:

### Loading State
What appears before local/cloud data is ready.

### Empty State
What appears when valid data does not exist.

### Offline State
What still works.

### Error State
What failed and whether user data is safe.

### Permission State
What members, organizers and admins can do.

### Navigation Exit
Where Back goes.

### Accessibility
Touch targets, contrast and readable labels.

No production screen is complete without these states.
