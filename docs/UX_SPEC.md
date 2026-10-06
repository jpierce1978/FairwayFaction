# FairwayFaction — UX & Navigation Specification v0.1

## 1. Product Experience Goal

FairwayFaction should make organizing and playing group golf feel dramatically easier than using spreadsheets, text-message threads, paper scorecards, or traditional golf apps.

The application should support extremely sophisticated games and group structures without making the everyday golfer experience feel sophisticated.

The central UX principle is:

**Complex underneath. Simple on the surface.**

The user should rarely need to understand how FairwayFaction works internally.

They should simply be able to:

1. Open the app.
2. See what matters today.
3. Join or start the round.
4. Enter scores quickly.
5. See where the games stand.
6. Finish the round.
7. See who won and what is owed.

## 2. Core Product Principles

### 2.1 Configure Once, Confirm Often

Persistent groups should remember:

- usual course
- normal tee time
- preferred tees
- regular players
- default teams or team rules
- favorite games
- game configurations
- settlement values
- tiebreak rules
- scoring preferences

Starting a recurring Saturday round should require confirmation rather than recreation.

The primary question should be:

**“Anything different today?”**

not:

**“Please configure everything again.”**

### 2.2 Score Once

A golfer's golf score is entered one time.

That score feeds:

- team competitions
- skins
- Nassau
- Wolf
- dots/trash
- leaderboards
- statistics
- handicaps
- post-round settlement

Individual games must never require duplicate score entry.

### 2.3 Common Actions Are One Tap

During golf, frequently used actions should require one tap whenever practical.

Examples:

- Enter score
- Move to next hole
- Change hole
- View GPS
- See game status
- Correct a score

Advanced or infrequently used options may take additional interaction.

### 2.4 Playing Mode Is Sacred

Once the round begins, FairwayFaction should stop behaving like an administration application.

The interface becomes optimized for:

- outdoor visibility
- large touch targets
- minimal typing
- one-handed use
- fast navigation
- unreliable connectivity
- quick understanding

Administrative controls should largely disappear while playing.

### 2.5 Progressive Complexity

FairwayFaction should not expose every capability merely because it exists.

Example:

A golfer who only wants to enter scores should see:

**Score: 3 / 4 / 5 / 6 / +**

A golfer who enables advanced statistics may additionally see:

- fairway
- GIR
- putts
- penalties
- bunker
- shot tracking

The basic experience must remain clean.

### 2.6 Remember the User

FairwayFaction should learn stable preferences.

Examples:

- JP normally plays White tees.
- Paul normally plays Blue tees.
- Saturday Golf normally plays Surrey Hills.
- Saturday Golf normally uses the same four competitions.
- Leah normally enters scores for her foursome.

These values should auto-populate while remaining editable.

## 3. Primary Application Structure

The normal application navigation will contain only four primary destinations:

### Home
What's happening now or next.

### Play
Rounds, courses, invitations and starting golf.

### Groups
Persistent golf crews / Factions.

### Me
Profile, handicap, statistics, preferences and settings.

Primary navigation should remain deliberately shallow.

## 4. Contextual Navigation During a Round

Once a user enters an active round, the normal app navigation should temporarily be replaced by:

### Score
Primary score entry.

### Games
Current game standings and side competitions.

### GPS
Hole map, distances and course information.

### Round
Players, teams, scorecard, settings and round information.

The golfer should never need to return to the normal Home screen to accomplish an in-round task.

## 5. User Types

FairwayFaction should support different levels of complexity without explicitly turning the application into separate products.

### 5.1 Casual Player

Primary goals:

- RSVP
- see tee time
- enter score
- view leaderboard
- see results

Does not need to understand configuration.

### 5.2 Regular Group Member

Primary goals:

- everything Casual Player does
- view history
- see group standings
- participate in multiple games
- track statistics
- view settlement

### 5.3 Round Organizer

Primary goals:

- select players
- assign teams
- configure games
- adjust tees
- start round
- handle unusual situations
- finalize round

### 5.4 Faction Administrator

Primary goals:

- manage membership
- establish defaults
- configure recurring rounds
- maintain group rules
- manage seasons
- manage permissions

A user may hold several roles.

## 6. First Launch Experience

The first-launch experience must avoid turning into a questionnaire.

### Screen 1 — Welcome

**FairwayFaction**

*Golf with your crew. Without the chaos.*

Primary action:

**Get Started**

Secondary:

**I already have an account**

### Screen 2 — Identity

Allow:

- Apple
- Google
- Email

Future authentication methods can be added without redesigning onboarding.

### Screen 3 — Basic Profile

Ask only:

- Name
- Display name
- Optional profile picture

Optional:

- Handicap

Do not require:

- GHIN
- home course
- detailed statistics
- payment information
- notification customization

Those can come later.

### Screen 4 — Intent

Ask:

**How are you getting started?**

Options:

- Join a golf group
- Create a golf group
- Just keep my own scores

Users can always change later.

This primarily determines the next screen rather than permanently categorizing them.

## 7. Joining a Faction

Joining should require almost no configuration.

Possible mechanisms:

- invitation link
- QR code
- short invite code
- phone contact invitation
- email invitation

Example:

**Saturday Golf**

Surrey Hills  
Saturday • 1:00 PM  
18 members

**Join Group**

After joining:

**You're in.**

Then return directly to Home.

No unnecessary setup wizard.

## 8. Creating a Faction

Creation should initially request only:

### Group Name

Example:

**Saturday Golf**

### Optional Home Course

Example:

**Surrey Hills Golf Club**

### Visibility

- Private
- Invite Only

Public groups can be considered later.

Then:

**Create Faction**

Everything else becomes optional configuration after creation.

## 9. Faction Home Screen

Example:

```text
SATURDAY GOLF

Next Round
Saturday • 1:00 PM
Surrey Hills

13 Going

[ I'M IN ]    [ CAN'T PLAY ]

------------------------------

TODAY
Teams will be created at 12:45 PM

[ View Round ]

------------------------------

Standings
1. JP
2. Paul
3. Leah

------------------------------

Recent Round
Sep 28
12 Players

Team JP won $40 equivalent
```

Admin users additionally see:

**Manage**

The screen should prioritize the next event rather than expose administrative menus.

## 10. Recurring Round Model

Factions may define recurring round templates.

Example:

### Saturday Golf Default Round

Course:
Surrey Hills

Schedule:
Saturday • 1:00 PM

Default Game:
Saturday Best Ball

Maximum Settlement:
$20/player

Default Tees:
Player preference

RSVP Deadline:
Optional

Team Assignment:
Randomized

A scheduled round inherits these values automatically.

## 11. Home Screen

Home should answer:

**What do I need to care about right now?**

Example:

```text
Good morning, JP

NEXT ROUND

Saturday Golf
Today • 1:00 PM
Surrey Hills

13 Players

[ VIEW ROUND ]

----------------------------

YOUR GROUPS

Saturday Golf
13 going

Family Scramble
Next round Oct 18

----------------------------

RECENT

Sep 28
74 • Surrey Hills
Won 2 competitions
```

If there is an active round, it takes precedence:

```text
ROUND IN PROGRESS

Saturday Golf
Hole 7

[ RETURN TO ROUND ]
```

## 12. Play Screen

The Play section handles golf activity rather than social organization.

Primary options:

### Start Round

### Upcoming

### Round History

### Courses

The default view emphasizes the next or active round.

## 13. Start Round Experience

There will be two primary paths.

### 13.1 Quick Start

For recurring groups.

Example:

```text
SATURDAY GOLF

Surrey Hills
Today • 1:00 PM

12 Players
Saturday Game + Skins
Player Preferred Tees

Everything look right?

[ START ROUND ]

Change Players
Change Teams
Change Games
More Options
```

The entire recurring-group setup can potentially take one tap.

### 13.2 New Round

For ad hoc golf.

Initial screen:

**Where are you playing?**

Then:

**Who's playing?**

Then:

**What are you playing?**

Then:

**Ready?**

This is progressive setup, not a traditional wizard full of forms.

## 14. Round Setup Screen

Instead of many pages, use a summary configuration screen.

Example:

```text
TODAY'S ROUND

Surrey Hills
White / Mixed Tees
18 Holes

Players                         12  >
Teams                         Ready >
Games       Saturday Game + Skins  >
Tees                          Mixed >
Scoring                       Gross >

-----------------------------------

[ START ROUND ]
```

Every row is editable.

Nothing must be opened unless something needs changing.

## 15. Player Selection

Player list prioritizes:

1. RSVP Yes
2. Regular members
3. Invited guests
4. Add Guest

Example:

```text
PLAYERS

✓ JP
✓ Paul
✓ Leah
✓ Enrique
✓ Bob
✓ Mike

○ Steve
○ James

[ + ADD GUEST ]

12 Players Selected

[ DONE ]
```

No dropdowns.

No tiny checkboxes.

Large touch targets.

## 16. Team Assignment

Team screen supports:

- automatic randomization
- manual teams
- saved teams
- handicap balancing later

Example:

```text
TEAMS

TEAM 1
JP
Paul
Leah
Bob

TEAM 2
Mike
Steve
James
Enrique

TEAM 3
...

[ RANDOMIZE ]

[ EDIT TEAMS ]

[ ACCEPT ]
```

Future:

**Balanced Teams**

based upon handicap or performance.

## 17. Game Selection

Games should appear as cards.

Example:

```text
GAMES

✓ Saturday Best Ball
  Your group's normal game

✓ Skins
  $1 equivalent • Carryovers

○ Nassau
  Front • Back • Overall

○ Wolf

○ Dots / Trash

[ + ADD GAME ]
```

Selecting a game exposes only its essential configuration.

## 18. Favorite Game Presets

This is critical.

Groups should be able to save complex configurations as presets.

Example:

**Saturday Game**

Configuration:

- 4-player teams
- gross scores
- 2 best balls
- Front Competition #1
- Front Competition #2
- Back Competition #1
- Back Competition #2
- $5 equivalent per competition
- $20 maximum exposure
- Last 6 → Last 3 → Last 1 tiebreak

Starting future rounds simply selects:

**Saturday Game**

No reconstruction.

## 19. Live Score Screen

This is the highest-priority UX in FairwayFaction.

Example:

```text
<      HOLE 6 • PAR 4 • HCP 8       >

White Tees • 391 yds


JP
E thru 5

[ 3 ] [ 4 ] [ 5 ] [ 6 ] [ + ]


Paul
+2 thru 5

[ 3 ] [ 4 ] [ 5 ] [ 6 ] [ + ]


Leah
-1 thru 5

[ 3 ] [ 4 ] [ 5 ] [ 6 ] [ + ]


Enrique
+3 thru 5

[ 3 ] [ 4 ] [ 5 ] [ 6 ] [ + ]


-----------------------------------

GAME STATUS

Team JP                -1
Skin              3 Carry
Front #1              JP

[ NEXT HOLE ]
```

## 20. Intelligent Score Buttons

Score buttons should adapt to par.

### Par 3
2 • 3 • 4 • 5 • +

### Par 4
3 • 4 • 5 • 6 • +

### Par 5
4 • 5 • 6 • 7 • +

Selecting **+** opens less-common scores.

## 21. Score Confirmation Behavior

Entering a normal score should not produce a confirmation dialog.

Tap:

**4**

Result:

Score recorded immediately.

The UI provides:

- visual confirmation
- haptic feedback
- undo capability

Undo is superior to confirmation for frequent actions.

## 22. Automatic Hole Advancement

When every required player's score is entered:

Display:

**Hole Complete**

Then either:

- automatically advance after a brief delay
- allow immediate Next Hole
- respect user preference

Default behavior should be tested with real golfers before locking it permanently.

## 23. Foursome Scoring

A scorer may be responsible for only their group.

The screen should default to the players in that foursome.

Other foursomes synchronize independently.

An administrator can view the entire round.

## 24. Advanced Stats

Disabled by default.

When enabled, tapping a recorded score may reveal:

```text
JP — Hole 6 — 4

Fairway
[ LEFT ] [ HIT ] [ RIGHT ]

GIR
[ YES ] [ NO ]

Putts
[ 1 ] [ 2 ] [ 3 ] [ + ]

Penalty
[ + ]

[ DONE ]
```

Advanced statistics must never slow down basic scoring for users who do not want them.

## 25. Game Status Strip

The score screen should expose condensed relevant game information without forcing navigation.

Example:

```text
GAME STATUS

Best Ball
Team JP -1

Skins
Carry: 3

Nassau
Front: JP 1 Up
```

Tap the strip to open Games.

## 26. Games Screen

Example:

```text
GAMES

SATURDAY BEST BALL

Front #1
Team JP             -2

Front #2
Team Paul           -1

--------------------------

SKINS

Carry               3
Last Winner          Leah • Hole 2

--------------------------

NASSAU

Front
JP / Paul            JP 1 Up
```

Games update immediately when scores change.

## 27. GPS Screen

GPS should eventually support:

- current position
- front / center / back green distances
- hazard distances
- layup targets
- hole map
- tap-to-distance
- selected target

Initial GPS MVP should remain intentionally simple.

## 28. Round Screen

Contains less frequently accessed round information:

### Scorecard
### Players
### Teams
### Games
### Round Settings
### Course
### Sync Status
### Leave Round

Admin-only options:

### Edit Round
### Manage Players
### Correct Scores
### End Round

## 29. Offline Experience

Users should rarely need to think about connectivity.

Normal state:
No connectivity indicator.

Poor or no connection:
Small status indicator:

**Offline • Scores saved**

When connectivity returns:

**Synced**

Scores must remain usable even with zero cellular service.

## 30. Score Conflict Experience

If two devices edit the same player's hole:

```text
Score Conflict

Hole 7 • Paul

JP entered: 5
Paul entered: 4

Which score is correct?

[ 4 ]   [ 5 ]
```

Conflict resolution should be rare and obvious.

## 31. End Round Flow

Admin selects:

**Finish Round**

System checks:

- missing scores
- unresolved games
- unresolved ties
- conflicting entries

Example:

```text
ROUND CHECK

✓ All scores entered

✓ Teams complete

! Front #2 requires tiebreak

✓ Skins complete

[ RESOLVE TIE ]

[ FINISH ROUND ]
```

The app should never silently invent a result.

## 32. Post-Round Results

Example:

```text
ROUND COMPLETE

Saturday Golf
Surrey Hills

--------------------------

WINNERS

Front #1
Team JP

Front #2
Team Paul

Back #1
Team JP

Back #2
Team JP

--------------------------

SKINS

JP        3
Paul      1
Leah      2

--------------------------

SETTLEMENT

JP receives           30
Paul owes             10
Leah owes             10
Bob owes              10

[ SHARE RESULTS ]
```

Use neutral accounting terminology internally.

The application calculates obligations.

It does not initially collect or distribute money.

## 33. Settlement Experience

The default view should emphasize only actionable obligations.

Not a giant matrix unless requested.

Example:

```text
SETTLEMENT

You receive:

Paul        10
Leah        5

You owe:

Enrique     5

Net:
+10
```

Advanced users can view:

**Full Ledger**

## 34. Round History

Example:

```text
ROUND HISTORY

Oct 10
Surrey Hills
74
Won 3 / 4 competitions
+15

Oct 3
Surrey Hills
77
Won 1 / 4 competitions
-10
```

Selecting a round opens:

- scorecard
- game results
- settlement
- statistics
- participants

## 35. Faction Standings

Standings should be configurable by group.

Examples:

- wins
- points
- money equivalent
- skins
- average score
- attendance
- season points
- custom ranking

No single universal leaderboard should be forced upon every Faction.

## 36. Me Screen

Primary content:

### Profile
### Handicap
### Round History
### Statistics
### Groups
### Preferred Tees
### App Settings
### Subscription

This should not become a dumping ground for unrelated features.

## 37. Notifications

Useful notifications:

- RSVP reminder
- round starting soon
- teams posted
- invitation received
- scorecard requires completion
- final results available

Avoid noisy notifications merely to increase engagement.

## 38. Search Philosophy

Search should be used where the number of entities justifies it:

- players
- courses
- groups
- round history

Do not introduce search boxes for short lists.

## 39. Accessibility and Outdoor Usage

Design requirements:

- high contrast
- large typography options
- large tap targets
- sunlight-readable color contrast
- color must not be the only state indicator
- support dark and light themes
- avoid tiny icons without text
- support dynamic text sizing where practical

## 40. Important Empty States

Empty screens should tell the user what to do.

Bad:

**No rounds found.**

Better:

**No rounds yet.**

Create a round or join a golf group to get started.

**Start Round**

## 41. Error Philosophy

Errors should describe:

1. what happened
2. whether data is safe
3. what the user should do

Example:

Bad:

**Network Error 503**

Better:

**You're offline. Your scores are saved on this phone and will sync automatically when service returns.**

## 42. MVP Screen Inventory

### Authentication
1. Welcome
2. Sign In
3. Create Account
4. Basic Profile

### Home
5. Home

### Factions
6. Groups
7. Faction Home
8. Member List
9. Invite Member
10. Faction Settings

### Rounds
11. Play
12. Start Round
13. Player Selection
14. Team Assignment
15. Game Selection
16. Game Configuration
17. Round Review

### Active Round
18. Score
19. Games
20. GPS Placeholder / Basic GPS
21. Round Details
22. Full Scorecard

### Post Round
23. Round Check
24. Results
25. Settlement
26. Round Summary

### User
27. Me
28. Round History
29. Preferences
30. App Settings

## 43. Features Explicitly Deferred From Initial MVP

- shot-by-shot GPS tracking
- smartwatch app
- AI swing analysis
- tournament brackets
- public social feed
- public course reviews
- live video
- tee-time booking
- payment processing
- GHIN write-back
- advanced green contours
- marketplace
- advertising
- fantasy golf
- extensive achievements
- generic game rules programming language

Architectural allowances may exist for them.

They do not belong in initial implementation.

## 44. MVP Game Set

Initial game-engine validation should use:

### 1. Saturday Best Ball
Proves teams, multiple simultaneous competitions, custom tiebreaks, and unusual group-specific rules.

### 2. Skins
Proves hole-by-hole competition, carryovers, and validation rules.

### 3. Nassau
Proves match-play state and front/back/overall.

### 4. Dots / Trash
Proves event-based side scoring and configurable values.

If the architecture supports these four cleanly, it should support many future games.

## 45. Product Success Test

Before adding major new features, FairwayFaction should pass this test:

A new golfer who has never seen the app should be able to:

1. Accept an invitation.
2. RSVP.
3. Open the round.
4. Enter a score.
5. Find the game standings.
6. Finish the round.

without receiving verbal instructions.

An organizer should be able to start the group's normal weekly round in less than approximately 30 seconds.

A returning group should require almost no repetitive configuration.

## 46. Saturday Golf Replacement Test

FairwayFaction should not replace the existing Saturday Golf application until it can perform the current Saturday workflow more easily.

At minimum it must support:

- persistent group membership
- RSVP
- admins
- guests
- team generation
- 4-person teams
- two best balls
- gross scoring
- Front #1
- Front #2
- Back #1
- Back #2
- USGA-style last 6 → 3 → 1 tiebreak
- maximum player exposure
- settlement
- round history
- easy score entry

Ghost-player functionality is intentionally excluded from FairwayFaction.

The new product must be meaningfully easier to operate, not simply prettier.

## 47. North-Star UX Rule

Whenever there is a conflict between exposing more capability and making the golfer's current task easier:

**Make the current task easier.**

Advanced functionality can live one level deeper.

The golf course is not the place for software training.
