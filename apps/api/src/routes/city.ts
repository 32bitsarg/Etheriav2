import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@etheria/database";
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
  attackCityAction,
  CityActionError,
  createBuildingAction,
  startResearchAction,
  trainUnitsAction,
  upgradeBuildingAction,
} from "../domain/cityActions.js";
import { sendResourcesAction } from "../domain/tradeActions.js";
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
  SendResourcesRequestSchema,
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
import { getCityPowerMap } from "../domain/cityPower.js";
import { getActiveMovements } from "../domain/worldActions.js";
import { generateCityName, generatePlayerName } from "../domain/nameGenerator.js";
import { getCityQueueConfig } from "../domain/queueConfigData.js";

const genId = () => crypto.randomUUID();
const citySnapshotCache = new Map<string, { data: any; cachedAt: number }>();
const CITY_SNAPSHOT_TTL_MS = 15_000;
const WORLD_MAP_CITY_LIMIT = Number(process.env.WORLD_MAP_CITY_LIMIT ?? 200);
const TARGET_CITY_LIMIT = Number(process.env.TARGET_CITY_LIMIT ?? 300);
const RANKING_CITY_LIMIT = Number(process.env.RANKING_CITY_LIMIT ?? 100);
const SEASON_STATE_CACHE_TTL_MS = 15_000;
let seasonStateCache: { data: any; cachedAt: number } | null = null;

function sortPendingQueues<T extends { startedAt?: string; completesAt?: string }>(queues: T[]): T[] {
  return [...queues].sort((a, b) => {
    const completesDiff = new Date(a.completesAt ?? 0).getTime() - new Date(b.completesAt ?? 0).getTime();
    if (completesDiff !== 0) return completesDiff;
    return new Date(a.startedAt ?? 0).getTime() - new Date(b.startedAt ?? 0).getTime();
  });
}

function serializeRecord<T>(record: T): T {
  if (!record || typeof record !== "object") return record;
  if (record instanceof Date) return record.toISOString() as T;
  if (Array.isArray(record)) return record.map((item) => serializeRecord(item)) as T;
  return Object.fromEntries(
    Object.entries(record as Record<string, unknown>).map(([key, value]) => [key, serializeRecord(value)])
  ) as T;
}

async function getCachedSeasonStateDirect() {
  if (seasonStateCache && Date.now() - seasonStateCache.cachedAt <= SEASON_STATE_CACHE_TTL_MS) {
    return seasonStateCache.data;
  }
  const state = await prisma.worldSeasonState.findFirst();
  const data = serializeRecord(state);
  seasonStateCache = { data, cachedAt: Date.now() };
  return data;
}

async function getAllianceMembershipForUserDirect(userId: string) {
  const membership = await prisma.allianceMember.findUnique({ where: { userId } });
  if (!membership) return null;
  const alliance = await prisma.alliance.findUnique({ where: { id: membership.allianceId } });
  return serializeRecord({ ...membership, alliance });
}

function buildTechResponse(cityTechRows: Array<{ techId: string; level: number }>, researchQueueRows: any[]) {
  const cityTechs = cityTechRows.map((tech) => ({ techId: tech.techId, level: tech.level }));
  const researchQueue = sortPendingQueues(serializeRecord(researchQueueRows));
  const activeResearch = researchQueue[0] ?? null;
  const queueConfig = getCityQueueConfig();
  const researchSlotsFull = researchQueue.length >= queueConfig.maxSlots.research;

  const techs = getAllTechConfigs().map((cfg) => {
    const unlocked = cityTechs.find((tech) => tech.techId === cfg.techId);
    const currentLevel = unlocked?.level ?? 0;
    const pendingSameTech = researchQueue.filter((queue: any) => queue.techId === cfg.techId).length;
    const targetLevel = currentLevel + pendingSameTech + 1;
    const check = researchSlotsFull
      ? { allowed: false, reason: "Research queue full" }
      : canResearch(cfg.techId, currentLevel + 1, cityTechs as any, null);
    const nextCost = currentLevel < cfg.maxLevel ? getResearchCost(cfg.techId, currentLevel + 1) : null;
    const nextTime = currentLevel < cfg.maxLevel ? getResearchTime(cfg.techId, currentLevel + 1) : null;

    return {
      ...cfg,
      currentLevel,
      canResearch: check.allowed && targetLevel <= cfg.maxLevel,
      researchBlockedReason: check.reason,
      nextLevelCost: nextCost,
      nextLevelTime: nextTime,
    };
  });

  return { techs, activeResearch, researchQueue };
}

async function getPlayInitialSnapshot(cityId: string) {
  const startedAt = performance.now();
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    include: {
      buildings: true,
      units: true,
      buildQueues: { where: { isComplete: false }, orderBy: [{ completesAt: "asc" }, { startedAt: "asc" }] },
      trainingQueues: { where: { isComplete: false }, orderBy: [{ completesAt: "asc" }, { startedAt: "asc" }] },
      researchQueues: { where: { isComplete: false }, orderBy: [{ completesAt: "asc" }, { startedAt: "asc" }] },
      cityTechs: true,
    },
  });
  if (!city) return null;

  const buildings = normalizeLegacyDefenseBuildings(serializeRecord(city.buildings));
  const stats = calculateCityStats(buildings);
  const cityTechs = serializeRecord(city.cityTechs);
  const techBonuses = calculateTechBonuses(cityTechs.map((tech: any) => ({ techId: tech.techId, level: tech.level })));
  const [allianceMembership, seasonState, activeBattles, battleReports, gameReportsCount, unreadMailCount, barbarianAlerts] = await Promise.all([
    getAllianceMembershipForUserDirect(city.userId),
    getCachedSeasonStateDirect(),
    prisma.battle.findMany({
      where: {
        OR: [{ attackerCityId: cityId }, { defenderCityId: cityId }],
        status: { in: ["MARCHING", "RETURNING"] as any },
      },
      orderBy: { arrivesAt: "asc" },
      take: 20,
    }),
    prisma.battleReport.findMany({
      where: { cityId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.gameReport.count({ where: { userId: city.userId, readAt: null } as any }).catch(() => 0),
    prisma.mailMessage.count({ where: { recipientUserId: city.userId, readAt: null } }).catch(() => 0),
    prisma.barbarianAttackAlert.findMany({
      where: { cityId, read: false },
      orderBy: { arrivesAt: "asc" },
      take: 10,
    }).catch(() => []),
  ]);

  const activeAllianceEffects = allianceMembership?.allianceId
    ? await prisma.allianceEffect.findMany({
        where: {
          allianceId: allianceMembership.allianceId,
          expiresAt: { gt: new Date() },
        },
      })
    : [];
  const effective = await calculateEffectiveProduction(stats.production, {
    techBonuses,
    allianceEffects: serializeRecord(activeAllianceEffects),
    seasonState,
    cityPosX: city.posX ?? 0,
    cityPosY: city.posY ?? 0,
  });
  const resourceSnapshotAt = new Date();
  const resources = calculateResources(
    { gold: city.gold, wood: city.wood, stone: city.stone, food: city.food, gems: city.gems },
    effective.production,
    stats.storage,
    new Date(city.lastResourceUpdate ?? city.createdAt),
    resourceSnapshotAt
  );
  const researchQueue = serializeRecord(city.researchQueues);

  const snapshot = {
    ...serializeRecord(city),
    lastResourceUpdate: resourceSnapshotAt.toISOString(),
    buildings,
    units: serializeRecord(city.units),
    buildQueues: serializeRecord(city.buildQueues),
    trainingQueues: serializeRecord(city.trainingQueues),
    cityTechs,
    researchQueue,
    activeResearch: researchQueue[0] ?? null,
    allianceMembership,
    resources,
    ...stats,
    production: effective.production,
    seasonModifiers: effective.totalMultiplier,
    techBonuses,
    allianceEffects: serializeRecord(activeAllianceEffects),
  };

  citySnapshotCache.set(cityId, { data: snapshot, cachedAt: Date.now() });
  const durationMs = Math.round(performance.now() - startedAt);
  if (durationMs >= 500) console.warn(`[perf] play-initial snapshot ${cityId} ${durationMs}ms`);

  return {
    city: snapshot,
    techs: buildTechResponse(cityTechs, city.researchQueues),
    activeBattles: serializeRecord(activeBattles),
    battleReports: serializeRecord(battleReports),
    unreadCounts: {
      mail: unreadMailCount,
      gameReports: gameReportsCount,
      battleReports: battleReports.filter((report) => !report.read).length,
    },
    barbarianAlerts: serializeRecord(barbarianAlerts),
    seasonState,
    serverTime: new Date().toISOString(),
    cacheHints: {
      seasonPollMs: 60_000,
      battlePollMs: 15_000,
      reportsPollMs: 60_000,
      worldMovementsPollMs: 10_000,
    },
  };
}

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

function scheduleSequentialQueueAfterCancellation(
  pendingQueues: any[],
  durationForQueue: (queue: any) => number,
  now: Date
) {
  const sorted = sortPendingQueues(pendingQueues);
  let cursorMs = now.getTime();
  return sorted.map((queue, index) => {
    const currentStartedAt = new Date(queue.startedAt ?? 0).getTime();
    const currentCompletesAt = new Date(queue.completesAt ?? 0).getTime();
    if (index === 0 && currentStartedAt <= now.getTime() && currentCompletesAt > now.getTime()) {
      cursorMs = currentCompletesAt;
      return {
        queue,
        startedAt: new Date(currentStartedAt).toISOString(),
        completesAt: new Date(currentCompletesAt).toISOString(),
      };
    }

    const startedAt = new Date(cursorMs);
    const completesAt = new Date(cursorMs + durationForQueue(queue) * 1000);
    cursorMs = completesAt.getTime();
    return {
      queue,
      startedAt: startedAt.toISOString(),
      completesAt: completesAt.toISOString(),
    };
  });
}

async function rescheduleBuildQueues(cityId: string, now: Date) {
  const queuesRes = await db.from(COLLECTIONS.BUILD_QUEUES)
    .eq("cityId", cityId)
    .eq("isComplete", false)
    .get() as any;
  const schedules = scheduleSequentialQueueAfterCancellation(
    queuesRes.data ?? [],
    (queue) => getBuildingTime(queue.buildingType as BuildingType, Number(queue.targetLevel ?? 1)),
    now
  );
  await Promise.all(schedules.map(({ queue, startedAt, completesAt }) =>
    mergeRecordBySelector(COLLECTIONS.BUILD_QUEUES, queue, { startedAt, completesAt })
  ));
}

async function rescheduleTrainingQueues(cityId: string, now: Date) {
  const queuesRes = await db.from(COLLECTIONS.TRAINING_QUEUES)
    .eq("cityId", cityId)
    .eq("isComplete", false)
    .get() as any;
  const schedules = scheduleSequentialQueueAfterCancellation(
    queuesRes.data ?? [],
    (queue) => getTrainingTime(queue.unitType as UnitType, Number(queue.count ?? 1)),
    now
  );
  await Promise.all(schedules.map(({ queue, startedAt, completesAt }) =>
    mergeRecordBySelector(COLLECTIONS.TRAINING_QUEUES, queue, { startedAt, completesAt })
  ));
}

async function rescheduleResearchQueues(cityId: string, now: Date) {
  const queuesRes = await db.from(COLLECTIONS.RESEARCH_QUEUES)
    .eq("cityId", cityId)
    .eq("isComplete", false)
    .get() as any;
  const schedules = scheduleSequentialQueueAfterCancellation(
    queuesRes.data ?? [],
    (queue) => getResearchTime(queue.techId, Number(queue.targetLevel ?? 1)),
    now
  );
  await Promise.all(schedules.map(({ queue, startedAt, completesAt }) =>
    mergeRecordBySelector(COLLECTIONS.RESEARCH_QUEUES, queue, { startedAt, completesAt })
  ));
}

function actionErrorResponse(c: any, error: unknown) {
  if (error instanceof CityActionError) {
    return c.json({ error: error.message, ...error.details }, error.status as any);
  }
  throw error;
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
    const trainingQueues = sortPendingQueues((trainingQueuesRes as any).data ?? []);
    const cityTechs = (cityTechsRes as any).data ?? [];
    const researchQueue = sortPendingQueues((researchQueueRes as any).data ?? []);
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
  const startedAt = performance.now();
  const userId = c.get("userId");
  try {
    const body = await c.req.json().catch(() => ({}));
    const desiredCityName =
      typeof body.cityName === "string" && body.cityName.trim().length >= 2 ? body.cityName.trim() : generateCityName(userId);

    // Game profile doc (separate from Matecito Auth users).
    const profileRes = await db.from(COLLECTIONS.USERS).eq("id", userId).getFirst() as any;
    if (!profileRes.data) {
      const now = new Date().toISOString();
      await db.from(COLLECTIONS.USERS).insert({
        id: userId,
        email: typeof body.email === "string" ? body.email : null,
        name: typeof body.name === "string" ? body.name : generatePlayerName(userId),
        createdAt: now,
        updatedAt: now,
      });
    }

    const existingCityRes = await db.from(COLLECTIONS.CITIES).eq("userId", userId).getFirst() as any;
    const existingCityId = existingCityRes.data?.id ?? null;

    let cityId = existingCityId as string | null;
    if (!cityId) {
      const created = await createStarterCityForUser({ userId, cityName: desiredCityName });
      if ("error" in created) return c.json({ error: created.error, code: "CITY_CREATE_FAILED" }, 503);
      cityId = created.cityId;
    }

    const durationMs = Math.round(performance.now() - startedAt);
    if (durationMs >= 500) console.info(`[perf] bootstrap user=${userId} city=${cityId} ${durationMs}ms`);
    return c.json({ city: { id: cityId }, cityId });
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    console.error(`[bootstrap] failed user=${userId} ${durationMs}ms`, error);
    return c.json({
      error: error instanceof Error ? error.message : "Bootstrap failed",
      code: "BOOTSTRAP_FAILED",
    }, 500);
  }
});

// Create Starter City
cityRouter.post("/create", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const cityName = typeof body.name === "string" && body.name.trim().length >= 2
    ? body.name.trim()
    : generateCityName(String(Date.now()));

  const now = new Date().toISOString();
  const userId = genId();

  // Create user placeholder
  await db.from(COLLECTIONS.USERS).insert({
    id: userId,
    email: `player_${Date.now()}@etheria.game`,
    name: generatePlayerName(userId),
    createdAt: now,
  });

  const created = await createStarterCityForUser({ userId, cityName });
  if ("error" in created) return c.json({ error: created.error }, 503);

  return c.json({ city: { id: created.cityId }, cityId: created.cityId, message: "City created with starter buildings" });
});

// ─── List cities (for attack target selection) ───

cityRouter.get("/list/all", async (c) => {
  const rawCities = await prisma.city.findMany({
    orderBy: { createdAt: "desc" },
    take: TARGET_CITY_LIMIT,
  });
  const memberships = await prisma.allianceMember.findMany({
    where: { userId: { in: rawCities.map((city) => city.userId) } },
    select: { userId: true, allianceId: true },
  });
  const allianceByUser = new Map(memberships.map((m: any) => [m.userId, m.allianceId]));
  const powerByCity = await getCityPowerMap(rawCities.map((city: any) => city.id));

  const cities = rawCities.map((city: any) => ({
    id: city.id,
    name: city.name,
    userId: city.userId,
    allianceId: allianceByUser.get(city.userId) ?? null,
    posX: city.posX,
    posY: city.posY,
    power: powerByCity.get(city.id)?.total ?? 0,
  }));
  return c.json({ cities });
});

cityRouter.get("/ranking/all", async (c) => {
  const cities = await prisma.city.findMany({ orderBy: { createdAt: "desc" }, take: RANKING_CITY_LIMIT });
  const powerByCity = await getCityPowerMap(cities.map((city) => city.id));

  const members = await prisma.allianceMember.findMany({
    where: { userId: { in: cities.map((city) => city.userId) } },
    select: { userId: true, allianceId: true },
  });
  const memberByUserId = new Map<string, string>(members.map((m: any) => [m.userId, m.allianceId]));
  const allianceIds = [...new Set(members.map((m) => m.allianceId))];
  const alliances = allianceIds.length > 0
    ? await prisma.alliance.findMany({ where: { id: { in: allianceIds } }, select: { id: true, name: true } })
    : [];
  const allianceByAllianceId = new Map<string, string>(alliances.map((a: any) => [a.id, a.name]));

  const ranking = cities
    .map((city) => {
      const power = powerByCity.get(city.id) ?? { buildings: 0, army: 0, research: 0, total: 0 };
      const allianceId = memberByUserId.get(city.userId);
      return {
        cityId: city.id,
        cityName: city.name,
        userId: city.userId,
        posX: city.posX,
        posY: city.posY,
        allianceId: allianceId ?? null,
        allianceName: allianceId ? allianceByAllianceId.get(allianceId) ?? null : null,
        power: power.total,
        powerBreakdown: {
          buildings: power.buildings,
          army: power.army,
          research: power.research,
        },
      };
    })
    .sort((a, b) => b.power - a.power)
    .map((entry, index) => ({ rank: index + 1, ...entry }));

  return c.json({ ranking });
});

cityRouter.patch("/:id/name", async (c) => {
  const cityId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 30) {
    return c.json({ error: "City name must be between 2 and 30 characters" }, 400);
  }

  const cityRes = await db.from(COLLECTIONS.CITIES).eq("id", cityId).getFirst() as any;
  const city = cityRes.data;
  if (!city) return c.json({ error: "City not found" }, 404);

  await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
    name,
    updatedAt: new Date().toISOString(),
  });

  return c.json({ success: true, city: { ...city, name } });
});

// World map endpoints must be registered before "/:id" to avoid route capture.
cityRouter.get("/world-map", async (c) => {
  const [config, cities, camps] = await Promise.all([
    getWorldConfig(),
    db.from(COLLECTIONS.CITIES).limit(WORLD_MAP_CITY_LIMIT).get() as any,
    db.from(COLLECTIONS.BARBARIAN_CAMPS).eq("status", "ACTIVE").get() as any,
  ]);

  return c.json({
    map: config.map,
    spawn: config.spawn,
    cities: cities.data ?? [],
    barbarianCamps: camps.data ?? [],
  });
});

cityRouter.get("/world/movements", async (c) => {
  const movements = await getActiveMovements();
  return c.json({ movements });
});

cityRouter.get("/:id/play-initial", async (c) => {
  const startedAt = performance.now();
  const id = c.req.param("id");
  try {
    const snapshot = await getPlayInitialSnapshot(id);
    if (!snapshot) return c.json({ error: "City not found", code: "CITY_NOT_FOUND" }, 404);
    return c.json(snapshot);
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    console.error(`[play-initial] failed city=${id} ${durationMs}ms`, error);
    return c.json({
      error: error instanceof Error ? error.message : "Failed to load play initial",
      code: "PLAY_INITIAL_FAILED",
    }, 500);
  }
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
  try {
    return c.json(await createBuildingAction({ cityId, ...data, actor: { type: "human" } }));
  } catch (error) {
    return actionErrorResponse(c, error);
  }
});

// Upgrade building
cityRouter.post("/:id/buildings/:buildingId/upgrade", async (c) => {
  const cityId = c.req.param("id");
  const buildingId = c.req.param("buildingId");
  try {
    return c.json(await upgradeBuildingAction({ cityId, buildingId, actor: { type: "human" } }));
  } catch (error) {
    return actionErrorResponse(c, error);
  }
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
  await rescheduleBuildQueues(cityId, new Date(nowIso));

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
  try {
    return c.json(await trainUnitsAction({ cityId, ...data, actor: { type: "human" } }));
  } catch (error) {
    return actionErrorResponse(c, error);
  }
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
  await rescheduleTrainingQueues(cityId, new Date(nowIso));

  return c.json({ success: true, queueId, refund, resources: nextResources });
});

// Attack
cityRouter.post("/:id/attack", zValidator("json", AttackRequestSchema), async (c) => {
  const attackerCityId = c.req.param("id");
  const data = c.req.valid("json");
  try {
    return c.json(await attackCityAction({
      attackerCityId,
      targetCityId: data.targetCityId,
      units: data.units as any,
      actor: { type: "human" },
    }));
  } catch (error) {
    return actionErrorResponse(c, error);
  }
});

// Trade / Send resources
cityRouter.post("/:id/trade", zValidator("json", SendResourcesRequestSchema), async (c) => {
  const senderCityId = c.req.param("id");
  const data = c.req.valid("json");
  try {
    return c.json(await sendResourcesAction({
      senderCityId,
      recipientCityId: data.recipientCityId,
      resources: data.resources,
      actor: { type: "human" },
    }));
  } catch (error) {
    return actionErrorResponse(c, error);
  }
});

// Get queues
cityRouter.get("/:id/queue", async (c) => {
  const cityId = c.req.param("id");

  const [buildQueuesRes, trainingQueuesRes] = await Promise.all([
    db.from(COLLECTIONS.BUILD_QUEUES).eq("cityId", cityId).eq("isComplete", false).get(),
    db.from(COLLECTIONS.TRAINING_QUEUES).eq("cityId", cityId).eq("isComplete", false).get(),
  ]);

  const buildQueues = (buildQueuesRes as any).data ?? [];
  const trainingQueues = (trainingQueuesRes as any).data ?? [];

  // Sort by startedAt ascending
  buildQueues.sort((a: any, b: any) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  trainingQueues.sort((a: any, b: any) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  return c.json({ buildQueues, trainingQueues });
});

// ─── Battle Reports ───

cityRouter.get("/:id/battles/reports", async (c) => {
  const cityId = c.req.param("id");
  const reports = await prisma.battleReport.findMany({
    where: { cityId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return c.json({ reports: serializeRecord(reports) });
});

cityRouter.post("/:id/battles/reports/:reportId/read", async (c) => {
  const reportId = c.req.param("reportId");

  await prisma.battleReport.update({ where: { id: reportId }, data: { read: true } });

  return c.json({ success: true });
});

// ─── Active Battles ───

cityRouter.get("/:id/battles/active", async (c) => {
  const cityId = c.req.param("id");

  const active = await prisma.battle.findMany({
    where: {
      OR: [{ attackerCityId: cityId }, { defenderCityId: cityId }],
      status: { in: ["MARCHING", "RETURNING"] as any },
    },
    orderBy: [{ arrivesAt: "asc" }],
    take: 20,
  });

  return c.json({ battles: serializeRecord(active) });
});

// ─── Tech / Research ───

cityRouter.get("/:id/techs", async (c) => {
  const cityId = c.req.param("id");

  const [cityTechs, researchQueue] = await Promise.all([
    prisma.cityTech.findMany({ where: { cityId } }),
    prisma.researchQueue.findMany({
      where: { cityId, isComplete: false },
      orderBy: [{ completesAt: "asc" }, { startedAt: "asc" }],
    }),
  ]);

  return c.json(buildTechResponse(cityTechs, researchQueue));
});

cityRouter.post("/:id/research", zValidator("json", StartResearchRequestSchema), async (c) => {
  const cityId = c.req.param("id");
  const data = c.req.valid("json");
  try {
    return c.json(await startResearchAction({ cityId, techId: data.techId, actor: { type: "human" } }));
  } catch (error) {
    return actionErrorResponse(c, error);
  }
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
  await rescheduleResearchQueues(cityId, new Date(nowIso));

  return c.json({ success: true, queueId, refund, resources: nextResources });
});

export { cityRouter };
