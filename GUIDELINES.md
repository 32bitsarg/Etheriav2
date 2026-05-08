# Etheria Development Guidelines

## Golden Rules

### 1. Changelog-Driven Development
**Every change must be documented in CHANGELOG.md before merge.**

- Features go under `[Unreleased]` → `### Added`
- Bugfixes go under `[Unreleased]` → `### Fixed`
- Balancing changes go under `[Unreleased]` → `### Changed`
- Breaking changes go under `[Unreleased]` → `### Breaking`

**No code is "too small" to document.** If it changes player-facing behavior, document it.

#### Internal vs Public Items
Some changelog entries are for developer/audit purposes and should not appear on the public-facing changelog page. Mark these with:

1. **In `CHANGELOG.md`**: Append `` `[INTERNAL]` `` to the sub-bullet (e.g., `Agregado reporte tecnico...` `[INTERNAL]`).
2. **In `changelogData.ts`**: Add the item's key to the `internalItemKeys` array — they get filtered by frontend components (`ChangelogDetailClient` and `LatestVersionSection`).
3. **Examples of internal entries**: test coverage, technical audits, DB/infra refactors invisible to players, CI/CD changes, config-only restructures.

---

### 2. Zero Hardcoded Game Values
**All gameplay numbers must be configurable without touching source code.**

#### Where values live:

| Category | Source | Example |
|----------|--------|---------|
| Building stats | `apps/api/src/domain/buildingConfigSeedData.ts` | Cost, production, time |
| Unit stats | `apps/api/src/domain/unitConfigData.ts` | Attack, defense, speed, training cost |
| Research stats | `apps/api/src/domain/techConfigData.ts` | Bonus multipliers |
| World generation | `apps/api/src/domain/worldConfigData.ts` | Map size, resource distribution |
| Game constants | Environment variables or DB config | Max alliance members, attack cooldown |

#### Forbidden (hardcoded in source):
- `const BUILDING_COST = 500`
- `if (level > 20)` 
- `setTimeout(() => {}, 300000)`
- Magic numbers in business logic

#### Required (loaded from config):
- `getBuildingCost(type, level)` → reads from `BuildingConfig`
- `getMaxLevel(type)` → reads from `BuildingConfig`
- `getTrainingTime(type, count)` → reads from `UnitConfig`
- All formulas must use config parameters

#### How to add new configurable values:
1. Add or update the value in the local config source file
2. Update the loader/domain logic that consumes it if needed
3. Restart API to reload configs
4. Document in CHANGELOG

---

### 2.1 Mandatory i18n for Player-Facing Text
**Any new player-facing text in the game UI must use the i18n system.**

- Add keys in `apps/web/src/i18n/es.json` and `apps/web/src/i18n/en.json`
- Consume text via `useI18n()` in gameplay UI (`/play`, map, HUD, modals, panels)
- Internal developer tools (like `/editor`) are exempt unless promoted to player-facing UI

---

### 3. Grepolis-Style Direction

**Visual Style Decision: Hybrid Sprite + Rich UI**

After analyzing Grepolis and similar games, Etheria will follow this visual direction:

#### Why not pure text?
- Player retention is 3-5x higher with visual city building
- Resource management feels more tangible with visual feedback
- Grepolis itself uses 2D isometric sprites, not text

#### Why not AAA 3D?
- Development time increases 10x
- Browser performance degrades
- Art costs explode
- Iteration speed dies

#### The Sweet Spot: 2D Sprite-Based with Rich UI Overlay

```
┌─────────────────────────────────────────┐
│  [React HUD: Resources, Menus, Chat]    │  ← Rich UI layer
├─────────────────────────────────────────┤
│                                         │
│     🏛️  ⚔️   🌾                        │
│        🪨  ⛏️   🐴      ← Phaser      │  ← Sprite game layer
│     🌲  📦  📚                          │     (tilemap 64x64)
│                                         │
│  [Minimap]  [Alliance]  [Reports]       │  ← React panels
└─────────────────────────────────────────┘
```

**Phaser Layer:**
- 2D tilemap (not isometric, simpler to implement)
- 64x64 pixel sprites per building
- Camera pan/zoom (already implemented)
- Click to select, click to build
- Particle effects for completion/combat

**React Overlay Layer:**
- Resource bar (top)
- Building/Unit menus (right sidebar)
- Chat/Alliance panel (bottom)
- Reports/Notifications (left sidebar)
- Modals for detailed views

**Visual Polish Priority:**
1. Clean, readable sprites (can be simple, must be clear)
2. Smooth UI animations (Framer Motion)
3. Satisfying feedback (particles, sound, numbers floating)
4. Theme consistency (dark medieval fantasy)

---

### 4. Feature Categories

Use these tags in CHANGELOG and commit messages:

| Tag | Description | Example |
|-----|-------------|---------|
| `[CORE]` | Core gameplay mechanic | Combat, resources, buildings |
| `[UI]` | User interface | Menus, HUD, animations |
| `[BALANCE]` | Number tuning | Cost changes, production rates |
| `[INFRA]` | Technical infrastructure | Auth, database, deployment |
| `[SOCIAL]` | Multiplayer/social | Alliances, chat, mail |
| `[ECONOMY]` | Trading/market | Resource exchange, auctions |

---

### 5. Commit Convention

```
[CORE] add battle resolution with unit type advantages

- Implements rock-paper-scissors combat
- Cavalry > Archers > Warriors > Cavalry
- All multipliers loaded from UnitConfig

Refs: CHANGELOG v0.0.2
```

---

### 6. Anti-Patterns (Never Do)

1. ❌ Hardcode a game value in source code
2. ❌ Commit without CHANGELOG update
3. ❌ Direct DB queries in route handlers (use domain layer)
4. ❌ Phaser logic mixed with React state
5. ❌ Client-side resource calculation (authoritative server only)
6. ❌ Skip validation on API inputs
7. ❌ Use `any` in TypeScript

---

### 7. Balance Workflow

When the game designer says "Gold Mine produces too much":

```bash
# 1. Edit the local config file, e.g. buildingConfigSeedData.ts
# 2. Document in CHANGELOG
# 3. Restart API (reloads configs)
# 4. Done.
```

---

*These guidelines are living documents. Update them as the project evolves.*

*Last updated: 2025-04-28*
