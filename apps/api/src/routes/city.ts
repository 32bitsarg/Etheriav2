import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import {
  deleteRecordByLogicalId,
  deleteRecordBySelector,
  getRecordByLogicalId,
  mergeRecordByLogicalId,
  mergeRecordBySelector,
} from "../infrastructure/matecitoRecord.js";
import {
  calculateResources,
  canAfford,
  subtractResources,
} from "../domain/resources.js";
import {
  getBuildingCost,
  getBuildingTime,
  getBuildingMaxLevelForTownHall,
  calculateCityStats,
} from "../domain/buildings.js";
import { applyTrainingCostReduction, getUnitCost, getTrainingTime, getUnitStats } from "../domain/units.js";
import { calculateTravelTime } from "../domain/battles.js";
import {
  loadTechConfigs,
  getAllTechConfigs,
  getResearchCost,
  getResearchTime,
  canResearch,
  calculateTechBonuses,
} from "../domain/techs.js";
import {
  CreateBuildingRequestSchema,
  TrainUnitsRequestSchema,
  AttackRequestSchema,
  StartResearchRequestSchema,
  BuildingType,
  UnitType,
} from "@etheria/shared";
import { STARTER_BUILDINGS } from "../domain/cityCreation.js";
import { createStarterCityForUser } from "../domain/cityCreation.js";
import { requireMatecitoAuth } from "../infrastructure/authMiddleware.js";
import { getWorldConfig } from "../domain/worldConfig.js";
import { getAllianceMembershipForUser } from "../domain/alliances.js";
import { normalizeBuildingsByType } from "../domain/buildingNormalization.js";
import { calculateEffectiveProduction } from "../domain/production.js";
import { getSeasonState } from "../domain/seasons.js";

const genId = () => crypto.randomUUID();
const citySnapshotCache = new Map<string, { data: any; cachedAt: number }>();
const CITY_SNAPSHOT_TTL_MS = 15_000;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withDbRetry<T>(fn: () => Promise<T>, attempts: number = 3): Promise<T> {
  let lastError: unknown = null;
  for (let index = 0; index < attempts; index++) {
    try {
      const result: any = await fn();
      const error = result?.error ?? result?.err;
      if (error) {
        throw new Error(typeof error === "string" ? error : (error.message ?? JSON.stringify(error)));
      }
      return result as T;
    } catch (error) {
      lastError = error;
      await sleep(250 * (index + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function normalizeLegacyDefenseBuildings(buildings: any[]) {
  const defenseBuildings = buildings.filter((b) => b.type === "WALL" || b.type === "TOWER");
  if (defenseBuildings.length === 0) return buildings;

  const primaryTower = defenseBuildings.find((b) => b.type === "TOWER") ?? defenseBuildings[0];
  const mergedLevel = Math.max(...defenseBuildings.map((b) => b.level ?? 1));

  return [
    ...buildings.filter((b) => b.type !== "WALL" && b.type !== "TOWER"),
    { ...primaryTower, type: "TOWER", level: mergedLevel },
  ];
}

function calculateCancellationRefund(cost: { gold: number; wood: number; stone: number; food: number; gems: number }) {
  return {
    gold: Math.floor(cost.gold * 0.5),
    wood: Math.floor(cost.wood * 0.5),
    stone: Math.floor(cost.stone * 0.5),
    food: Math.floor(cost.food * 0.5),
    gems: Math.floor(cost.gems * 0.5),
  };
}

// ─── Helper: Get city with live resources ───

async function getCityWithResources(cityId: string) {
  try {
    const cityRes = await withDbRetry(() => db.from(COLLECTIONS.CITIES).eq('id', cityId).getFirst() as any, 5) as any;
    const city = cityRes.data;
    if (!city) return null;

    await reconcileExpiredBuildQueues(cityId);
    await cleanupDuplicateBuildings(cityId);

    const [buildingsRes, unitsRes, buildQueuesRes, trainingQueuesRes, cityTechsRes, researchQueueRes, freshCityRes] = await Promise.all([
      withDbRetry(() => db.from(COLLECTIONS.BUILDINGS).eq("cityId", cityId).get(), 5),
      withDbRetry(() => db.from(COLLECTIONS.UNITS).eq("cityId", cityId).get(), 5),
      withDbRetry(() => db.from(COLLECTIONS.BUILD_QUEUES).eq("cityId", cityId).eq("isComplete", false).get(), 5),
      withDbRetry(() => db.from(COLLECTIONS.TRAINING_QUEUES).eq("cityId", cityId).eq("isComplete", false).get(), 5),
      withDbRetry(() => db.from(COLLECTIONS.CITY_TECHS).eq("cityId", cityId).get(), 5),
      withDbRetry(() => db.from(COLLECTIONS.RESEARCH_QUEUES).eq("cityId", cityId).eq("isComplete", false).get(), 5),
      withDbRetry(() => db.from(COLLECTIONS.CITIES).eq("id", cityId).getFirst(), 5),
    ]);
    const freshCity = (freshCityRes as any).data ?? city;

    let buildings = normalizeLegacyDefenseBuildings((buildingsRes as any).data ?? []);
    const units = (unitsRes as any).data ?? [];
    const buildQueues = await normalizeActiveBuildQueues(cityId, (buildQueuesRes as any).data ?? []);
    const trainingQueues = (trainingQueuesRes as any).data ?? [];
    const cityTechs = (cityTechsRes as any).data ?? [];
    const researchQueue = (researchQueueRes as any).data ?? [];
    const activeResearch = researchQueue[0] ?? null;
    const allianceMembership = await getAllianceMembershipForUser(city.userId);

    if (buildings.length === 0) {
      console.warn(`[City ${cityId}] Buildings lookup returned empty set; skipping auto-repair on live read`);
    }

    const stats = calculateCityStats(buildings);
    const techBonuses = calculateTechBonuses(cityTechs.map((tech: any) => ({ techId: tech.techId, level: tech.level })));
    const activeAllianceEffects = allianceMembership?.allianceId
      ? ((await db.from(COLLECTIONS.ALLIANCE_EFFECTS).eq("allianceId", allianceMembership.allianceId).get() as any).data ?? [])
          .filter((effect: any) => new Date(effect.expiresAt).getTime() > Date.now())
      : [];

    const seasonState = await getSeasonState();
    const effective = await calculateEffectiveProduction(stats.production, {
      techBonuses,
      allianceEffects: activeAllianceEffects,
      seasonState,
      cityPosX: freshCity.posX ?? 0,
      cityPosY: freshCity.posY ?? 0,
    });
    const effectiveProduction = effective.production;

    const resourceSnapshotAt = new Date();
    const resources = calculateResources(
      { gold: freshCity.gold, wood: freshCity.wood, stone: freshCity.stone, food: freshCity.food, gems: freshCity.gems },
      effectiveProduction,
      stats.storage,
      new Date(freshCity.lastResourceUpdate ?? freshCity.createdAt),
      resourceSnapshotAt
    );

    const snapshot = {
      ...freshCity,
      lastResourceUpdate: resourceSnapshotAt.toISOString(),
      buildings,
      units,
      buildQueues,
      trainingQueues,
      cityTechs,
      researchQueue,
      activeResearch,
      allianceMembership,
      resources,
      ...stats,
      production: effectiveProduction,
      seasonModifiers: effective.totalMultiplier,
      techBonuses,
      allianceEffects: activeAllianceEffects,
    };

    citySnapshotCache.set(cityId, { data: snapshot, cachedAt: Date.now() });
    return snapshot;
  } catch (error) {
    const cached = citySnapshotCache.get(cityId);
    if (cached && Date.now() - cached.cachedAt <= CITY_SNAPSHOT_TTL_MS) {
      console.warn(`[City ${cityId}] Serving cached snapshot after transient read failure: ${String((error as any)?.message ?? error)}`);
      return cached.data;
    }
    throw error;
  }
}

async function normalizeActiveBuildQueues(cityId: string, queues: any[]) {
  const byBuilding = new Map<string, any[]>();
  for (const queue of queues) {
    const queueKey = `${queue.cityId}:${queue.buildingType}`;
    const list = byBuilding.get(queueKey) ?? [];
    list.push(queue);
    byBuilding.set(queueKey, list);
  }

  const normalized: any[] = [];
  for (const group of byBuilding.values()) {
    group.sort((a, b) => {
      const startedDiff = new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      if (startedDiff !== 0) return startedDiff;
      const levelDiff = (b.targetLevel ?? 0) - (a.targetLevel ?? 0);
      if (levelDiff !== 0) return levelDiff;
      return 0;
    });

    const [primary, ...duplicates] = group;
    if (!primary) continue;

    for (const dup of duplicates) {
      await deleteRecordBySelector(COLLECTIONS.BUILD_QUEUES, dup);
    }

    const buildingRes = await getRecordByLogicalId(COLLECTIONS.BUILDINGS, primary.buildingId) as any;
    const currentLevel = buildingRes.data?.level ?? 0;
    if (currentLevel >= (primary.targetLevel ?? 0)) {
      await deleteRecordBySelector(COLLECTIONS.BUILD_QUEUES, primary);
      continue;
    }

    normalized.push(primary);
  }

  normalized.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  return normalized;
}

async function reconcileExpiredBuildQueues(cityId: string) {
  const queuesRes = await db.from(COLLECTIONS.BUILD_QUEUES)
    .eq("cityId", cityId)
    .eq("isComplete", false)
    .get() as any;

  const activeQueues = (queuesRes.data ?? []).slice().sort((a: any, b: any) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  if (activeQueues.length === 0) return;

  const byBuilding = new Map<string, any[]>();
  for (const queue of activeQueues) {
    const queueKey = `${queue.cityId}:${queue.buildingType}`;
    const list = byBuilding.get(queueKey) ?? [];
    list.push(queue);
    byBuilding.set(queueKey, list);
  }

  const now = new Date();
  for (const queues of byBuilding.values()) {
    queues.sort((a, b) => {
      const startedDiff = new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      if (startedDiff !== 0) return startedDiff;
      const levelDiff = (b.targetLevel ?? 0) - (a.targetLevel ?? 0);
      if (levelDiff !== 0) return levelDiff;
      return 0;
    });

    const [primary, ...duplicates] = queues;

    for (const dup of duplicates) {
      await deleteRecordBySelector(COLLECTIONS.BUILD_QUEUES, dup);
    }

    if (!primary) continue;
    if (new Date(primary.completesAt) > now) continue;

    const buildingRes = await getRecordByLogicalId(COLLECTIONS.BUILDINGS, primary.buildingId) as any;
    if (buildingRes.data) {
      await mergeRecordBySelector(COLLECTIONS.BUILDINGS, buildingRes.data, {
        level: primary.targetLevel,
        upgradedAt: now.toISOString(),
      });
    }

    await deleteRecordBySelector(COLLECTIONS.BUILD_QUEUES, primary);

    const cityBuildings = await db.from(COLLECTIONS.BUILDINGS)
      .eq("cityId", cityId)
      .get() as any;

    const stats = calculateCityStats(cityBuildings.data ?? []);
    const cityRes = await getRecordByLogicalId(COLLECTIONS.CITIES, cityId) as any;
    if (cityRes.data) {
      await mergeRecordBySelector(COLLECTIONS.CITIES, cityRes.data, {
        goldPerHour: stats.production.goldPerHour,
        woodPerHour: stats.production.woodPerHour,
        stonePerHour: stats.production.stonePerHour,
        foodPerHour: stats.production.foodPerHour,
        maxGold: stats.storage.maxGold,
        maxWood: stats.storage.maxWood,
        maxStone: stats.storage.maxStone,
        maxFood: stats.storage.maxFood,
      });
    }
  }
}

async function cleanupDuplicateBuildings(cityId: string) {
  const buildingsRes = await db.from(COLLECTIONS.BUILDINGS).eq("cityId", cityId).get() as any;
  const buildings = normalizeLegacyDefenseBuildings((buildingsRes.data ?? []));
  const activeQueuesRes = await db.from(COLLECTIONS.BUILD_QUEUES)
    .eq("cityId", cityId)
    .eq("isComplete", false)
    .get() as any;
  const activeBuildingIds = new Set<string>((activeQueuesRes.data ?? []).map((queue: any) => queue.buildingId));
  const deduped = normalizeBuildingsByType(buildings as any[], activeBuildingIds);
  if (deduped.removed.length === 0) return;

  const queueUpdates: Promise<any>[] = [];
  for (const removed of deduped.removed as any[]) {
    const primary = deduped.primaryByType.get(String(removed.type));
    if (!primary) continue;

    queueUpdates.push(
      db.from(COLLECTIONS.BUILD_QUEUES)
        .eq("cityId", cityId)
        .eq("buildingId", removed.id)
        .eq("isComplete", false)
        .merge({ buildingId: primary.id, buildingType: primary.type })
        .execute()
    );
  }

  await Promise.all([
    ...queueUpdates,
    ...deduped.removed.map((building) =>
      deleteRecordBySelector(COLLECTIONS.BUILDINGS, building)
    ),
  ]);
}

// Building sizes in tiles (width, height) — 32px tiles
const BUILDING_SIZES: Record<string, { w: number; h: number }> = {
  TOWN_HALL: { w: 4, h: 4 },
  GOLD_MINE: { w: 4, h: 4 },
  LUMBER_MILL: { w: 4, h: 4 },
  QUARRY: { w: 4, h: 4 },
  FARM: { w: 4, h: 4 },
  BARRACKS: { w: 6, h: 4 },
  STABLE: { w: 6, h: 4 },
  ALLIANCE_CENTER: { w: 4, h: 4 },
  LIBRARY: { w: 4, h: 4 },
  STORAGE: { w: 4, h: 4 },
  TOWER: { w: 2, h: 4 },
  MARKET: { w: 6, h: 4 },
};

// ─── Starter Data ───

// Starter data moved to domain/cityCreation.ts (shared by auth register)

// ─── Routes ───

const cityRouter = new Hono();

// Bootstrap for authenticated user: ensure game profile + a starter city exists.
cityRouter.post("/bootstrap", requireMatecitoAuth(), async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));
  const desiredCityName =
    typeof body.cityName === "string" && body.cityName.trim().length >= 2 ? body.cityName.trim() : "Etheria";

  // Game profile doc (separate from Matecito Auth users).
  const profileRes = await db.from(COLLECTIONS.USERS).eq("id", userId).getFirst() as any;
  if (!profileRes.data) {
    const now = new Date().toISOString();
    await db.from(COLLECTIONS.USERS).insert({
      id: userId,
      email: typeof body.email === "string" ? body.email : null,
      name: typeof body.name === "string" ? body.name : "Commander",
      createdAt: now,
      updatedAt: now,
    });
  }

  const existingCityRes = await db.from(COLLECTIONS.CITIES).eq("userId", userId).getFirst() as any;
  const existingCityId = existingCityRes.data?.id ?? null;

  let cityId = existingCityId as string | null;
  if (!cityId) {
    const created = await createStarterCityForUser({ userId, cityName: desiredCityName });
    if ("error" in created) return c.json({ error: created.error }, 503);
    cityId = created.cityId;
  }

  const fullCity = await getCityWithResources(cityId);
  return c.json({ city: fullCity });
});

// ─── World map config ───
cityRouter.get("/world-map", async (c) => {
  const world = await getWorldConfig();
  return c.json({
    map: world.map,
    spawn: world.spawn,
  });
});

// Create Starter City
cityRouter.post("/create", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const cityName = typeof body.name === "string" && body.name.trim().length >= 2
    ? body.name.trim()
    : "New City";

  const now = new Date().toISOString();
  const userId = genId();

  // Create user placeholder
  await db.from(COLLECTIONS.USERS).insert({
    id: userId,
    email: `player_${Date.now()}@etheria.game`,
    name: "Commander",
    createdAt: now,
  });

  const created = await createStarterCityForUser({ userId, cityName });
  if ("error" in created) return c.json({ error: created.error }, 503);

  const fullCity = await getCityWithResources(created.cityId);
  return c.json({ city: fullCity, message: "City created with starter buildings" });
});

// Get city
cityRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const city = await getCityWithResources(id);
  if (!city) return c.json({ error: "City not found" }, 404);
  return c.json(city);
});

// Create building
cityRouter.post("/:id/build", zValidator("json", CreateBuildingRequestSchema), async (c) => {
  const cityId = c.req.param("id");
  const data = c.req.valid("json");

  const city = await getCityWithResources(cityId);
  if (!city) return c.json({ error: "City not found" }, 404);

  const townHall = city.buildings.find((b: any) => b.type === "TOWN_HALL");
  const townHallLevel = townHall?.level ?? 1;

  // Check max buildings per type
  const existingCount = city.buildings.filter((b: any) => {
    if (data.type === "TOWER") return b.type === "TOWER" || b.type === "WALL";
    return b.type === data.type;
  }).length;
  const maxAllowed = 1;
  if (existingCount >= maxAllowed) {
    return c.json({ error: `Maximum ${maxAllowed} ${data.type} allowed` }, 400);
  }

  // Check area is free (building may occupy multiple tiles)
  const size = BUILDING_SIZES[data.type] ?? { w: 1, h: 1 };
  const isAreaFree = !city.buildings.some((b: any) => {
    const bSize = BUILDING_SIZES[b.type] ?? { w: 1, h: 1 };
    return (
      data.positionX < b.positionX + bSize.w &&
      data.positionX + size.w > b.positionX &&
      data.positionY < b.positionY + bSize.h &&
      data.positionY + size.h > b.positionY
    );
  });
  if (!isAreaFree) return c.json({ error: "Area occupied" }, 400);

  const cost = getBuildingCost(data.type, 1);
  if (!canAfford(city.resources, cost)) {
    return c.json({ error: "Not enough resources", required: cost, available: city.resources }, 400);
  }

  const now = new Date().toISOString();
  const buildingId = genId();

  // Deduct resources
  const newResources = subtractResources(city.resources, cost);
  await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
    gold: newResources.gold,
    wood: newResources.wood,
    stone: newResources.stone,
    food: newResources.food,
    gems: newResources.gems,
    lastResourceUpdate: now,
  });

  // Create building
  await db.from(COLLECTIONS.BUILDINGS).insert({
    id: buildingId,
    cityId,
    type: data.type,
    level: 1,
    positionX: data.positionX,
    positionY: data.positionY,
    createdAt: now,
    upgradedAt: now,
  });

  // Recalculate city stats
  const buildingsRes = await db.from(COLLECTIONS.BUILDINGS).eq("cityId", cityId).get() as any;
  const stats = calculateCityStats(buildingsRes.data ?? []);
  await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
    goldPerHour: stats.production.goldPerHour,
    woodPerHour: stats.production.woodPerHour,
    stonePerHour: stats.production.stonePerHour,
    foodPerHour: stats.production.foodPerHour,
    maxGold: stats.storage.maxGold,
    maxWood: stats.storage.maxWood,
    maxStone: stats.storage.maxStone,
    maxFood: stats.storage.maxFood,
  });

  return c.json({
    building: { id: buildingId, type: data.type, level: 1, positionX: data.positionX, positionY: data.positionY },
    message: "Building created",
  });
});

// Upgrade building
cityRouter.post("/:id/buildings/:buildingId/upgrade", async (c) => {
  const cityId = c.req.param("id");
  const buildingId = c.req.param("buildingId");

  const city = await getCityWithResources(cityId);
  if (!city) return c.json({ error: "City not found" }, 404);

  const building = city.buildings.find((b: any) => b.id === buildingId);
  if (!building) return c.json({ error: "Building not found" }, 404);

  const townHall = city.buildings.find((b: any) => b.type === "TOWN_HALL");
  const townHallLevel = townHall?.level ?? 1;
  const maxLevel = getBuildingMaxLevelForTownHall(townHallLevel, building.type as BuildingType);

  if (building.level >= maxLevel) return c.json({ error: "Max level reached" }, 400);

  const pendingQueueRes = await db.from(COLLECTIONS.BUILD_QUEUES)
    .eq("cityId", cityId)
    .eq("buildingType", building.type)
    .eq("isComplete", false)
    .get() as any;
  if ((pendingQueueRes.data ?? []).length > 0) {
    return c.json({ error: "Upgrade already queued" }, 409);
  }

  const nextLevel = building.level + 1;
  const cost = getBuildingCost(building.type as BuildingType, nextLevel);
  if (!canAfford(city.resources, cost)) {
    return c.json({ error: "Not enough resources", required: cost, available: city.resources }, 400);
  }

  const buildTime = getBuildingTime(building.type as BuildingType, nextLevel);
  const now = new Date();
  const nowIso = now.toISOString();
  const completesAt = new Date(now.getTime() + buildTime * 1000).toISOString();
  const queueId = genId();

  // Deduct resources
  const newResources = subtractResources(city.resources, cost);
  await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
    gold: newResources.gold,
    wood: newResources.wood,
    stone: newResources.stone,
    food: newResources.food,
    gems: newResources.gems,
    lastResourceUpdate: nowIso,
  });

  // Create build queue
  await db.from(COLLECTIONS.BUILD_QUEUES).insert({
    id: queueId,
    cityId,
    buildingId,
    buildingType: building.type,
    targetLevel: nextLevel,
    startedAt: nowIso,
    completesAt,
    isComplete: false,
  });

  return c.json({
    success: true,
    nextLevel,
    completesIn: buildTime,
    completesAt,
    resources: newResources,
    queue: {
      id: queueId,
      cityId,
      buildingId,
      buildingType: building.type,
      targetLevel: nextLevel,
      startedAt: nowIso,
      completesAt,
      isComplete: false,
    },
  });
});

cityRouter.post("/:id/build-queues/:queueId/cancel", async (c) => {
  const cityId = c.req.param("id");
  const queueId = c.req.param("queueId");

  const city = await getCityWithResources(cityId);
  if (!city) return c.json({ error: "City not found" }, 404);

  const queueRes = await getRecordByLogicalId(COLLECTIONS.BUILD_QUEUES, queueId) as any;

  const queue = queueRes.data;
  if (!queue || queue.cityId !== cityId || queue.isComplete === true || queue.isComplete === "true") {
    return c.json({ error: "Build queue not found" }, 404);
  }

  const buildingRes = await getRecordByLogicalId(COLLECTIONS.BUILDINGS, queue.buildingId) as any;
  if (!buildingRes.data) {
    await deleteRecordBySelector(COLLECTIONS.BUILD_QUEUES, queue);
    return c.json({ error: "Building not found for queue" }, 409);
  }

  const cost = getBuildingCost(queue.buildingType as BuildingType, queue.targetLevel);
  const refund = calculateCancellationRefund(cost);
  const nowIso = new Date().toISOString();

  const nextResources = {
    gold: Math.min(city.maxGold, city.resources.gold + refund.gold),
    wood: Math.min(city.maxWood, city.resources.wood + refund.wood),
    stone: Math.min(city.maxStone, city.resources.stone + refund.stone),
    food: Math.min(city.maxFood, city.resources.food + refund.food),
    gems: city.resources.gems + refund.gems,
  };

  await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
    gold: nextResources.gold,
    wood: nextResources.wood,
    stone: nextResources.stone,
    food: nextResources.food,
    gems: nextResources.gems,
    lastResourceUpdate: nowIso,
  });

  await deleteRecordBySelector(COLLECTIONS.BUILD_QUEUES, queue);

  return c.json({
    success: true,
    queueId,
    refund,
    resources: nextResources,
  });
});

// Train units
cityRouter.post("/:id/train", zValidator("json", TrainUnitsRequestSchema), async (c) => {
  const cityId = c.req.param("id");
  const data = c.req.valid("json");

  const city = await getCityWithResources(cityId);
  if (!city) return c.json({ error: "City not found" }, 404);

  const cost = applyTrainingCostReduction(
    getUnitCost(data.unitType, data.count),
    city.techBonuses?.trainingCostReduction ?? 0
  );
  if (!canAfford(city.resources, cost)) {
    return c.json({ error: "Not enough resources", required: cost, available: city.resources }, 400);
  }

  const trainingTime = getTrainingTime(data.unitType, data.count);
  const now = new Date();
  const nowIso = now.toISOString();
  const completesAt = new Date(now.getTime() + trainingTime * 1000).toISOString();

  // Deduct resources
  const newResources = subtractResources(city.resources, cost);
  await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
    gold: newResources.gold,
    wood: newResources.wood,
    stone: newResources.stone,
    food: newResources.food,
    gems: newResources.gems,
    lastResourceUpdate: nowIso,
  });

  // Create training queue
  await db.from(COLLECTIONS.TRAINING_QUEUES).insert({
    id: genId(),
    cityId,
    unitType: data.unitType,
    count: data.count,
    startedAt: nowIso,
    completesAt,
    isComplete: false,
  });

  return c.json({ success: true, completesIn: trainingTime, completesAt });
});

cityRouter.post("/:id/training-queues/:queueId/cancel", async (c) => {
  const cityId = c.req.param("id");
  const queueId = c.req.param("queueId");

  const city = await getCityWithResources(cityId);
  if (!city) return c.json({ error: "City not found" }, 404);

  const queueRes = await getRecordByLogicalId(COLLECTIONS.TRAINING_QUEUES, queueId) as any;
  const queue = queueRes.data;
  if (!queue || queue.cityId !== cityId || queue.isComplete === true || queue.isComplete === "true") {
    return c.json({ error: "Training queue not found" }, 404);
  }

  const cost = applyTrainingCostReduction(
    getUnitCost(queue.unitType as UnitType, Number(queue.count ?? 1)),
    city.techBonuses?.trainingCostReduction ?? 0
  );
  const refund = calculateCancellationRefund(cost);
  const nowIso = new Date().toISOString();
  const nextResources = {
    gold: Math.min(city.maxGold, city.resources.gold + refund.gold),
    wood: Math.min(city.maxWood, city.resources.wood + refund.wood),
    stone: Math.min(city.maxStone, city.resources.stone + refund.stone),
    food: Math.min(city.maxFood, city.resources.food + refund.food),
    gems: city.resources.gems + refund.gems,
  };

  await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
    gold: nextResources.gold,
    wood: nextResources.wood,
    stone: nextResources.stone,
    food: nextResources.food,
    gems: nextResources.gems,
    lastResourceUpdate: nowIso,
  });
  await deleteRecordBySelector(COLLECTIONS.TRAINING_QUEUES, queue);

  return c.json({ success: true, queueId, refund, resources: nextResources });
});

// Attack
cityRouter.post("/:id/attack", zValidator("json", AttackRequestSchema), async (c) => {
  const attackerCityId = c.req.param("id");
  const data = c.req.valid("json");

  const attackerCity = await getCityWithResources(attackerCityId);
  if (!attackerCity) return c.json({ error: "City not found" }, 404);

  const defenderRes = await db.from(COLLECTIONS.CITIES).eq('id', data.targetCityId).getFirst() as any;
  const defenderCity = defenderRes.data;
  if (!defenderCity) return c.json({ error: "Target city not found" }, 404);

  // Validate attacker has enough units
  for (const unit of data.units) {
    const available = attackerCity.units.find((u: any) => u.type === unit.type);
    if (!available || available.count < unit.count) {
      return c.json({ error: `Not enough ${unit.type}` }, 400);
    }
  }

  // Calculate slowest unit speed for travel time
  const speeds = data.units.map((u) => getUnitStats(u.type as UnitType, 1, attackerCity.techBonuses).speed);
  const minSpeed = Math.min(...speeds);
  const travelTime = calculateTravelTime(
    attackerCity.posX,
    attackerCity.posY,
    defenderCity.posX,
    defenderCity.posY,
    minSpeed
  );

  const now = new Date();
  const nowIso = now.toISOString();
  const arrivesAt = new Date(now.getTime() + travelTime * 1000).toISOString();
  const battleId = genId();

  // Create battle
  await db.from(COLLECTIONS.BATTLES).insert({
    id: battleId,
    attackerCityId,
    defenderCityId: data.targetCityId,
    status: "MARCHING",
    startedAt: nowIso,
    arrivesAt,
    units: data.units.map((u) => ({ type: u.type, count: u.count })),
  });

  // Subtract units from attacker city
  for (const unit of data.units) {
    const existing = attackerCity.units.find((u: any) => u.type === unit.type);
    if (existing) {
      await mergeRecordBySelector(COLLECTIONS.UNITS, existing, {
        count: existing.count - unit.count,
      });
    }
  }

  return c.json({ battleId, travelTime, arrivesAt });
});

// Get queues
cityRouter.get("/:id/queue", async (c) => {
  const cityId = c.req.param("id");
  await reconcileExpiredBuildQueues(cityId);

  const [buildQueuesRes, trainingQueuesRes] = await Promise.all([
    db.from(COLLECTIONS.BUILD_QUEUES).eq("cityId", cityId).eq("isComplete", false).get(),
    db.from(COLLECTIONS.TRAINING_QUEUES).eq("cityId", cityId).eq("isComplete", false).get(),
  ]);

  const buildQueues = await normalizeActiveBuildQueues(cityId, (buildQueuesRes as any).data ?? []);
  const trainingQueues = (trainingQueuesRes as any).data ?? [];

  // Sort by startedAt ascending
  buildQueues.sort((a: any, b: any) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  trainingQueues.sort((a: any, b: any) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  return c.json({ buildQueues, trainingQueues });
});

// ─── List cities (for attack target selection) ───

cityRouter.get("/list/all", async (c) => {
  const citiesRes = await db.from(COLLECTIONS.CITIES).get() as any;
  const rawCities = (citiesRes.data ?? []) as any[];
  const membershipsRes = await db.from(COLLECTIONS.ALLIANCE_MEMBERS).get() as any;
  const memberships = membershipsRes.data ?? [];
  const allianceByUser = new Map(memberships.map((m: any) => [m.userId, m.allianceId]));

  const cities = rawCities.map((city: any) => ({
    id: city.id,
    name: city.name,
    userId: city.userId,
    allianceId: allianceByUser.get(city.userId) ?? null,
    posX: city.posX,
    posY: city.posY,
  }));
  return c.json({ cities });
});

// ─── Battle Reports ───

cityRouter.get("/:id/battles/reports", async (c) => {
  const cityId = c.req.param("id");
  const reportsRes = await db.from(COLLECTIONS.BATTLE_REPORTS)
    .eq("cityId", cityId)
    .get() as any;

  const reports = (reportsRes.data ?? []).sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return c.json({ reports });
});

cityRouter.post("/:id/battles/reports/:reportId/read", async (c) => {
  const reportId = c.req.param("reportId");

  await mergeRecordByLogicalId(COLLECTIONS.BATTLE_REPORTS, reportId, { read: true });

  return c.json({ success: true });
});

// ─── Active Battles ───

cityRouter.get("/:id/battles/active", async (c) => {
  const cityId = c.req.param("id");

  const [attackingRes, defendingRes] = await Promise.all([
    db.from(COLLECTIONS.BATTLES).eq("attackerCityId", cityId).get() as any,
    db.from(COLLECTIONS.BATTLES).eq("defenderCityId", cityId).get() as any,
  ]);

  const allBattles = [
    ...(attackingRes.data ?? []),
    ...(defendingRes.data ?? []),
  ];

  // Only include non-completed battles
  const active = allBattles.filter(
    (b: any) => b.status === "MARCHING" || b.status === "RETURNING"
  );

  return c.json({ battles: active });
});

// ─── Tech / Research ───

cityRouter.get("/:id/techs", async (c) => {
  const cityId = c.req.param("id");

  const [cityTechsRes, researchQueueRes] = await Promise.all([
    db.from(COLLECTIONS.CITY_TECHS).eq("cityId", cityId).get() as any,
    db.from(COLLECTIONS.RESEARCH_QUEUES).eq("cityId", cityId).eq("isComplete", false).get() as any,
  ]);

  const cityTechs = (cityTechsRes.data ?? []).map((t: any) => ({ techId: t.techId, level: t.level }));
  const activeResearch = researchQueueRes.data?.[0] ?? null;

  const allConfigs = getAllTechConfigs();
  const techs = allConfigs.map((cfg) => {
    const unlocked = cityTechs.find((t: any) => t.techId === cfg.techId);
    const currentLevel = unlocked?.level ?? 0;
    const check = canResearch(cfg.techId, currentLevel + 1, cityTechs, activeResearch);
    const nextCost = currentLevel < cfg.maxLevel ? getResearchCost(cfg.techId, currentLevel + 1) : null;
    const nextTime = currentLevel < cfg.maxLevel ? getResearchTime(cfg.techId, currentLevel + 1) : null;

    return {
      ...cfg,
      currentLevel,
      canResearch: check.allowed,
      researchBlockedReason: check.reason,
      nextLevelCost: nextCost,
      nextLevelTime: nextTime,
    };
  });

  return c.json({ techs, activeResearch });
});

cityRouter.post("/:id/research", zValidator("json", StartResearchRequestSchema), async (c) => {
  const cityId = c.req.param("id");
  const data = c.req.valid("json");

  const city = await getCityWithResources(cityId);
  if (!city) return c.json({ error: "City not found" }, 404);

  const [cityTechsRes, researchQueueRes] = await Promise.all([
    db.from(COLLECTIONS.CITY_TECHS).eq("cityId", cityId).get() as any,
    db.from(COLLECTIONS.RESEARCH_QUEUES).eq("cityId", cityId).eq("isComplete", false).get() as any,
  ]);

  const cityTechs = (cityTechsRes.data ?? []).map((t: any) => ({ techId: t.techId, level: t.level }));
  const activeResearch = researchQueueRes.data?.[0] ?? null;

  const cfg = getAllTechConfigs().find((t) => t.techId === data.techId);
  if (!cfg) return c.json({ error: "Tech not found" }, 404);

  const currentLevel = cityTechs.find((t: any) => t.techId === data.techId)?.level ?? 0;
  const targetLevel = currentLevel + 1;
  const check = canResearch(data.techId, targetLevel, cityTechs, activeResearch);
  if (!check.allowed) {
    return c.json({ error: check.reason }, 400);
  }

  const cost = getResearchCost(data.techId, targetLevel);
  const researchTime = getResearchTime(data.techId, targetLevel);

  if (!canAfford(city.resources, cost)) {
    return c.json({ error: "Not enough resources", required: cost, available: city.resources }, 400);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const completesAt = new Date(now.getTime() + researchTime * 1000).toISOString();

  // Deduct resources
  const newResources = subtractResources(city.resources, cost);
  await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
    gold: newResources.gold,
    wood: newResources.wood,
    stone: newResources.stone,
    food: newResources.food,
    gems: newResources.gems,
    lastResourceUpdate: nowIso,
  });

  // Create research queue
  await db.from(COLLECTIONS.RESEARCH_QUEUES).insert({
    id: genId(),
    cityId,
    techId: data.techId,
    targetLevel,
    startedAt: nowIso,
    completesAt,
    isComplete: false,
  });

  return c.json({ success: true, techId: data.techId, targetLevel, completesIn: researchTime, completesAt });
});

cityRouter.post("/:id/research-queues/:queueId/cancel", async (c) => {
  const cityId = c.req.param("id");
  const queueId = c.req.param("queueId");

  const city = await getCityWithResources(cityId);
  if (!city) return c.json({ error: "City not found" }, 404);

  const queueRes = await getRecordByLogicalId(COLLECTIONS.RESEARCH_QUEUES, queueId) as any;
  const queue = queueRes.data;
  if (!queue || queue.cityId !== cityId || queue.isComplete === true || queue.isComplete === "true") {
    return c.json({ error: "Research queue not found" }, 404);
  }

  const cost = getResearchCost(queue.techId, Number(queue.targetLevel ?? 1));
  const refund = calculateCancellationRefund(cost);
  const nowIso = new Date().toISOString();
  const nextResources = {
    gold: Math.min(city.maxGold, city.resources.gold + refund.gold),
    wood: Math.min(city.maxWood, city.resources.wood + refund.wood),
    stone: Math.min(city.maxStone, city.resources.stone + refund.stone),
    food: Math.min(city.maxFood, city.resources.food + refund.food),
    gems: city.resources.gems + refund.gems,
  };

  await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
    gold: nextResources.gold,
    wood: nextResources.wood,
    stone: nextResources.stone,
    food: nextResources.food,
    gems: nextResources.gems,
    lastResourceUpdate: nowIso,
  });
  await deleteRecordBySelector(COLLECTIONS.RESEARCH_QUEUES, queue);

  return c.json({ success: true, queueId, refund, resources: nextResources });
});

export { cityRouter };
