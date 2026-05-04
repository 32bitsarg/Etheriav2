import type { BuildingType, UnitType } from "@etheria/shared";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { mergeRecordBySelector } from "../infrastructure/matecitoRecord.js";
import { calculateTravelTime } from "./battles.js";
import {
  calculateCityStats,
  getBuildingCost,
  getBuildingMaxLevelForTownHall,
  getBuildingTime,
} from "./buildings.js";
import { canAfford, subtractResources } from "./resources.js";
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

const genId = () => crypto.randomUUID();

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

  return {
    ...city,
    buildings,
    units: unitsRes.data ?? [],
    cityTechs,
    researchQueue: researchQueueRes.data ?? [],
    buildQueues: buildQueuesRes.data ?? [],
    trainingQueues: trainingQueuesRes.data ?? [],
    activeResearch: researchQueueRes.data?.[0] ?? null,
    resources: {
      gold: city.gold,
      wood: city.wood,
      stone: city.stone,
      food: city.food,
      gems: city.gems ?? 0,
    },
    production: stats.production,
    maxGold: city.maxGold,
    maxWood: city.maxWood,
    maxStone: city.maxStone,
    maxFood: city.maxFood,
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

  const nextLevel = building.level + 1;
  const cost = getBuildingCost(building.type as BuildingType, nextLevel);
  if (!canAfford(city.resources, cost)) {
    throw new CityActionError("Not enough resources", 400, { required: cost, available: city.resources, blockedBy: "resources" });
  }

  const buildTime = getBuildingTime(building.type as BuildingType, nextLevel);
  const now = new Date();
  const nowIso = now.toISOString();
  const completesAt = new Date(now.getTime() + buildTime * 1000).toISOString();
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
    startedAt: nowIso,
    completesAt,
    isComplete: false,
  });

  return {
    success: true,
    nextLevel,
    completesIn: buildTime,
    completesAt,
    resources: newResources,
    queue: {
      id: queueId,
      cityId: input.cityId,
      buildingId: input.buildingId,
      buildingType: building.type,
      targetLevel: nextLevel,
      startedAt: nowIso,
      completesAt,
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
  const completesAt = new Date(now.getTime() + trainingTime * 1000).toISOString();
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
    id: genId(),
    cityId: input.cityId,
    unitType: input.unitType,
    count: input.count,
    startedAt: nowIso,
    completesAt,
    isComplete: false,
  });

  return { success: true, completesIn: trainingTime, completesAt };
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
  const activeResearch = researchQueueRes.data?.[0] ?? null;

  const cfg = getAllTechConfigs().find((t) => t.techId === input.techId);
  if (!cfg) throw new CityActionError("Tech not found", 404);

  const currentLevel = cityTechs.find((t: any) => t.techId === input.techId)?.level ?? 0;
  const targetLevel = currentLevel + 1;
  const check = canResearch(input.techId as any, targetLevel, cityTechs, activeResearch);
  if (!check.allowed) throw new CityActionError(check.reason ?? "Research blocked", 400, { blockedBy: "queue" });

  const cost = getResearchCost(input.techId as any, targetLevel);
  const researchTime = getResearchTime(input.techId as any, targetLevel);
  if (!canAfford(city.resources, cost)) {
    throw new CityActionError("Not enough resources", 400, { required: cost, available: city.resources, blockedBy: "resources" });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const completesAt = new Date(now.getTime() + researchTime * 1000).toISOString();
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
    id: genId(),
    cityId: input.cityId,
    techId: input.techId,
    targetLevel,
    startedAt: nowIso,
    completesAt,
    isComplete: false,
  });

  return { success: true, techId: input.techId, targetLevel, completesIn: researchTime, completesAt };
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

  await db.from(COLLECTIONS.BATTLES).insert({
    id: battleId,
    attackerCityId: input.attackerCityId,
    defenderCityId: input.targetCityId,
    status: "MARCHING",
    startedAt: nowIso,
    arrivesAt,
    units: input.units.map((u) => ({ type: u.type, count: u.count })),
  });

  for (const unit of input.units) {
    const existing = attackerCity.units.find((u: any) => u.type === unit.type);
    if (existing) {
      await mergeRecordBySelector(COLLECTIONS.UNITS, existing, { count: existing.count - unit.count });
    }
  }

  return { battleId, travelTime, arrivesAt };
}
