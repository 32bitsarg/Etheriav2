# Bot Player Simulation Plan

## Summary

Bots should act as live QA players, not as privileged data seeders. They must use the same gameplay services as human HTTP routes for construction, training, research, and attacks so that a running server continuously exercises the real backend rules.

The MVP uses PostgreSQL as the primary persistence layer, creates visible bot players and cities, runs from a configurable API worker, and records action metrics so failures are useful debugging signals.

## Core Principle

- Bots do not write gameplay state directly for player actions.
- Human routes and bots call the same application services.
- Bot decisions only choose intent, such as “upgrade this building” or “attack that city”.
- The shared service owns validation, resource changes, queue creation, battle creation, and error responses.
- Unexpected bot errors are treated as backend bugs or incomplete rules.

## MVP Behavior

- Profiles:
  - `ECONOMIST`: favors production, storage, and economic research.
  - `MILITARIST`: favors barracks, stable, tower, training, and moderate attacks.
  - `TECH_RUSHER`: favors library and research.
  - `BALANCED`: mixes economy, research, defense, and army growth.
- Each bot tick:
  - Ensures the configured bot population exists.
  - Loads the bot city, buildings, units, active queues, techs, battles, and possible targets.
  - Picks one action through the decision engine.
  - Executes it through the same action service used by HTTP routes.
  - Stores action logs and schedules the next tick.
- MVP actions:
  - Upgrade existing buildings.
  - Train unlocked units.
  - Start valid research.
  - Attack comparable targets with moderate aggression and cooldowns.

## Data And Observability

- `User.isBot` and `User.botProfile` mark bot players internally while keeping them visible as normal users.
- `BotPlayer` stores bot identity, profile, city, status, scheduling, and JSON state.
- `BotActionLog` stores each attempted action with status, reason, payload, and error details.
- `BotMetricsSnapshot` stores periodic aggregate metrics.
- Metrics tracked:
  - attempted actions by type,
  - successful actions,
  - expected validation blocks,
  - unexpected errors,
  - bots blocked by queue,
  - bots blocked by resources,
  - battles created,
  - battles resolved,
  - research started,
  - research completed.

## Error Classes

- `SUCCESS`: action executed and changed gameplay state.
- `EXPECTED_BLOCKED`: normal game block such as insufficient resources, active queue, missing prerequisite, no target, or cooldown.
- `VALIDATION_ERROR`: the bot selected an invalid action that the shared service rejected.
- `UNEXPECTED_ERROR`: exception, database error, impossible state, or service bug.

## Phase 2

- Add alliance-capable bot profiles.
- Reuse future shared services for creating alliances, joining alliances, proposing peace, and breaking treaties.
- Add alliance metrics for creations, joins, treaty proposals, treaty acceptances, and social errors.
- Avoid automated chat until moderation and rate limits exist.

## Test Plan

- Unit test the decision engine with representative city states for each profile.
- Verify bots never bypass the same services used by HTTP routes.
- Integration test bot provisioning, upgrade, training, research, and attack ticks.
- Run `pnpm db:pg:push` after schema changes.
- Run `pnpm --filter @etheria/api lint`.
- Let the API run for several bot cycles and inspect logs for `UNEXPECTED_ERROR`.
