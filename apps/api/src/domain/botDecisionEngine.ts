import type { BuildingType, UnitType } from "@etheria/shared";
import { getBuildingCost, getBuildingMaxLevelForTownHall } from "./buildings.js";
import { canAfford } from "./resources.js";
import { getAllTechConfigs, canResearch, getResearchCost } from "./techs.js";
import { getUnlockedUnits, getUnitCost } from "./units.js";
import type { BotProfile, BotSimulationConfig } from "./botConfigData.js";

export type BotActionType = "UPGRADE_BUILDING" | "TRAIN_UNITS" | "START_RESEARCH" | "ATTACK_CITY" | "IDLE";

export type BotDecision =
  | { type: "UPGRADE_BUILDING"; reason: string; payload: { buildingId: string; buildingType: BuildingType }; score: number }
  | { type: "TRAIN_UNITS"; reason: string; payload: { unitType: UnitType; count: number }; score: number }
  | { type: "START_RESEARCH"; reason: string; payload: { techId: string }; score: number }
  | { type: "ATTACK_CITY"; reason: string; payload: { targetCityId: string; units: Array<{ type: UnitType; count: number }> }; score: number }
  | { type: "IDLE"; reason: string; payload: Record<string, never>; score: number };

type BotSnapshot = {
  city: any;
  buildings: any[];
  units: any[];
  cityTechs: any[];
  activeBuildQueues: any[];
  activeTrainingQueues: any[];
  activeResearch: any | null;
  activeOutgoingBattles: any[];
  targets: any[];
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

function preferredBuildings(profile: BotProfile): BuildingType[] {
  if (profile === "ECONOMIST") return ECONOMY_BUILDINGS;
  if (profile === "MILITARIST") return MILITARY_BUILDINGS;
  if (profile === "TECH_RUSHER") return TECH_BUILDINGS;
  return BALANCED_BUILDINGS;
}

function chooseUpgrade(snapshot: BotSnapshot, profile: BotProfile, config: BotSimulationConfig): BotDecision | null {
  if (snapshot.activeBuildQueues.length > 0) {
    return { type: "IDLE", reason: "build queue active", payload: {}, score: 0 };
  }

  const resources = resourcesOf(snapshot.city);
  const townHall = snapshot.buildings.find((b) => b.type === "TOWN_HALL");
  const townHallLevel = townHall?.level ?? 1;
  const weights = config.profileWeights[profile];

  for (const type of preferredBuildings(profile)) {
    const building = snapshot.buildings.find((b) => b.type === type);
    if (!building) continue;
    const maxLevel = getBuildingMaxLevelForTownHall(townHallLevel, type);
    if ((building.level ?? 1) >= maxLevel) continue;
    const nextLevel = (building.level ?? 1) + 1;
    const cost = getBuildingCost(type, nextLevel);
    if (!canAfford(resources, cost)) continue;
    return {
      type: "UPGRADE_BUILDING",
      reason: `${profile} upgrade priority ${type}`,
      payload: { buildingId: building.id, buildingType: type },
      score: weights.economy + (type === "TOWN_HALL" ? 2 : 0),
    };
  }

  return null;
}

function chooseResearch(snapshot: BotSnapshot, profile: BotProfile, config: BotSimulationConfig): BotDecision | null {
  if (snapshot.activeResearch) {
    return { type: "IDLE", reason: "research queue active", payload: {}, score: 0 };
  }

  const cityTechs = snapshot.cityTechs.map((tech) => ({ techId: tech.techId, level: tech.level }));
  const resources = resourcesOf(snapshot.city);
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
    const check = canResearch(cfg.techId, targetLevel, cityTechs, snapshot.activeResearch);
    if (!check.allowed) continue;
    const cost = getResearchCost(cfg.techId, targetLevel);
    if (!canAfford(resources, cost)) continue;
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
  if (snapshot.activeTrainingQueues.length > 0) {
    return { type: "IDLE", reason: "training queue active", payload: {}, score: 0 };
  }

  const resources = resourcesOf(snapshot.city);
  const unlocked = getUnlockedUnits(snapshot.cityTechs);
  const preferred: UnitType[] = profile === "MILITARIST"
    ? ["CAVALRY", "SIEGE", "ARCHER", "WARRIOR", "SPY"]
    : ["WARRIOR", "ARCHER", "CAVALRY", "SPY", "SIEGE"];
  const unitType = preferred.find((type) => unlocked.includes(type)) ?? "WARRIOR";

  for (const count of [10, 5, 2, 1]) {
    const cost = getUnitCost(unitType, count);
    if (canAfford(resources, cost)) {
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

function chooseAttack(snapshot: BotSnapshot, profile: BotProfile, config: BotSimulationConfig, now: Date): BotDecision | null {
  const weights = config.profileWeights[profile];
  if (weights.aggression <= 0 || snapshot.activeOutgoingBattles.length >= config.maxActiveOutgoingBattles) return null;

  const lastAttackAt = snapshot.state?.lastAttackAt ? new Date(snapshot.state.lastAttackAt).getTime() : 0;
  if (now.getTime() - lastAttackAt < config.attackCooldownMinutes * 60_000) return null;

  const warriors = snapshot.units.find((unit) => unit.type === "WARRIOR")?.count ?? 0;
  const archers = snapshot.units.find((unit) => unit.type === "ARCHER")?.count ?? 0;
  const totalBasic = warriors + archers;
  if (totalBasic < config.minAttackTroops) return null;

  const targetCooldowns = snapshot.state?.targetCooldowns ?? {};
  const target = snapshot.targets.find((candidate) => {
    if (candidate.id === snapshot.city.id) return false;
    if (candidate.userId === snapshot.city.userId) return false;
    const lastTargetAt = targetCooldowns[candidate.id] ? new Date(targetCooldowns[candidate.id]).getTime() : 0;
    return now.getTime() - lastTargetAt >= config.targetCooldownMinutes * 60_000;
  });
  if (!target) return null;

  const sendWarriors = Math.max(0, Math.floor(warriors * 0.35));
  const sendArchers = Math.max(0, Math.floor(archers * 0.35));
  const units = [
    ...(sendWarriors > 0 ? [{ type: "WARRIOR" as UnitType, count: sendWarriors }] : []),
    ...(sendArchers > 0 ? [{ type: "ARCHER" as UnitType, count: sendArchers }] : []),
  ];
  if (units.reduce((sum, unit) => sum + unit.count, 0) < config.minAttackTroops) return null;

  return {
    type: "ATTACK_CITY",
    reason: `${profile} moderate attack`,
    payload: { targetCityId: target.id, units },
    score: weights.aggression,
  };
}

export function decideBotAction(snapshot: BotSnapshot, profile: BotProfile, config: BotSimulationConfig, now: Date = new Date()): BotDecision {
  const candidates = [
    chooseAttack(snapshot, profile, config, now),
    chooseResearch(snapshot, profile, config),
    chooseUpgrade(snapshot, profile, config),
    chooseTraining(snapshot, profile, config),
  ].filter(Boolean) as BotDecision[];

  const actionable = candidates.filter((candidate) => candidate.type !== "IDLE");
  if (actionable.length > 0) {
    return actionable.sort((a, b) => b.score - a.score)[0];
  }

  return candidates[0] ?? { type: "IDLE", reason: "no affordable valid action", payload: {}, score: 0 };
}

export function botActionType(decision: BotDecision): BotActionType {
  return decision.type;
}
