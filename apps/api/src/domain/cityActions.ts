import type { BuildingType, UnitType } from "@etheria/shared";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { mergeRecordBySelector } from "../infrastructure/matecitoRecord.js";
import { calculateTravelTimeWithMultiplier } from "./battles.js";
import { getWorldConfig } from "./worldConfig.js";
import { calculatePathSpeedMultiplier } from "./worldTerrainConfigData.js";
import {
  calculateCityStats,
  getBuildingCost,
  getBuildingMaxLevelForTownHall,
  getBuildingTime,
} from "./buildings.js";
import { calculateResources, canAfford, subtractResources } from "./resources.js";
import {
  calculateTechBonuses,
  canResearch,
  getAllTechConfigs,
  getResearchCost,
  getResearchTime,
} from "./techs.js";
import {
  applyTrainingCostReduction,
  getTrainingTime,
  getUnitCost,
  getUnitStats,
} from "./units.js";
import { getCityQueueConfig, type CityQueueKind } from "./queueConfigData.js";
import { advanceQuest } from "./quests.js";
import { createGameReport } from "./reports.js";

const genId = () => crypto.randomUUID();

function formatTravelTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

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

export type CityActionActor = {
  type: "human" | "bot";
  userId?: string;
  botId?: string;
};

export class CityActionError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly details: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

type CitySnapshot = any;

function sortPendingQueues<T extends { startedAt?: string; completesAt?: string }>(queues: T[]): T[] {
  return [...queues].sort((a, b) => {
    const completesDiff = new Date(a.completesAt ?? 0).getTime() - new Date(b.completesAt ?? 0).getTime();
    if (completesDiff !== 0) return completesDiff;
    return new Date(a.startedAt ?? 0).getTime() - new Date(b.startedAt ?? 0).getTime();
  });
}

function assertQueueSlotAvailable(kind: CityQueueKind, pendingQueues: unknown[]) {
  const config = getCityQueueConfig();
  const maxSlots = config.maxSlots[kind];
  if (pendingQueues.length >= maxSlots) {
    throw new CityActionError("Queue slots full", 409, { blockedBy: "queue", kind, maxSlots });
  }
}

function scheduleSequentialQueue(kind: CityQueueKind, pendingQueues: Array<{ completesAt?: string }>, durationSeconds: number, now: Date) {
  const config = getCityQueueConfig();
  const activeSlots = Math.min(config.activeSlots[kind], config.maxSlots[kind]);
  const sorted = sortPendingQueues(pendingQueues);
  const activeAnchor = sorted.length >= activeSlots ? sorted[sorted.length - activeSlots]?.completesAt : null;
  const startAtMs = Math.max(now.getTime(), activeAnchor ? new Date(activeAnchor).getTime() : now.getTime());
  const startedAt = new Date(startAtMs);
  const completesAt = new Date(startAtMs + durationSeconds * 1000);
  return {
    startedAt: startedAt.toISOString(),
    completesAt: completesAt.toISOString(),
  };
}

async function loadCityActionSnapshot(cityId: string): Promise<CitySnapshot | null> {
  const [cityRes, buildingsRes, unitsRes, cityTechsRes, researchQueueRes, buildQueuesRes, trainingQueuesRes] = await Promise.all([
    db.from(COLLECTIONS.CITIES).eq("id", cityId).getFirst() as any,
    db.from(COLLECTIONS.BUILDINGS).eq("cityId", cityId).get() as any,
    db.from(COLLECTIONS.UNITS).eq("cityId", cityId).get() as any,
    db.from(COLLECTIONS.CITY_TECHS).eq("cityId", cityId).get() as any,
    db.from(COLLECTIONS.RESEARCH_QUEUES).eq("cityId", cityId).eq("isComplete", false).get() as any,
    db.from(COLLECTIONS.BUILD_QUEUES).eq("cityId", cityId).eq("isComplete", false).get() as any,
    db.from(COLLECTIONS.TRAINING_QUEUES).eq("cityId", cityId).eq("isComplete", false).get() as any,
  ]);

  const city = cityRes.data;
  if (!city) return null;

  const buildings = buildingsRes.data ?? [];
  const stats = calculateCityStats(buildings);
  const cityTechs = cityTechsRes.data ?? [];
  const techBonuses = city.techBonuses ?? calculateTechBonuses(cityTechs.map((tech: any) => ({ techId: tech.techId, level: tech.level })));
  const resourceSnapshotAt = new Date();
  const resources = calculateResources(
    { gold: city.gold, wood: city.wood, stone: city.stone, food: city.food, gems: city.gems ?? 0 },
    stats.production,
    stats.storage,
    new Date(city.lastResourceUpdate ?? city.createdAt),
    resourceSnapshotAt
  );

  const researchQueue = sortPendingQueues(researchQueueRes.data ?? []);
  const buildQueues = sortPendingQueues(buildQueuesRes.data ?? []);
  const trainingQueues = sortPendingQueues(trainingQueuesRes.data ?? []);

  return {
    ...city,
    buildings,
    units: unitsRes.data ?? [],
    cityTechs,
    researchQueue,
    buildQueues,
    trainingQueues,
    activeResearch: researchQueue[0] ?? null,
    lastResourceUpdate: resourceSnapshotAt.toISOString(),
    resources,
    production: stats.production,
    maxGold: stats.storage.maxGold,
    maxWood: stats.storage.maxWood,
    maxStone: stats.storage.maxStone,
    maxFood: stats.storage.maxFood,
    techBonuses,
  };
}

async function getCitySnapshot(cityId: string, snapshot?: CitySnapshot) {
  const city = snapshot ?? await loadCityActionSnapshot(cityId);
  if (!city) throw new CityActionError("City not found", 404);
  return city;
}

async function refreshCityStats(cityId: string) {
  const buildingsRes = await db.from(COLLECTIONS.BUILDINGS).eq("cityId", cityId).get() as any;
  const stats = calculateCityStats(buildingsRes.data ?? []);
  await db.from(COLLECTIONS.CITIES).eq("id", cityId).merge({
    goldPerHour: stats.production.goldPerHour,
    woodPerHour: stats.production.woodPerHour,
    stonePerHour: stats.production.stonePerHour,
    foodPerHour: stats.production.foodPerHour,
    maxGold: stats.storage.maxGold,
    maxWood: stats.storage.maxWood,
    maxStone: stats.storage.maxStone,
    maxFood: stats.storage.maxFood,
  }).execute() as any;
}

export async function createBuildingAction(input: {
  cityId: string;
  type: BuildingType;
  positionX: number;
  positionY: number;
  actor: CityActionActor;
  citySnapshot?: CitySnapshot;
}) {
  const city = await getCitySnapshot(input.cityId, input.citySnapshot);
  const existingCount = city.buildings.filter((b: any) => {
    if (input.type === "TOWER") return b.type === "TOWER" || b.type === "WALL";
    return b.type === input.type;
  }).length;
  if (existingCount >= 1) throw new CityActionError(`Maximum 1 ${input.type} allowed`, 400);

  const size = BUILDING_SIZES[input.type] ?? { w: 1, h: 1 };
  const isAreaFree = !city.buildings.some((building: any) => {
    const buildingSize = BUILDING_SIZES[building.type] ?? { w: 1, h: 1 };
    return (
      input.positionX < building.positionX + buildingSize.w &&
      input.positionX + size.w > building.positionX &&
      input.positionY < building.positionY + buildingSize.h &&
      input.positionY + size.h > building.positionY
    );
  });
  if (!isAreaFree) throw new CityActionError("Area occupied", 400);

  const cost = getBuildingCost(input.type, 1);
  if (!canAfford(city.resources, cost)) {
    throw new CityActionError("Not enough resources", 400, { required: cost, available: city.resources });
  }

  const now = new Date().toISOString();
  const buildingId = genId();
  const newResources = subtractResources(city.resources, cost);
  await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
    gold: newResources.gold,
    wood: newResources.wood,
    stone: newResources.stone,
    food: newResources.food,
    gems: newResources.gems,
    lastResourceUpdate: now,
  });
  await db.from(COLLECTIONS.BUILDINGS).insert({
    id: buildingId,
    cityId: input.cityId,
    type: input.type,
    level: 1,
    positionX: input.positionX,
    positionY: input.positionY,
    createdAt: now,
    upgradedAt: now,
  });
  await refreshCityStats(input.cityId);
  await advanceQuest(input.cityId, "BUILD_OR_UPGRADE", 1);

  return {
    building: { id: buildingId, type: input.type, level: 1, positionX: input.positionX, positionY: input.positionY },
    message: "Building created",
  };
}

export async function upgradeBuildingAction(input: {
  cityId: string;
  buildingId: string;
  actor: CityActionActor;
  citySnapshot?: CitySnapshot;
}) {
  const city = await getCitySnapshot(input.cityId, input.citySnapshot);
  const building = city.buildings.find((b: any) => b.id === input.buildingId);
  if (!building) throw new CityActionError("Building not found", 404);

  const townHall = city.buildings.find((b: any) => b.type === "TOWN_HALL");
  const townHallLevel = townHall?.level ?? 1;
  const maxLevel = getBuildingMaxLevelForTownHall(townHallLevel, building.type as BuildingType);
  if (building.level >= maxLevel) throw new CityActionError("Max level reached", 400);

  const pendingQueueRes = await db.from(COLLECTIONS.BUILD_QUEUES)
    .eq("cityId", input.cityId)
    .eq("buildingType", building.type)
    .eq("isComplete", false)
    .get() as any;
  if ((pendingQueueRes.data ?? []).length > 0) {
    throw new CityActionError("Upgrade already queued", 409, { blockedBy: "queue" });
  }
  const activeBuildQueues = sortPendingQueues(city.buildQueues ?? []);
  assertQueueSlotAvailable("construction", activeBuildQueues);

  const nextLevel = building.level + 1;
  const cost = getBuildingCost(building.type as BuildingType, nextLevel);
  if (!canAfford(city.resources, cost)) {
    throw new CityActionError("Not enough resources", 400, { required: cost, available: city.resources, blockedBy: "resources" });
  }

  const buildTime = getBuildingTime(building.type as BuildingType, nextLevel);
  const now = new Date();
  const nowIso = now.toISOString();
  const schedule = scheduleSequentialQueue("construction", activeBuildQueues, buildTime, now);
  const queueId = genId();
  const newResources = subtractResources(city.resources, cost);

  await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
    gold: newResources.gold,
    wood: newResources.wood,
    stone: newResources.stone,
    food: newResources.food,
    gems: newResources.gems,
    lastResourceUpdate: nowIso,
  });
  await db.from(COLLECTIONS.BUILD_QUEUES).insert({
    id: queueId,
    cityId: input.cityId,
    buildingId: input.buildingId,
    buildingType: building.type,
    targetLevel: nextLevel,
    startedAt: schedule.startedAt,
    completesAt: schedule.completesAt,
    isComplete: false,
  });
  await advanceQuest(input.cityId, "BUILD_OR_UPGRADE", 1);

  return {
    success: true,
    nextLevel,
    completesIn: buildTime,
    completesAt: schedule.completesAt,
    resources: newResources,
    queue: {
      id: queueId,
      cityId: input.cityId,
      buildingId: input.buildingId,
      buildingType: building.type,
      targetLevel: nextLevel,
      startedAt: schedule.startedAt,
      completesAt: schedule.completesAt,
      isComplete: false,
    },
  };
}

export async function trainUnitsAction(input: {
  cityId: string;
  unitType: UnitType;
  count: number;
  actor: CityActionActor;
  citySnapshot?: CitySnapshot;
}) {
  const city = await getCitySnapshot(input.cityId, input.citySnapshot);
  const activeTrainingQueues = sortPendingQueues(city.trainingQueues ?? []);
  assertQueueSlotAvailable("training", activeTrainingQueues);
  const cost = applyTrainingCostReduction(
    getUnitCost(input.unitType, input.count),
    city.techBonuses?.trainingCostReduction ?? 0
  );
  if (!canAfford(city.resources, cost)) {
    throw new CityActionError("Not enough resources", 400, { required: cost, available: city.resources, blockedBy: "resources" });
  }

  const trainingTime = getTrainingTime(input.unitType, input.count);
  const now = new Date();
  const nowIso = now.toISOString();
  const schedule = scheduleSequentialQueue("training", activeTrainingQueues, trainingTime, now);
  const queueId = genId();
  const newResources = subtractResources(city.resources, cost);

  await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
    gold: newResources.gold,
    wood: newResources.wood,
    stone: newResources.stone,
    food: newResources.food,
    gems: newResources.gems,
    lastResourceUpdate: nowIso,
  });
  await db.from(COLLECTIONS.TRAINING_QUEUES).insert({
    id: queueId,
    cityId: input.cityId,
    unitType: input.unitType,
    count: input.count,
    startedAt: schedule.startedAt,
    completesAt: schedule.completesAt,
    isComplete: false,
  });
  await advanceQuest(input.cityId, "TRAIN_UNITS", input.count);

  return {
    success: true,
    completesIn: trainingTime,
    completesAt: schedule.completesAt,
    resources: newResources,
    queue: {
      id: queueId,
      cityId: input.cityId,
      unitType: input.unitType,
      count: input.count,
      startedAt: schedule.startedAt,
      completesAt: schedule.completesAt,
      isComplete: false,
    },
  };
}

export async function startResearchAction(input: {
  cityId: string;
  techId: string;
  actor: CityActionActor;
  citySnapshot?: CitySnapshot;
}) {
  const city = await getCitySnapshot(input.cityId, input.citySnapshot);
  const cityTechsRes = await db.from(COLLECTIONS.CITY_TECHS).eq("cityId", input.cityId).get() as any;
  const researchQueueRes = await db.from(COLLECTIONS.RESEARCH_QUEUES).eq("cityId", input.cityId).eq("isComplete", false).get() as any;
  const cityTechs = (cityTechsRes.data ?? []).map((t: any) => ({ techId: t.techId, level: t.level }));
  const activeResearchQueues = sortPendingQueues(researchQueueRes.data ?? []);
  assertQueueSlotAvailable("research", activeResearchQueues);

  const cfg = getAllTechConfigs().find((t) => t.techId === input.techId);
  if (!cfg) throw new CityActionError("Tech not found", 404);

  const currentLevel = cityTechs.find((t: any) => t.techId === input.techId)?.level ?? 0;
  const pendingSameTech = activeResearchQueues.filter((queue: any) => queue.techId === input.techId).length;
  const targetLevel = currentLevel + pendingSameTech + 1;
  const check = canResearch(input.techId as any, currentLevel + 1, cityTechs, null);
  if (!check.allowed) throw new CityActionError(check.reason ?? "Research blocked", 400, { blockedBy: "queue" });
  if (targetLevel > cfg.maxLevel) throw new CityActionError("Max level reached", 400);

  const cost = getResearchCost(input.techId as any, targetLevel);
  const researchTime = getResearchTime(input.techId as any, targetLevel);
  if (!canAfford(city.resources, cost)) {
    throw new CityActionError("Not enough resources", 400, { required: cost, available: city.resources, blockedBy: "resources" });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const schedule = scheduleSequentialQueue("research", activeResearchQueues, researchTime, now);
  const queueId = genId();
  const newResources = subtractResources(city.resources, cost);

  await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
    gold: newResources.gold,
    wood: newResources.wood,
    stone: newResources.stone,
    food: newResources.food,
    gems: newResources.gems,
    lastResourceUpdate: nowIso,
  });
  await db.from(COLLECTIONS.RESEARCH_QUEUES).insert({
    id: queueId,
    cityId: input.cityId,
    techId: input.techId,
    targetLevel,
    startedAt: schedule.startedAt,
    completesAt: schedule.completesAt,
    isComplete: false,
  });
  await advanceQuest(input.cityId, "RESEARCH", 1);

  return {
    success: true,
    techId: input.techId,
    targetLevel,
    completesIn: researchTime,
    completesAt: schedule.completesAt,
    resources: newResources,
    queue: {
      id: queueId,
      cityId: input.cityId,
      techId: input.techId,
      targetLevel,
      startedAt: schedule.startedAt,
      completesAt: schedule.completesAt,
      isComplete: false,
    },
  };
}

export async function attackCityAction(input: {
  attackerCityId: string;
  targetCityId: string;
  units: Array<{ type: UnitType; count: number }>;
  actor: CityActionActor;
  citySnapshot?: CitySnapshot;
}) {
  const attackerCity = await getCitySnapshot(input.attackerCityId, input.citySnapshot);
  const defenderRes = await db.from(COLLECTIONS.CITIES).eq("id", input.targetCityId).getFirst() as any;
  const defenderCity = defenderRes.data;
  if (!defenderCity) throw new CityActionError("Target city not found", 404);

  for (const unit of input.units) {
    const available = attackerCity.units.find((u: any) => u.type === unit.type);
    if (!available || available.count < unit.count) {
      throw new CityActionError(`Not enough ${unit.type}`, 400);
    }
  }

  const speeds = input.units.map((u) => getUnitStats(u.type, 1, attackerCity.techBonuses).speed);
  const minSpeed = Math.min(...speeds);
  const world = await getWorldConfig();
  const terrainSpeed = calculatePathSpeedMultiplier(attackerCity.posX, attackerCity.posY, defenderCity.posX, defenderCity.posY, world.map.width, world.map.height);
  const travelTime = calculateTravelTimeWithMultiplier(
    attackerCity.posX,
    attackerCity.posY,
    defenderCity.posX,
    defenderCity.posY,
    minSpeed,
    terrainSpeed
  );
  const now = new Date();
  const nowIso = now.toISOString();
  const arrivesAt = new Date(now.getTime() + travelTime * 1000).toISOString();
  const battleId = genId();

  await db.from(COLLECTIONS.BATTLES).insert({
    id: battleId,
    attackerCityId: input.attackerCityId,
    defenderCityId: input.targetCityId,
    status: "MARCHING",
    startedAt: nowIso,
    arrivesAt,
    units: input.units.map((u) => ({ type: u.type, count: u.count })),
  });

  await createGameReport({
    type: "INCOMING_ATTACK",
    userId: defenderCity.userId,
    cityId: input.targetCityId,
    title: `Incoming attack from ${attackerCity.name}`,
    summary: `${attackerCity.name} is attacking. Enemy troops arrive in ${formatTravelTime(travelTime)}.`,
    payload: { attackerCityId: input.attackerCityId, attackerName: attackerCity.name, arrivesAt, battleId, units: input.units },
  });

  for (const unit of input.units) {
    const existing = attackerCity.units.find((u: any) => u.type === unit.type);
    if (existing) {
      await mergeRecordBySelector(COLLECTIONS.UNITS, existing, { count: existing.count - unit.count });
    }
  }

  return { battleId, travelTime, arrivesAt };
}

export async function attackBarbarianCampAction(input: {
  attackerCityId: string;
  targetCampId: string;
  units: Array<{ type: UnitType; count: number }>;
  actor: CityActionActor;
  citySnapshot?: CitySnapshot;
}) {
  const attackerCity = await getCitySnapshot(input.attackerCityId, input.citySnapshot);
  const campRes = await db.from(COLLECTIONS.BARBARIAN_CAMPS).eq("id", input.targetCampId).getFirst() as any;
  const camp = campRes.data;
  if (!camp) throw new CityActionError("Barbarian camp not found", 404);

  for (const unit of input.units) {
    const available = attackerCity.units.find((u: any) => u.type === unit.type);
    if (!available || available.count < unit.count) {
      throw new CityActionError(`Not enough ${unit.type}`, 400);
    }
  }

  const speeds = input.units.map((u) => getUnitStats(u.type, 1, attackerCity.techBonuses).speed);
  const minSpeed = Math.min(...speeds);
  const world = await getWorldConfig();
  const terrainSpeed = calculatePathSpeedMultiplier(attackerCity.posX, attackerCity.posY, camp.posX, camp.posY, world.map.width, world.map.height);
  const travelTime = calculateTravelTimeWithMultiplier(
    attackerCity.posX,
    attackerCity.posY,
    camp.posX,
    camp.posY,
    minSpeed,
    terrainSpeed
  );
  
  const now = new Date();
  const nowIso = now.toISOString();
  const arrivesAt = new Date(now.getTime() + travelTime * 1000).toISOString();
  const battleId = genId();

  await db.from(COLLECTIONS.BARBARIAN_BATTLES).insert({
    id: battleId,
    attackerCityId: input.attackerCityId,
    targetCampId: input.targetCampId,
    status: "MARCHING",
    startedAt: nowIso,
    arrivesAt,
    units: input.units.map((u) => ({ type: u.type, count: u.count })),
  });
  await advanceQuest(input.attackerCityId, "ATTACK_BARBARIAN", 1);

  for (const unit of input.units) {
    const existing = attackerCity.units.find((u: any) => u.type === unit.type);
    if (existing) {
      await mergeRecordBySelector(COLLECTIONS.UNITS, existing, { count: existing.count - unit.count });
    }
  }

  return { battleId, travelTime, arrivesAt };
}
