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

function biomeColor(kind: string, hN: number, tc: number, tr: number): [number, number, number] {
  const j = ((tileHash(tc, tr) & 15) - 7) * 0.8;
  switch (kind) {
    case "WATER": {
      const t = Math.max(0, Math.min(1, hN / 0.19));
      return [Math.round(lerp(10, 42, t) + j), Math.round(lerp(30, 88, t) + j), Math.round(lerp(72, 140, t) + j)];
    }
    case "COAST":
      return [Math.round(196 + j), Math.round(176 + j), Math.round(116 + j)];
    case "PLAINS": {
      const t = Math.max(0, Math.min(1, (hN - 0.24) / 0.48));
      return [Math.round(lerp(64, 82, t) + j), Math.round(lerp(108, 132, t) + j), Math.round(lerp(38, 54, t) + j)];
    }
    case "FOREST": {
      const t = Math.max(0, Math.min(1, (hN - 0.24) / 0.48));
      return [Math.round(lerp(28, 46, t) + j), Math.round(lerp(66, 88, t) + j), Math.round(lerp(18, 30, t) + j)];
    }
    case "MOUNTAIN": {
      const t = Math.max(0, Math.min(1, (hN - 0.72) / 0.28));
      return [Math.round(lerp(108, 220, t) + j), Math.round(lerp(94, 218, t) + j), Math.round(lerp(80, 222, t) + j)];
    }
    default:
      return [80, 80, 80];
  }
}

worldRouter.get('/terrain-image', async (c) => {
  const worldId = c.req.query('worldId') ?? 'local';
  const cacheKey = worldId;

  if (!terrainImageCache.has(cacheKey)) {
    const { default: sharp } = await import('sharp');
    const terrain = await ensureWorldTerrain(worldId === 'local' ? undefined : worldId);

    // Decode cells from RLE
    const cells: string[] = [];
    for (const [kind, count] of terrain.rle) {
      for (let i = 0; i < count; i++) cells.push(kind);
    }
    const heights = Buffer.from(terrain.elev, 'base64');
    const { cols, rows } = terrain;

    // Render at 2×tile resolution (smooth but fast). CSS stretches to world size.
    const SCALE = 4;
    const imgW = cols * SCALE;
    const imgH = rows * SCALE;
    const raw = Buffer.alloc(imgW * imgH * 3);

    function getH(c: number, r: number): number {
      return heights[Math.max(0, Math.min(rows - 1, r)) * cols + Math.max(0, Math.min(cols - 1, c))];
    }

    for (let py = 0; py < imgH; py++) {
      const tileRow = Math.floor(py / SCALE);
      const fy = (py % SCALE) / SCALE;
      for (let px = 0; px < imgW; px++) {
        const tileCol = Math.floor(px / SCALE);
        const fx = (px % SCALE) / SCALE;
        const kind = cells[tileRow * cols + tileCol] ?? 'PLAINS';

        // Bilinear height interp
        const h00 = getH(tileCol, tileRow);
        const h10 = getH(tileCol + 1, tileRow);
        const h01 = getH(tileCol, tileRow + 1);
        const h11 = getH(tileCol + 1, tileRow + 1);
        const hVal = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;

        // Hillshading: NW light
        const dx = (getH(tileCol + 1, tileRow) - getH(tileCol - 1, tileRow)) * 0.5;
        const dy = (getH(tileCol, tileRow + 1) - getH(tileCol, tileRow - 1)) * 0.5;
        const shade = Math.min(1.28, Math.max(0.72, 1 + (dx - dy) * 0.016));

        let [r, g, b] = biomeColor(kind, hVal / 100, tileCol, tileRow);
        r = Math.min(255, Math.max(0, Math.round(r * shade)));
        g = Math.min(255, Math.max(0, Math.round(g * shade)));
        b = Math.min(255, Math.max(0, Math.round(b * shade)));

        const idx = (py * imgW + px) * 3;
        raw[idx] = r; raw[idx + 1] = g; raw[idx + 2] = b;
      }
    }

    // Vignette pass
    const cx = imgW / 2, cy = imgH / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    for (let py = 0; py < imgH; py++) {
      for (let px = 0; px < imgW; px++) {
        const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
        const t = Math.max(0, (dist / maxR - 0.25) / 0.75);
        const darkness = t * t * 0.38;
        const idx = (py * imgW + px) * 3;
        raw[idx]     = Math.round(raw[idx]     * (1 - darkness));
        raw[idx + 1] = Math.round(raw[idx + 1] * (1 - darkness));
        raw[idx + 2] = Math.round(raw[idx + 2] * (1 - darkness));
      }
    }

    const webpBuf = await sharp(raw, { raw: { width: imgW, height: imgH, channels: 3 } })
      .webp({ quality: 82, effort: 4 })
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

export function invalidateTerrainImageCache(worldId?: string) {
  if (worldId) terrainImageCache.delete(worldId);
  else terrainImageCache.clear();
}
