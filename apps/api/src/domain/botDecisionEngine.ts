import type { BuildingType, UnitType, Resources } from "@etheria/shared";
import { getBuildingCost, getBuildingMaxLevelForTownHall } from "./buildings.js";
import { canAfford } from "./resources.js";
import { getAllTechConfigs, canResearch, getResearchCost } from "./techs.js";
import { getUnlockedUnits, getUnitCost } from "./units.js";
import type { BotProfile, BotSimulationConfig } from "./botConfigData.js";
import { getCityQueueConfig } from "./queueConfigData.js";

export type BotActionType = "UPGRADE_BUILDING" | "TRAIN_UNITS" | "START_RESEARCH" | "ATTACK_CITY" | "ATTACK_BARBARIAN" | "SEND_RESOURCES" | "IDLE";
export type BotSocialActionType = "CREATE_ALLIANCE" | "JOIN_ALLIANCE" | "SEND_CHAT" | "SEND_MAIL";

export type BotDecision =
  | { type: "UPGRADE_BUILDING"; reason: string; payload: { buildingId: string; buildingType: BuildingType }; score: number }
  | { type: "TRAIN_UNITS"; reason: string; payload: { unitType: UnitType; count: number }; score: number }
  | { type: "START_RESEARCH"; reason: string; payload: { techId: string }; score: number }
  | { type: "ATTACK_CITY"; reason: string; payload: { targetCityId: string; units: Array<{ type: UnitType; count: number }> }; score: number }
  | { type: "ATTACK_BARBARIAN"; reason: string; payload: { targetCampId: string; units: Array<{ type: UnitType; count: number }> }; score: number }
  | { type: "SEND_RESOURCES"; reason: string; payload: { recipientCityId: string; resources: Resources }; score: number }
  | { type: BotSocialActionType; reason: string; payload: Record<string, any>; score: number }
  | { type: "IDLE"; reason: string; payload: Record<string, never>; score: number };

export type BotSnapshot = {
  city: any;
  buildings: any[];
  units: any[];
  cityTechs: any[];
  activeBuildQueues: any[];
  activeTrainingQueues: any[];
  activeResearch: any | null;
  activeResearchQueues?: any[];
  allianceMembership?: any | null;
  alliances?: any[];
  activeOutgoingBattles: any[];
  targets: any[];
  barbarianCamps: any[];
  seasonState: any | null;
  state: any;
};

const ECONOMY_BUILDINGS: BuildingType[] = ["GOLD_MINE", "LUMBER_MILL", "QUARRY", "FARM", "STORAGE", "TOWN_HALL"];
const MILITARY_BUILDINGS: BuildingType[] = ["BARRACKS", "STABLE", "TOWER", "TOWN_HALL"];
const TECH_BUILDINGS: BuildingType[] = ["LIBRARY", "TOWN_HALL", "STORAGE"];
const BALANCED_BUILDINGS: BuildingType[] = ["TOWN_HALL", "GOLD_MINE", "LUMBER_MILL", "FARM", "BARRACKS", "LIBRARY", "STORAGE", "TOWER"];

function resourcesOf(city: any) {
  return {
    gold: city.gold ?? 0,
    wood: city.wood ?? 0,
    stone: city.stone ?? 0,
    food: city.food ?? 0,
    gems: city.gems ?? 0,
  };
}

function capsOf(city: any) {
  return {
    gold: city.maxGold ?? 1,
    wood: city.maxWood ?? 1,
    stone: city.maxStone ?? 1,
    food: city.maxFood ?? 1,
  };
}

function criticalResources(snapshot: BotSnapshot, config: BotSimulationConfig) {
  const resources = resourcesOf(snapshot.city);
  const caps = capsOf(snapshot.city);
  return (["gold", "wood", "stone", "food"] as const).filter((key) => resources[key] <= caps[key] * config.criticalResourceRatio);
}

function canSpendWithoutBreakingReserve(resources: Resources, caps: ReturnType<typeof capsOf>, cost: Resources, config: BotSimulationConfig, protectedKeys: Array<keyof Resources>) {
  if (!canAfford(resources, cost)) return false;
  return protectedKeys.every((key) => {
    if (key === "gems") return true;
    return (resources[key] - (cost[key] ?? 0)) >= caps[key] * config.resourceReserveRatio;
  });
}

function preferredBuildings(profile: BotProfile): BuildingType[] {
  if (profile === "ECONOMIST") return ECONOMY_BUILDINGS;
  if (profile === "MILITARIST") return MILITARY_BUILDINGS;
  if (profile === "TECH_RUSHER") return TECH_BUILDINGS;
  return BALANCED_BUILDINGS;
}

function chooseUpgrade(snapshot: BotSnapshot, profile: BotProfile, config: BotSimulationConfig): BotDecision | null {
  const queueConfig = getCityQueueConfig();
  if (snapshot.activeBuildQueues.length >= queueConfig.maxSlots.construction) {
    return { type: "IDLE", reason: "build queue full", payload: {}, score: 0 };
  }

  const resources = resourcesOf(snapshot.city);
  const caps = capsOf(snapshot.city);
  const critical = criticalResources(snapshot, config);
  const townHall = snapshot.buildings.find((b) => b.type === "TOWN_HALL");
  const townHallLevel = townHall?.level ?? 1;
  const weights = config.profileWeights[profile];
  const isWinter = snapshot.seasonState?.currentSeason === "WINTER";

  const buildings = [...preferredBuildings(profile)];
  if (critical.includes("wood")) buildings.unshift("LUMBER_MILL", "STORAGE");
  if (critical.includes("food")) buildings.unshift("FARM", "STORAGE");
  if (critical.includes("gold")) buildings.unshift("GOLD_MINE", "STORAGE");
  if (critical.includes("stone")) buildings.unshift("QUARRY", "STORAGE");
  if (isWinter) {
    buildings.unshift("FARM", "STORAGE");
  }

  for (const type of buildings) {
    const building = snapshot.buildings.find((b) => b.type === type);
    if (!building) continue;
    const maxLevel = getBuildingMaxLevelForTownHall(townHallLevel, type);
    if ((building.level ?? 1) >= maxLevel) continue;
    const nextLevel = (building.level ?? 1) + 1;
    const cost = getBuildingCost(type, nextLevel);
    if (!canSpendWithoutBreakingReserve(resources, caps, cost, config, critical as Array<keyof Resources>)) continue;
    return {
      type: "UPGRADE_BUILDING",
      reason: isWinter && (type === "FARM" || type === "STORAGE") ? `${profile} WINTER food priority` : `${profile} upgrade priority ${type}`,
      payload: { buildingId: building.id, buildingType: type },
      score: weights.economy + (type === "TOWN_HALL" ? 2 : 0) + (isWinter && type === "FARM" ? 3 : 0),
    };
  }

  return null;
}

function chooseResearch(snapshot: BotSnapshot, profile: BotProfile, config: BotSimulationConfig): BotDecision | null {
  const queueConfig = getCityQueueConfig();
  const activeResearchQueues = snapshot.activeResearchQueues ?? (snapshot.activeResearch ? [snapshot.activeResearch] : []);
  if (activeResearchQueues.length >= queueConfig.maxSlots.research) {
    return { type: "IDLE", reason: "research queue full", payload: {}, score: 0 };
  }

  const cityTechs = snapshot.cityTechs.map((tech) => ({ techId: tech.techId, level: tech.level }));
  const resources = resourcesOf(snapshot.city);
  const caps = capsOf(snapshot.city);
  const critical = criticalResources(snapshot, config);
  const weights = config.profileWeights[profile];
  const configs = getAllTechConfigs()
    .map((cfg) => {
      const currentLevel = cityTechs.find((tech) => tech.techId === cfg.techId)?.level ?? 0;
      return { cfg, targetLevel: currentLevel + 1 };
    })
    .filter(({ cfg, targetLevel }) => targetLevel <= cfg.maxLevel)
    .sort((a, b) => {
      const aText = `${a.cfg.name} ${a.cfg.description}`.toLowerCase();
      const bText = `${b.cfg.name} ${b.cfg.description}`.toLowerCase();
      const aFav = profile === "MILITARIST" ? /attack|unit|siege|cavalry|archer/.test(aText) : /resource|production|storage|building/.test(aText);
      const bFav = profile === "MILITARIST" ? /attack|unit|siege|cavalry|archer/.test(bText) : /resource|production|storage|building/.test(bText);
      return Number(bFav) - Number(aFav);
    });

  for (const { cfg, targetLevel } of configs) {
    const check = canResearch(cfg.techId, targetLevel, cityTechs, null);
    if (!check.allowed) continue;
    const cost = getResearchCost(cfg.techId, targetLevel);
    if (!canSpendWithoutBreakingReserve(resources, caps, cost, config, critical as Array<keyof Resources>)) continue;
    return {
      type: "START_RESEARCH",
      reason: `${profile} research priority ${cfg.techId}`,
      payload: { techId: cfg.techId },
      score: weights.research,
    };
  }

  return null;
}

function chooseTraining(snapshot: BotSnapshot, profile: BotProfile, config: BotSimulationConfig): BotDecision | null {
  const queueConfig = getCityQueueConfig();
  if (snapshot.activeTrainingQueues.length >= queueConfig.maxSlots.training) {
    return { type: "IDLE", reason: "training queue full", payload: {}, score: 0 };
  }

  const resources = resourcesOf(snapshot.city);
  const caps = capsOf(snapshot.city);
  const critical = criticalResources(snapshot, config);
  const unlocked = getUnlockedUnits(snapshot.cityTechs);
  const preferred: UnitType[] = profile === "MILITARIST"
    ? ["CAVALRY", "SIEGE", "ARCHER", "WARRIOR", "SPY"]
    : ["WARRIOR", "ARCHER", "CAVALRY", "SPY", "SIEGE"];
  const unitType = preferred.find((type) => unlocked.includes(type)) ?? "WARRIOR";

  for (const count of [10, 5, 2, 1]) {
    const cost = getUnitCost(unitType, count);
    if (canSpendWithoutBreakingReserve(resources, caps, cost, config, critical as Array<keyof Resources>)) {
      return {
        type: "TRAIN_UNITS",
        reason: `${profile} train ${unitType}`,
        payload: { unitType, count },
        score: config.profileWeights[profile].military,
      };
    }
  }

  return null;
}

function chooseSocial(snapshot: BotSnapshot, profile: BotProfile, config: BotSimulationConfig): BotDecision | null {
  if (Math.random() > config.socialActionChance) return null;
  const allianceCenter = snapshot.buildings.find((b) => b.type === "ALLIANCE_CENTER");
  const canUseAlliance = (allianceCenter?.level ?? 0) >= config.allianceCenterRequiredLevel;
  const membership = snapshot.allianceMembership;

  if (!membership && canUseAlliance) {
    const activeAlliances = (snapshot.alliances ?? []).filter((alliance) => !alliance.disbandedAt);
    const joinTarget = activeAlliances
      .filter((alliance) => Number(alliance.honorScore ?? 100) >= 60)
      .sort((a, b) => Number(b.honorScore ?? 100) - Number(a.honorScore ?? 100))[0];

    if (joinTarget && profile !== "ECONOMIST") {
      return {
        type: "JOIN_ALLIANCE",
        reason: `${profile} joins reputable alliance`,
        payload: { allianceId: joinTarget.id },
        score: 2.2,
      };
    }

    if (profile === "ECONOMIST" || profile === "BALANCED") {
      return {
        type: "CREATE_ALLIANCE",
        reason: `${profile} founds alliance`,
        payload: {},
        score: 2.0,
      };
    }
  }

  if (Math.random() <= config.chatActionChance) {
    const channel = membership?.allianceId ? "ALLIANCE" : "GLOBAL";
    return {
      type: "SEND_CHAT",
      reason: `${profile} social presence`,
      payload: { channel },
      score: 0.6,
    };
  }

  const target = snapshot.targets[0];
  if (target && profile === "BALANCED" && Math.random() <= config.chatActionChance) {
    return {
      type: "SEND_MAIL",
      reason: `${profile} diplomatic mail`,
      payload: { recipientCityId: target.id },
      score: 0.5,
    };
  }

  return null;
}

function chooseTrade(snapshot: BotSnapshot, profile: BotProfile, config: BotSimulationConfig): BotDecision | null {
  const market = snapshot.buildings.find((b) => b.type === "MARKET");
  if (!market || market.level < config.tradeMinMarketLevel) return null;

  const resources = resourcesOf(snapshot.city);
  const caps = { gold: snapshot.city.maxGold, wood: snapshot.city.maxWood, stone: snapshot.city.maxStone, food: snapshot.city.maxFood };
  
  const excess: Partial<Resources> = {};
  let totalExcess = 0;
  if (resources.gold > caps.gold * 0.85) { excess.gold = Math.floor(resources.gold * 0.2); totalExcess += excess.gold; }
  if (resources.wood > caps.wood * 0.85) { excess.wood = Math.floor(resources.wood * 0.2); totalExcess += excess.wood; }
  if (resources.stone > caps.stone * 0.85) { excess.stone = Math.floor(resources.stone * 0.2); totalExcess += excess.stone; }
  if (resources.food > caps.food * 0.85) { excess.food = Math.floor(resources.food * 0.2); totalExcess += excess.food; }

  if (totalExcess < 100) return null;

  const target = snapshot.targets[Math.floor(Math.random() * snapshot.targets.length)];
  if (!target) return null;

  return {
    type: "SEND_RESOURCES",
    reason: `${profile} excess resources trade`,
    payload: { recipientCityId: target.id, resources: { gold: excess.gold ?? 0, wood: excess.wood ?? 0, stone: excess.stone ?? 0, food: excess.food ?? 0, gems: 0 } },
    score: 1.0,
  };
}

function chooseBarbarianHunt(snapshot: BotSnapshot, profile: BotProfile, config: BotSimulationConfig, now: Date): BotDecision | null {
  if (snapshot.barbarianCamps.length === 0 || snapshot.activeOutgoingBattles.length >= config.maxActiveOutgoingBattles) return null;

  const totalTroops = snapshot.units.reduce((s, u) => s + u.count, 0);
  if (totalTroops < config.minAttackTroops) return null;

  const camp = snapshot.barbarianCamps[0];
  const units = snapshot.units
    .map((u) => ({ type: u.type as UnitType, count: Math.floor(u.count * 0.4) }))
    .filter((u) => u.count > 0);

  if (units.reduce((s, u) => s + u.count, 0) < config.minAttackTroops) return null;

  return {
    type: "ATTACK_BARBARIAN",
    reason: `${profile} barbarian hunt L${camp.level}`,
    payload: { targetCampId: camp.id, units },
    score: config.profileWeights[profile].aggression * 0.8,
  };
}

function chooseAttack(snapshot: BotSnapshot, profile: BotProfile, config: BotSimulationConfig, now: Date): BotDecision | null {
  const weights = config.profileWeights[profile];
  if (weights.aggression <= 0 || snapshot.activeOutgoingBattles.length >= config.maxActiveOutgoingBattles) return null;

  const cooldownMinutes = config.attackCooldownRangeMinutes[0] + Math.random() * (config.attackCooldownRangeMinutes[1] - config.attackCooldownRangeMinutes[0]);
  const lastAttackAt = snapshot.state?.lastAttackAt ? new Date(snapshot.state.lastAttackAt).getTime() : 0;
  if (now.getTime() - lastAttackAt < cooldownMinutes * 60_000) return null;

  const totalTroops = snapshot.units.reduce((s, u) => s + u.count, 0);
  if (totalTroops < config.minAttackTroops) return null;

  const targetCooldowns = snapshot.state?.targetCooldowns ?? {};
  const incomingAttacks = snapshot.state?.incomingAttacks ?? [];
  
  const recentAttackerCityIds = new Set(incomingAttacks.map((a: any) => a.attackerCityId));
  let target = snapshot.targets.find(t => recentAttackerCityIds.has(t.id));
  let isRevenge = !!target;

  if (!target) {
    target = snapshot.targets.find((candidate) => {
      const lastTargetAt = targetCooldowns[candidate.id] ? new Date(targetCooldowns[candidate.id]).getTime() : 0;
      return now.getTime() - lastTargetAt >= config.targetCooldownMinutes * 60_000;
    });
  }

  if (!target) return null;

  const spies = snapshot.units.find(u => u.type === "SPY")?.count ?? 0;
  if (spies > 0 && Math.random() > 0.5) {
     // Simulated intelligence check
  }

  const units = snapshot.units
    .map((u) => ({ type: u.type as UnitType, count: Math.floor(u.count * 0.5) }))
    .filter((u) => u.count > 0);

  if (units.reduce((sum, unit) => sum + unit.count, 0) < config.minAttackTroops) return null;

  return {
    type: "ATTACK_CITY",
    reason: isRevenge ? `${profile} REVENGE attack` : `${profile} strategic attack`,
    payload: { targetCityId: target.id, units },
    score: weights.aggression * (isRevenge ? 2 : 1),
  };
}

export function decideBotAction(snapshot: BotSnapshot, profile: BotProfile, config: BotSimulationConfig, now: Date = new Date()): BotDecision {
  const candidates = [
    chooseAttack(snapshot, profile, config, now),
    chooseBarbarianHunt(snapshot, profile, config, now),
    chooseResearch(snapshot, profile, config),
    chooseUpgrade(snapshot, profile, config),
    chooseTraining(snapshot, profile, config),
    chooseSocial(snapshot, profile, config),
    chooseTrade(snapshot, profile, config),
  ].filter(Boolean) as BotDecision[];

  const actionable = candidates.filter((candidate) => candidate.type !== "IDLE");
  if (actionable.length > 0) {
    return actionable.sort((a, b) => b.score - a.score)[0];
  }

  const critical = criticalResources(snapshot, config);
  if (critical.length > 0) {
    return { type: "IDLE", reason: `recover economy: waiting for ${critical.join(",")}`, payload: {}, score: 0 };
  }
  return candidates[0] ?? { type: "IDLE", reason: "waiting for next strategic opportunity", payload: {}, score: 0 };
}

export function botActionType(decision: BotDecision): BotActionType {
  if (["CREATE_ALLIANCE", "JOIN_ALLIANCE", "SEND_CHAT", "SEND_MAIL"].includes(decision.type)) return "IDLE";
  return decision.type as BotActionType;
}
