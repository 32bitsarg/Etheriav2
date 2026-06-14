import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { getSeasonState, initializeSeasonState, advanceSeason } from '../domain/seasons.js';
import { LOCAL_WORLD_ZONE_CONFIGS, resolveWorldZone } from '../domain/worldZoneConfigData.js';
import { getWorldConfig } from '../domain/worldConfig.js';
import { getSeasonDurationHours, LOCAL_SEASON_CONFIG } from '../domain/seasonConfigData.js';
import type { Season, WorldZoneSnapshot, UnitType } from '@etheria/shared';
import { getAllActiveCamps, getBarbarianCampDetail, fetchCurrentSeasonState } from '../domain/barbarians.js';
import { requireAdmin } from '../infrastructure/adminMiddleware.js';
import { calculateEstimatedReward } from '../domain/barbarianRewardConfigData.js';
import {
  getWinterPressureSummary,
  DEFAULT_WINTER_PRESSURE_CONFIG,
  ZONE_WINTER_INTENSITY,
} from '../domain/winterPressure.js';
import { AttackBarbarianRequestSchema } from '@etheria/shared';
import { ScoutTargetRequestSchema } from '@etheria/shared';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { calculatePathSpeedMultiplier } from '../domain/worldTerrainConfigData.js';
import { ensureWorldTerrain, invalidateWorldTerrain } from '../domain/worldTerrainRuntime.js';
import { repairWorldEntityPlacements } from '../domain/worldTerrainRepair.js';
import { getUnitStats } from '../domain/units.js';
import { calculateTechBonuses } from '../domain/techs.js';
import { calculateEffectiveProduction } from '../domain/production.js';
import { scoutTarget } from '../domain/scouting.js';
import { listActiveWorlds, getWorldById, ensureDefaultWorld } from '../domain/worldService.js';
import { prisma } from '@etheria/database';

const genId = () => crypto.randomUUID();

export const worldRouter = new Hono();

export const worldsRouter = new Hono();

// ─── GET /worlds — list available worlds ───

worldsRouter.get('/', async (c) => {
  const worlds = await listActiveWorlds();
  return c.json({ worlds });
});

// ─── GET /worlds/:id/config — get world config ───

worldsRouter.get('/:id/config', async (c) => {
  const id = c.req.param('id');
  const world = await getWorldById(id);
  if (!world) return c.json({ error: 'World not found' }, 404);
  return c.json({ config: world.config });
});

worldRouter.post('/scout', requireMatecitoAuth(), zValidator('json', ScoutTargetRequestSchema), async (c) => {
  const result = await scoutTarget(c.get('userId'), c.req.valid('json'));
  if ('error' in result) return c.json({ error: result.error }, result.status as any);
  return c.json(result);
});

// ─── GET /world/season ───

worldRouter.get('/season', async (c) => {
  const worldId = c.req.query('worldId');
  let state = worldId ? await getSeasonState(worldId) : await getSeasonState();
  if (!state) {
    state = await initializeSeasonState(worldId);
  }

  return c.json({ season: state });
});

// ─── GET /world/state ───

worldRouter.get('/state', async (c) => {
  const worldId = c.req.query('worldId');
  let state = worldId ? await getSeasonState(worldId) : await getSeasonState();
  if (!state) {
    state = await initializeSeasonState(worldId);
  }

  const worldConfig = await getWorldConfig(worldId);
  const zones: WorldZoneSnapshot[] = LOCAL_WORLD_ZONE_CONFIGS.map((zone) => ({
    id: zone.id,
    name: zone.name,
    currentIntensity: zone.seasonIntensity[state.currentSeason as Season] ?? 1.0,
    terrainTags: zone.terrainTags,
  }));

  const camps = await getAllActiveCamps(worldId);
  const barbarianCamps = camps.map((camp) => ({
    id: camp.id,
    name: camp.name,
    level: camp.level,
    archetype: camp.archetype,
    posX: camp.posX,
    posY: camp.posY,
    status: camp.status,
    estimatedPower: Math.floor(100 + 50 * (camp.level - 1)),
  }));

  return c.json({
    season: state,
    zones,
    barbarianCamps,
  });
});

// ─── POST /admin/world — create world (admin) ───

worldRouter.post('/admin/world', requireAdmin(), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') : null;
  if (!slug || slug.length < 2) return c.json({ error: 'Invalid slug' }, 400);
  const name = typeof body.name === 'string' ? body.name.trim() : slug;
  const description = typeof body.description === 'string' ? body.description.trim() : null;

  await ensureDefaultWorld();

  const world = await prisma.world.create({
    data: {
      id: crypto.randomUUID(),
      slug,
      name,
      description,
      status: body.status ?? 'ACTIVE',
      config: body.config ?? {},
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 99,
      playerCount: 0,
    },
  });

  return c.json({ world: { id: world.id, slug: world.slug, name: world.name } }, 201);
});

// ─── PUT /admin/world/:id/config — update world config (admin) ───

worldRouter.put('/admin/world/:id/config', requireAdmin(), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  if (!body.config) return c.json({ error: 'Missing config' }, 400);

  const existing = await prisma.world.findUnique({ where: { id } });
  if (!existing) return c.json({ error: 'World not found' }, 404);

  await prisma.world.update({
    where: { id },
    data: {
      config: body.config,
      name: typeof body.name === 'string' ? body.name : existing.name,
      description: typeof body.description === 'string' ? body.description : existing.description,
      status: typeof body.status === 'string' ? body.status : existing.status,
    },
  });

  return c.json({ success: true });
});

// ─── POST /admin/world/season/advance ───

worldRouter.post('/admin/season/advance', requireAdmin(), async (c) => {
  const state = await advanceSeason();
  return c.json({ season: state });
});

// ─── GET /world/config ───

worldRouter.get('/config', async (c) => {
  const worldId = c.req.query('worldId');
  const worldConfig = await getWorldConfig(worldId);

  return c.json({
    worldId: worldId ?? null,
    map: worldConfig.map,
    spawn: worldConfig.spawn,
    seasonConfig: {
      serverSpeed: LOCAL_SEASON_CONFIG.serverSpeed,
      seasonDurationHours: getSeasonDurationHours(),
      transitionDurationHours: LOCAL_SEASON_CONFIG.transitionDurationHours,
      phaseCurve: LOCAL_SEASON_CONFIG.phaseCurve,
      enabled: LOCAL_SEASON_CONFIG.enabled,
    },
    zones: LOCAL_WORLD_ZONE_CONFIGS,
  });
});

// ─── GET /world/regions ───

worldRouter.get('/regions', async (c) => {
  const worldId = c.req.query('worldId');
  const terrain = await ensureWorldTerrain(worldId);
  return c.json({ regions: terrain.regions });
});

// ─── GET /world/region-map ───

worldRouter.get('/region-map', async (c) => {
  const worldId = c.req.query('worldId');
  const terrain = await ensureWorldTerrain(worldId);
  return c.json(terrain.regionMap);
});

// ─── GET /world/points-of-interest ───

worldRouter.get('/points-of-interest', async (c) => {
  const worldId = c.req.query('worldId');
  const terrain = await ensureWorldTerrain(worldId);
  return c.json({ pois: terrain.pois });
});

// ─── GET /world/barbarians ───

worldRouter.get('/barbarians', async (c) => {
  const camps = await getAllActiveCamps();
  const barbarianCamps = camps.map((camp) => ({
    id: camp.id,
    name: camp.name,
    level: camp.level,
    archetype: camp.archetype,
    posX: camp.posX,
    posY: camp.posY,
    zoneId: camp.zoneId,
    status: camp.status,
    estimatedPower: Math.floor(100 + 50 * (camp.level - 1)),
    spawnedAt: camp.spawnedAt,
  }));

  return c.json({ camps: barbarianCamps });
});

// ─── GET /world/barbarians/:id ───

worldRouter.get('/barbarians/:id', async (c) => {
  const id = c.req.param('id');
  const detail = await getBarbarianCampDetail(id);

  if (!detail) {
    return c.json({ error: 'Barbarian camp not found' }, 404);
  }

  return c.json({
    camp: detail.camp,
    army: detail.army,
    estimatedReward: detail.estimatedReward,
  });
});

// ─── POST /world/barbarians/:id/attack ───

worldRouter.post('/barbarians/:id/attack', requireMatecitoAuth(), zValidator('json', AttackBarbarianRequestSchema), async (c) => {
  const campId = c.req.param('id');
  const data = c.req.valid('json');

  // Fetch attacker city
  const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', data.cityId).getFirst() as any;
  const city = cityRes.data;
  if (!city) return c.json({ error: 'City not found' }, 404);
  if (city.userId !== c.get('userId')) return c.json({ error: 'Not your city' }, 403);

  // Fetch barbarian camp
  const campRes = await db.from(COLLECTIONS.BARBARIAN_CAMPS).eq('id', campId).getFirst() as any;
  const camp = campRes.data;
  if (!camp) return c.json({ error: 'Barbarian camp not found' }, 404);
  if (camp.status !== 'ACTIVE') return c.json({ error: 'Camp is not active' }, 400);

  // Fetch barbarian army
  const armyRes = await db.from(COLLECTIONS.BARBARIAN_ARMIES).eq('campId', campId).getFirst() as any;
  const army = armyRes.data;
  if (!army) return c.json({ error: 'Barbarian army not found' }, 404);

  // Fetch attacker units
  const unitsRes = await db.from(COLLECTIONS.UNITS).eq('cityId', data.cityId).get() as any;
  const cityUnits = unitsRes.data ?? [];

  // Validate attacker has enough units
  for (const unit of data.units) {
    const available = cityUnits.find((u: any) => u.type === unit.type);
    if (!available || available.count < unit.count) {
      return c.json({ error: `Not enough ${unit.type}` }, 400);
    }
  }

  // Fetch city tech bonuses for speed calculation
  const cityTechsRes = await db.from(COLLECTIONS.CITY_TECHS).eq('cityId', data.cityId).get() as any;
  const cityTechs = cityTechsRes.data ?? [];
  const techBonuses = calculateTechBonuses(cityTechs.map((tech: any) => ({ techId: tech.techId, level: tech.level })));

  // Calculate travel time (distance from city to camp)
  const speeds = data.units.map((u) => getUnitStats(u.type as UnitType, 1, techBonuses).speed);
  const minSpeed = Math.min(...speeds);
  const distance = Math.sqrt(
    Math.pow(camp.posX - city.posX, 2) + Math.pow(camp.posY - city.posY, 2)
  );
  const world = await getWorldConfig(city.worldId);
  const terrainSpeed = calculatePathSpeedMultiplier(city.posX, city.posY, camp.posX, camp.posY, world.map.width, world.map.height);
  const travelTime = Math.max(10, Math.floor(distance / Math.max(1, minSpeed * terrainSpeed) * 60)); // seconds, min 10s

  const now = new Date();
  const arrivesAt = new Date(now.getTime() + travelTime * 1000).toISOString();
  const battleId = genId();

  // Create barbarian battle
  await db.from(COLLECTIONS.BARBARIAN_BATTLES).insert({
    id: battleId,
    attackerCityId: data.cityId,
    targetCampId: campId,
    status: 'MARCHING',
    startedAt: now.toISOString(),
    arrivesAt,
    units: data.units.map((u) => ({ type: u.type, count: u.count })),
  });

  // Subtract units from attacker city
  for (const unit of data.units) {
    const existing = cityUnits.find((u: any) => u.type === unit.type);
    if (existing) {
      await db.from(COLLECTIONS.UNITS)
        .eq('id', existing.id)
        .merge({ count: existing.count - unit.count })
        .execute();
    }
  }

  return c.json({ battleId, travelTime, arrivesAt });
});

// ─── GET /world/barbarian-alerts/:cityId ───

worldRouter.get('/barbarian-alerts/:cityId', requireMatecitoAuth(), async (c) => {
  const cityId = c.req.param('cityId');

  const ownerRes = await db.from(COLLECTIONS.CITIES).eq('id', cityId).getFirst() as any;
  if (!ownerRes.data) return c.json({ error: 'City not found' }, 404);
  if (ownerRes.data.userId !== c.get('userId')) return c.json({ error: 'Not your city' }, 403);

  const alertsRes = await db.from(COLLECTIONS.BARBARIAN_ATTACK_ALERTS)
    .eq('cityId', cityId)
    .get() as any;

  const alerts = (alertsRes.data ?? []).map((a: any) => ({
    id: a.id,
    cityId: a.cityId,
    campId: a.campId,
    campName: a.campName,
    archetype: a.archetype,
    estimatedPower: a.estimatedPower,
    arrivesAt: a.arrivesAt,
    warnedAt: a.warnedAt,
    read: a.read,
  }));

  return c.json({ alerts });
});

// ─── POST /world/barbarian-alerts/:id/read ───

worldRouter.post('/barbarian-alerts/:id/read', requireMatecitoAuth(), async (c) => {
  const id = c.req.param('id');

  const alertRes = await db.from(COLLECTIONS.BARBARIAN_ATTACK_ALERTS).eq('id', id).getFirst() as any;
  if (!alertRes.data) return c.json({ error: 'Alert not found' }, 404);
  const alertCityRes = await db.from(COLLECTIONS.CITIES).eq('id', alertRes.data.cityId).getFirst() as any;
  if (alertCityRes.data?.userId !== c.get('userId')) return c.json({ error: 'Not your alert' }, 403);

  await db.from(COLLECTIONS.BARBARIAN_ATTACK_ALERTS)
    .eq('id', id)
    .merge({ read: true })
    .execute() as any;

  return c.json({ success: true });
});

// ─── GET /world/winter-pressure/:cityId ───

worldRouter.get('/winter-pressure/:cityId', requireMatecitoAuth(), async (c) => {
  const cityId = c.req.param('cityId');

  const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', cityId).getFirst() as any;
  const city = cityRes.data;
  if (!city) return c.json({ error: 'City not found' }, 404);
  if (city.userId !== c.get('userId')) return c.json({ error: 'Not your city' }, 403);

  const worldConfig = await getWorldConfig();
  const zone = resolveWorldZone(city.posX ?? 0, city.posY ?? 0, worldConfig.map.width, worldConfig.map.height);

  const unitsRes = await db.from(COLLECTIONS.UNITS).eq('cityId', cityId).get() as any;
  const units: Record<string, number> = {};
  for (const u of unitsRes.data ?? []) {
    units[u.type] = (units[u.type] ?? 0) + u.count;
  }

  const seasonState = await fetchCurrentSeasonState();
  const isWinter = seasonState?.currentSeason === 'WINTER';

  const effective = await calculateEffectiveProduction({
    goldPerHour: city.goldPerHour ?? 0,
    woodPerHour: city.woodPerHour ?? 0,
    stonePerHour: city.stonePerHour ?? 0,
    foodPerHour: city.foodPerHour ?? 0,
  }, {
    techBonuses: city.techBonuses,
    allianceEffects: [], // Simplified for summary endpoint
    seasonState,
    cityPosX: city.posX ?? 0,
    cityPosY: city.posY ?? 0,
  });

  const summary = getWinterPressureSummary(
    city,
    effective.production.foodPerHour,
    units as any,
    DEFAULT_WINTER_PRESSURE_CONFIG
  );

  return c.json({
    cityId,
    zone: {
      id: zone.id,
      name: zone.name,
      intensity: ZONE_WINTER_INTENSITY[zone.id] ?? 1.0,
    },
    isWinter,
    currentSeason: seasonState?.currentSeason,
    hourlyConsumption: summary.hourlyConsumption,
    effectiveProduction: summary.effectiveProduction,
    netFoodPerHour: summary.netFoodPerHour,
    hoursUntilStarvation: summary.hoursUntilStarvation,
    currentFood: city.food,
    minimumReserve: DEFAULT_WINTER_PRESSURE_CONFIG.minimumFoodReserve,
    winterState: city.winterState ?? null,
    lastWinterEvaluatedAt: city.lastWinterEvaluatedAt ?? null,
  });
});

worldRouter.post('/admin/repair-terrain', requireAdmin(), async (c) => {
  const result = await repairWorldEntityPlacements();
  return c.json({ ok: true, ...result });
});

// ─── GET /world/terrain — Procedural terrain grid (RLE-compressed + elevation) ───

// Keep export for backward-compat with adminOps (will migrate to invalidateWorldTerrain)
export const terrainCache = { clear: () => {} };

worldRouter.get('/terrain', async (c) => {
  const worldId = c.req.query('worldId') ?? 'local';
  const result = await ensureWorldTerrain(worldId === 'local' ? undefined : worldId);
  return c.json(result);
});

// ─── GET /world/terrain-image — Pre-rendered terrain PNG (mobile-friendly) ───
// Renders terrain server-side with sharp, caches result in memory.
// Invalidated by /admin/ops/reset-world. Set long cache on CDN.

const terrainImageCache = new Map<string, Buffer>();

function tileHash(col: number, row: number): number {
  const n = (col * 1619 + row * 31337) | 0;
  return ((n ^ (n << 13)) ^ n) >>> 0;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// Smooth value noise for procedural biome texture (decorations baked into the map).
function vhash(x: number, y: number, s: number): number {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, s: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return vhash(ix, iy, s) * (1 - ux) * (1 - uy) + vhash(ix + 1, iy, s) * ux * (1 - uy)
    + vhash(ix, iy + 1, s) * (1 - ux) * uy + vhash(ix + 1, iy + 1, s) * ux * uy;
}

// Per-biome texture multiplier applied to the base color. Sampled in CELL-SPACE
// (continuous float cell coordinates), NOT render-pixel space, so the same world
// point yields the same texture at every LOD → no popping between tile zoom levels.
// Frequencies are the old render-pixel frequencies × 5 (the previous SCALE) so the
// visual density is unchanged. FOREST uses layered canopy noise (tree tops from above).
function biomeTexture(kind: string, cx: number, cy: number): number {
  switch (kind) {
    case "FOREST": {
      const canopy  = vnoise(cx * 1.4, cy * 1.4, 7);
      const lightNW = vnoise(cx * 3.0 - 0.28, cy * 3.0 - 0.28, 9);
      const micro   = vnoise(cx * 6.5, cy * 6.5, 13);
      if (canopy > 0.52) {
        const edgeFade = Math.min(1, (canopy - 0.52) / 0.20);
        return 0.84 + lightNW * 0.32 * edgeFade + micro * 0.06;
      }
      if (canopy > 0.41) return 0.66 + micro * 0.10;
      return 0.80 + micro * 0.14;
    }
    case "JUNGLE": {
      // Dense layered canopy — darker inside, bright edges
      const canopy = vnoise(cx * 1.8, cy * 1.8, 23);
      const under  = vnoise(cx * 4.0, cy * 4.0, 29);
      const micro  = vnoise(cx * 8.0, cy * 8.0, 31);
      if (canopy > 0.55) return 0.72 + under * 0.20 + micro * 0.05;
      if (canopy > 0.40) return 0.58 + micro * 0.12;
      return 0.78 + micro * 0.10;
    }
    case "SAVANNA": {
      // Dry grassland with scattered tree clumps
      const grass = vnoise(cx * 1.2, cy * 1.2, 37);
      const tree  = vnoise(cx * 3.5, cy * 3.5, 41);
      if (tree > 0.82) return 0.72 + grass * 0.12; // tree clump darker
      return 0.92 + grass * 0.18;
    }
    case "TAIGA": {
      // Conifer texture — alternating dark/light bands
      const conifer = vnoise(cx * 2.2, cy * 2.2, 43);
      const snow    = vnoise(cx * 5.0, cy * 5.0, 47);
      if (conifer > 0.60) return 0.68 + snow * 0.18;
      return 0.88 + snow * 0.10;
    }
    case "DESERT":
      return 1 + Math.sin(cx * 1.7 + cy * 0.5 + vnoise(cx * 0.25, cy * 0.25, 3) * 7) * 0.055
        // Rare oasis hint
        + (vnoise(cx * 0.8, cy * 0.8, 53) > 0.92 ? -0.12 : 0);
    case "MOUNTAIN": {
      // Enhanced ridges: stronger hillshade contrast + rock mottes
      const ridge  = vnoise(cx * 2.1, cy * 2.1, 5);
      const rock   = vnoise(cx * 5.0, cy * 5.0, 59);
      const mote   = rock > 0.78 ? 0.14 : (rock < 0.22 ? -0.10 : 0);
      return 1 + (ridge - 0.5) * 0.42 + mote;
    }
    case "HILLS": {
      // Rolling hills with scattered rock mottes
      const roll = vnoise(cx * 1.7, cy * 1.7, 15);
      const rock = vnoise(cx * 4.5, cy * 4.5, 61);
      const mote = rock > 0.80 ? 0.10 : 0;
      return 1 + (roll - 0.5) * 0.32 + mote;
    }
    case "SWAMP": {
      let t = 1 + (vnoise(cx * 1.1, cy * 1.1, 11) - 0.5) * 0.30;
      if (vnoise(cx * 2.5, cy * 2.5, 17) > 0.85) t *= 1.12;
      return t;
    }
    case "PLAINS": {
      // Loose tree clumps scattered over grassland
      const grass = vnoise(cx * 0.9, cy * 0.9, 13);
      const grove = vnoise(cx * 3.0, cy * 3.0, 67);
      if (grove > 0.85) return 0.80 + grass * 0.08; // tree cluster
      return 1 + (grass - 0.5) * 0.16;
    }
    case "TUNDRA":
      return 1 + (vnoise(cx * 1.0, cy * 1.0, 19) - 0.5) * 0.14;
    default:
      return 1;
  }
}

function biomeColor(kind: string, hN: number, tc: number, tr: number): [number, number, number] {
  // Gentle per-tile jitter (reduced) to avoid the speckled / blocky look.
  const j = ((tileHash(tc, tr) & 15) - 7) * 0.42;
  switch (kind) {
    case "WATER": {
      const t = Math.max(0, Math.min(1, hN / 0.19));
      return [Math.round(lerp(10, 42, t) + j), Math.round(lerp(30, 88, t) + j), Math.round(lerp(72, 140, t) + j)];
    }
    case "COAST":
      return [Math.round(198 + j), Math.round(180 + j), Math.round(126 + j)];
    case "PLAINS": {
      const t = Math.max(0, Math.min(1, (hN - 0.24) / 0.48));
      return [Math.round(lerp(78, 96, t) + j), Math.round(lerp(120, 140, t) + j), Math.round(lerp(48, 60, t) + j)];
    }
    case "FOREST": {
      const t = Math.max(0, Math.min(1, (hN - 0.24) / 0.48));
      return [Math.round(lerp(30, 50, t) + j), Math.round(lerp(74, 96, t) + j), Math.round(lerp(24, 38, t) + j)];
    }
    case "MOUNTAIN": {
      // Brown rock at the base → grey crag → snow only on the very high peaks.
      const t = Math.max(0, Math.min(1, (hN - 0.72) / 0.28));
      if (t < 0.72) {
        const u = t / 0.72;
        return [Math.round(lerp(102, 144, u) + j), Math.round(lerp(90, 138, u) + j), Math.round(lerp(76, 130, u) + j)];
      }
      const u = (t - 0.72) / 0.28;
      return [Math.round(lerp(144, 232, u) + j), Math.round(lerp(138, 236, u) + j), Math.round(lerp(130, 240, u) + j)];
    }
    case "HILLS": {
      const t = Math.max(0, Math.min(1, (hN - 0.50) / 0.30));
      // olive-brown rising to rocky tan
      return [Math.round(lerp(104, 150, t) + j), Math.round(lerp(116, 138, t) + j), Math.round(lerp(64, 88, t) + j)];
    }
    case "DESERT":
      // warm sand with subtle variation
      return [Math.round(212 + j), Math.round(190 + j), Math.round(134 + j)];
    case "SWAMP":
      // murky green-brown
      return [Math.round(78 + j), Math.round(92 + j), Math.round(58 + j)];
    case "TUNDRA": {
      const t = Math.max(0, Math.min(1, (hN - 0.20) / 0.45));
      return [Math.round(lerp(158, 196, t) + j), Math.round(lerp(164, 202, t) + j), Math.round(lerp(150, 196, t) + j)];
    }
    case "JUNGLE": {
      // Deep saturated green, darker than forest
      const t = Math.max(0, Math.min(1, (hN - 0.24) / 0.40));
      return [Math.round(lerp(18, 36, t) + j), Math.round(lerp(68, 90, t) + j), Math.round(lerp(24, 42, t) + j)];
    }
    case "SAVANNA": {
      // Warm dry gold-green
      const t = Math.max(0, Math.min(1, (hN - 0.24) / 0.40));
      return [Math.round(lerp(168, 186, t) + j), Math.round(lerp(154, 172, t) + j), Math.round(lerp(60, 78, t) + j)];
    }
    case "TAIGA": {
      // Cold blue-green conifer
      const t = Math.max(0, Math.min(1, (hN - 0.22) / 0.42));
      return [Math.round(lerp(42, 60, t) + j), Math.round(lerp(74, 98, t) + j), Math.round(lerp(62, 78, t) + j)];
    }
    default:
      return [80, 80, 80];
  }
}

// Bilinear height sampler in cell-space (clamped at edges).
function heightAt(heights: Buffer, cols: number, rows: number, c: number, r: number): number {
  const cc = c < 0 ? 0 : c >= cols ? cols - 1 : c;
  const rr = r < 0 ? 0 : r >= rows ? rows - 1 : r;
  return heights[rr * cols + cc];
}
function sampleHeight(heights: Buffer, cols: number, rows: number, fx: number, fy: number): number {
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const h00 = heightAt(heights, cols, rows, x0, y0);
  const h10 = heightAt(heights, cols, rows, x0 + 1, y0);
  const h01 = heightAt(heights, cols, rows, x0, y0 + 1);
  const h11 = heightAt(heights, cols, rows, x0 + 1, y0 + 1);
  return h00 * (1 - tx) * (1 - ty) + h10 * tx * (1 - ty) + h01 * (1 - tx) * ty + h11 * tx * ty;
}

// Shared per-pixel terrain shading. Inputs are continuous CELL-SPACE coordinates so
// the result is identical for a given world point at every LOD (no tile popping).
// Returns [r,g,b] in 0..255. Used by both the overview image and the tile renderer.
function terrainPixelRGB(cells: string[], heights: Buffer, cols: number, rows: number, cellXf: number, cellYf: number): [number, number, number] {
  const col = cellXf < 0 ? 0 : cellXf >= cols ? cols - 1 : Math.floor(cellXf);
  const row = cellYf < 0 ? 0 : cellYf >= rows ? rows - 1 : Math.floor(cellYf);
  const kind = cells[row * cols + col] ?? 'PLAINS';

  const hVal = sampleHeight(heights, cols, rows, cellXf, cellYf);
  // Smooth hillshade: gradient of bilinear height over ±0.5 cell (NW light).
  const hL = sampleHeight(heights, cols, rows, cellXf - 0.5, cellYf);
  const hR = sampleHeight(heights, cols, rows, cellXf + 0.5, cellYf);
  const hU = sampleHeight(heights, cols, rows, cellXf, cellYf - 0.5);
  const hD = sampleHeight(heights, cols, rows, cellXf, cellYf + 0.5);
  let shade = Math.min(1.34, Math.max(0.68, 1 + ((hR - hL) - (hD - hU)) * 0.020));
  // Valley occlusion: darken pits (surrounded by higher terrain) for readable relief.
  const occ = (hL + hR + hU + hD) / 4 - hVal;
  if (occ > 0) shade *= 1 - Math.min(0.12, occ * 0.012);

  const mod = shade * biomeTexture(kind, cellXf, cellYf);
  let [r, g, b] = biomeColor(kind, hVal / 100, col, row);
  r *= mod; g *= mod; b *= mod;

  // Saturation boost (1.18×) + mild S-curve contrast.
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  r = gray + (r - gray) * 1.18; g = gray + (g - gray) * 1.18; b = gray + (b - gray) * 1.18;
  const sc = (v: number) => { const t = Math.max(0, Math.min(1, v / 255)); return (t * t * (3 - 2 * t) * 0.25 + t * 0.75) * 255; };
  r = sc(r); g = sc(g); b = sc(b);

  // Vignette from normalized world position (continuous across tiles).
  const nx = 2 * cellXf / cols - 1, ny = 2 * cellYf / rows - 1;
  const dist = Math.sqrt(nx * nx + ny * ny) / Math.SQRT2;
  const t = Math.max(0, (dist - 0.25) / 0.75);
  const darkness = t * t * 0.38;
  r *= 1 - darkness; g *= 1 - darkness; b *= 1 - darkness;

  return [
    r < 0 ? 0 : r > 255 ? 255 : Math.round(r),
    g < 0 ? 0 : g > 255 ? 255 : Math.round(g),
    b < 0 ? 0 : b > 255 ? 255 : Math.round(b),
  ];
}

// Decode terrain RLE+elev into flat cells[] + heights Buffer (memoized per world).
const decodedTerrainCache = new Map<string, { cells: string[]; heights: Buffer; cols: number; rows: number }>();
async function getDecodedTerrain(worldId: string) {
  const key = worldId;
  let dec = decodedTerrainCache.get(key);
  if (!dec) {
    const terrain = await ensureWorldTerrain(worldId === 'local' ? undefined : worldId);
    const cells: string[] = [];
    for (const [kind, count] of terrain.rle) {
      for (let i = 0; i < count; i++) cells.push(kind);
    }
    dec = { cells, heights: Buffer.from(terrain.elev, 'base64'), cols: terrain.cols, rows: terrain.rows };
    decodedTerrainCache.set(key, dec);
  }
  return dec;
}

worldRouter.get('/terrain-image', async (c) => {
  const worldId = c.req.query('worldId') ?? 'local';
  const variant = c.req.query('variant') ?? 'default'; // 'default' | 'mobile'
  const cacheKey = `${worldId}:${variant}`;

  if (!terrainImageCache.has(cacheKey)) {
    const { default: sharp } = await import('sharp');
    const { cells, heights, cols, rows } = await getDecodedTerrain(worldId);

    // Adaptive scale: cap render size so we don't blow memory at large grids.
    // At 2200 cols SCALE=1 → 2200² render (4.8M px), previously fixed at 3 (6600²=43M).
    const SCALE = Math.max(1, Math.round(2600 / cols));
    const imgW = cols * SCALE;
    const imgH = rows * SCALE;
    const raw = Buffer.alloc(imgW * imgH * 3);

    for (let py = 0; py < imgH; py++) {
      const cellYf = py / SCALE;
      for (let px = 0; px < imgW; px++) {
        const [r, g, b] = terrainPixelRGB(cells, heights, cols, rows, px / SCALE, cellYf);
        const idx = (py * imgW + px) * 3;
        raw[idx] = r; raw[idx + 1] = g; raw[idx + 2] = b;
      }
    }

    const targetSize = variant === 'mobile' ? 1600 : 2600;
    const blurAmount = variant === 'mobile' ? 0.3 : 0.2;
    const quality = variant === 'mobile' ? 72 : 80;

    const webpBuf = await sharp(raw, { raw: { width: imgW, height: imgH, channels: 3 } })
      .resize(targetSize, targetSize, { kernel: 'lanczos3' })
      .blur(blurAmount)
      .webp({ quality, effort: 4 })
      .toBuffer();

    terrainImageCache.set(cacheKey, webpBuf);
  }

  const buf = terrainImageCache.get(cacheKey)!;
  return new Response(buf.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(buf.length),
    },
  });
});

// ─── GET /world/terrain-tile/:z/:x/:y — LOD tile (slippy-map) ───
// World is square; at level z it is split into 2^z × 2^z tiles, each TILE_PX wide.
// Rendered on-demand at 2× supersample, downscaled with lanczos3, cached LRU.

const TILE_PX = 256;
const TILE_ZMAX = 9;
const TILE_SS = 2; // supersample factor
const TILE_CACHE_MAX = 1200;
const terrainTileCache = new Map<string, Buffer>(); // insertion-ordered → LRU

worldRouter.get('/terrain-tile/:z/:x/:y', async (c) => {
  const worldId = c.req.query('worldId') ?? 'local';
  const z = Number(c.req.param('z'));
  const tx = Number(c.req.param('x'));
  const ty = Number(c.req.param('y').replace(/\.webp$/, ''));
  const span = 1 << z; // 2^z
  if (!Number.isInteger(z) || z < 0 || z > TILE_ZMAX
    || !Number.isInteger(tx) || tx < 0 || tx >= span
    || !Number.isInteger(ty) || ty < 0 || ty >= span) {
    return c.json({ error: 'bad tile coords' }, 400);
  }

  const cacheKey = `${worldId}:${z}:${tx}:${ty}`;
  let buf = terrainTileCache.get(cacheKey);
  if (buf) {
    // LRU bump
    terrainTileCache.delete(cacheKey);
    terrainTileCache.set(cacheKey, buf);
  } else {
    const { default: sharp } = await import('sharp');
    const { cells, heights, cols, rows } = await getDecodedTerrain(worldId);

    // Tile covers cell-space range [tx,tx+1)*cols/span on each axis.
    const cellsPerTile = cols / span; // cols === rows (square world)
    const cell0X = tx * cellsPerTile;
    const cell0Y = ty * cellsPerTile;
    const dim = TILE_PX * TILE_SS;
    const raw = Buffer.alloc(dim * dim * 3);
    const step = cellsPerTile / dim; // cell-space units per output pixel

    for (let py = 0; py < dim; py++) {
      const cellYf = cell0Y + (py + 0.5) * step;
      for (let px = 0; px < dim; px++) {
        const cellXf = cell0X + (px + 0.5) * step;
        const [r, g, b] = terrainPixelRGB(cells, heights, cols, rows, cellXf, cellYf);
        const idx = (py * dim + px) * 3;
        raw[idx] = r; raw[idx + 1] = g; raw[idx + 2] = b;
      }
    }

    buf = await sharp(raw, { raw: { width: dim, height: dim, channels: 3 } })
      .resize(TILE_PX, TILE_PX, { kernel: 'lanczos3' })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    terrainTileCache.set(cacheKey, buf);
    // Evict oldest if over budget.
    while (terrainTileCache.size > TILE_CACHE_MAX) {
      const oldest = terrainTileCache.keys().next().value;
      if (oldest === undefined) break;
      terrainTileCache.delete(oldest);
    }
  }

  return new Response(buf.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(buf.length),
    },
  });
});

export function invalidateTerrainImageCache(worldId?: string) {
  if (worldId) {
    terrainImageCache.delete(worldId);
    decodedTerrainCache.delete(worldId);
    for (const k of [...terrainTileCache.keys()]) {
      if (k.startsWith(`${worldId}:`)) terrainTileCache.delete(k);
    }
  } else {
    terrainImageCache.clear();
    decodedTerrainCache.clear();
    terrainTileCache.clear();
  }
}
