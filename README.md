# FairwayFaction

_Golf with your crew. Without the chaos._ A mobile app (Expo / React Native / TypeScript) for organizing and playing group golf:
persistent groups ("Factions"), recurring rounds, fast offline-first score entry, pluggable games, and settlement.

**Status: Milestone 1 (foundation).** Navigation shell, auth foundation, local SQLite + migrations, Supabase schema + RLS,
domain models, permissions, game-module architecture (with one sample module), sync queue, and tests. Production games, score entry UI,
GPS, payments and cloud sync are later milestones.

```bash
npm install
npx expo start      # i = iOS, a = Android, or scan with Expo Go
npm run check       # typecheck + lint + tests
```

- Product & architecture source of truth: [docs/UX_SPEC.md](docs/UX_SPEC.md), [docs/SCREEN_CONTRACTS.md](docs/SCREEN_CONTRACTS.md), [docs/DOMAIN_MAP.md](docs/DOMAIN_MAP.md)
- How it is built: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- How to work on it: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- Why it is built that way: [docs/DECISIONS.md](docs/DECISIONS.md)
