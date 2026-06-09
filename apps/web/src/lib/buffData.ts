import type { TechBonuses } from "@etheria/shared";

export interface ActiveBuff {
  id: string;
  icon: string;
  label: string;
  description: string;
  expiresAt?: string;
  source: string;
  type: "buff" | "debuff";
}

type TFunc = (key: string) => string;

const RES_ICONS: Record<string, string> = {
  gold: "\uD83E\uDE99", wood: "\uD83E\uDEB5", stone: "\uD83E\uDEA8", food: "\uD83C\uDF56",
};

export function getAllianceBuffs(effects: any[], t: TFunc): ActiveBuff[] {
  const buffs: ActiveBuff[] = [];
  for (const effect of effects ?? []) {
    if (effect.type === "PEACE_PRODUCTION") {
      const pct = Math.round(Number(effect.value ?? 0) * 100);
      buffs.push({
        id: `alliance-peace-${effect.id}`,
        icon: "\uD83D\uDD4A\uFE0F",
        label: t("play.buffs.peacyTreaty") + ` +${pct}%`,
        description: t("play.buffs.peaceTreatyDesc").replace("{pct}", String(pct)),
        expiresAt: effect.expiresAt,
        source: t("play.buffs.sourceAlliance"),
        type: "buff",
      });
    }
    if (effect.type === "DISHONOR_ATTACK") {
      const pct = Math.abs(Math.round(Number(effect.value ?? 0) * 100));
      buffs.push({
        id: `alliance-dishonor-${effect.id}`,
        icon: "\uD83D\uDC94",
        label: t("play.buffs.dishonor") + ` -${pct}%`,
        description: t("play.buffs.dishonorDesc").replace("{pct}", String(pct)),
        expiresAt: effect.expiresAt,
        source: t("play.buffs.sourceAlliance"),
        type: "debuff",
      });
    }
  }
  return buffs;
}

export function getTechBuffs(bonuses: TechBonuses, t: TFunc): ActiveBuff[] {
  const buffs: ActiveBuff[] = [];

  const prodEntries = Object.entries(bonuses.resourceProdBonus ?? {}).filter(([, v]) => Number(v) > 0);
  if (prodEntries.length > 0) {
    buffs.push({
      id: "tech-resource-prod",
      icon: "\uD83D\uDCDA",
      label: t("play.buffs.techProduction"),
      description: prodEntries.map(([res, val]) => {
        const icon = RES_ICONS[res] ?? res;
        return `${icon} +${Math.round(Number(val) * 100)}%`;
      }).join(", "),
      source: t("play.buffs.sourceTech"),
      type: "buff",
    });
  }

  if (Number(bonuses.trainingCostReduction) > 0) {
    buffs.push({
      id: "tech-training-cost",
      icon: "\uD83D\uDCDA",
      label: t("play.buffs.techTrainingCost"),
      description: t("play.buffs.techTrainingCostDesc").replace("{pct}", String(Math.round(Number(bonuses.trainingCostReduction) * 100))),
      source: t("play.buffs.sourceTech"),
      type: "buff",
    });
  }

  if (Number(bonuses.wallBonusMultiplier) > 1) {
    buffs.push({
      id: "tech-wall",
      icon: "\uD83D\uDCDA",
      label: t("play.buffs.techWall"),
      description: t("play.buffs.techWallDesc").replace("{mul}", Number(bonuses.wallBonusMultiplier).toFixed(2)),
      source: t("play.buffs.sourceTech"),
      type: "buff",
    });
  }

  if (Number(bonuses.towerDamageBonus) > 0) {
    buffs.push({
      id: "tech-tower",
      icon: "\uD83D\uDCDA",
      label: t("play.buffs.techTower"),
      description: t("play.buffs.techTowerDesc").replace("{dmg}", String(bonuses.towerDamageBonus)),
      source: t("play.buffs.sourceTech"),
      type: "buff",
    });
  }

  const unitKeys = new Set<string>();
  for (const k of ["unitAttackBonus", "unitDefenseBonus", "unitHpBonus", "unitSpeedBonus"]) {
    for (const u of Object.keys((bonuses as any)[k] ?? {})) {
      if (Number((bonuses as any)[k][u]) > 0) unitKeys.add(u);
    }
  }
  if (unitKeys.size > 0) {
    buffs.push({
      id: "tech-unit-stats",
      icon: "\uD83D\uDCDA",
      label: t("play.buffs.techUnitBonuses"),
      description: t("play.buffs.techUnitBonusesDesc"),
      source: t("play.buffs.sourceTech"),
      type: "buff",
    });
  }

  return buffs;
}

export function getSeasonBuffs(seasonState: any, t: TFunc): ActiveBuff[] {
  if (!seasonState) return [];
  const { currentSeason, intensity } = seasonState;

  const modifiers: Record<string, Array<{ res: string; val: number }>> = {
    SPRING: [{ res: "food", val: 10 }],
    SUMMER: [{ res: "gold", val: 5 }, { res: "wood", val: 5 }, { res: "stone", val: 5 }, { res: "food", val: 5 }],
    AUTUMN: [{ res: "food", val: 15 }],
    WINTER: [{ res: "food", val: -15 }, { res: "wood", val: -5 }],
  };

  const mods = modifiers[currentSeason] ?? [];
  if (mods.length === 0) return [];

  const icons: Record<string, string> = { SPRING: "\uD83C\uDF38", SUMMER: "\u2600\uFE0F", AUTUMN: "\uD83C\uDF42", WINTER: "\u2744\uFE0F" };

  return [{
    id: "season-mod",
    icon: icons[currentSeason] ?? "\uD83C\uDF0D",
    label: t(`play.seasons.${currentSeason.toLowerCase()}`),
    description: mods.map(m => {
      const ri = RES_ICONS[m.res] ?? m.res;
      const effective = Math.round(m.val * intensity);
      return `${ri} ${effective >= 0 ? "+" : ""}${effective}%`;
    }).join(", ") + ` (${t("play.buffs.intensity")}: ${Math.round(intensity * 100)}%)`,
    source: t("play.buffs.sourceSeason"),
    type: mods.some(m => m.val < 0) ? "debuff" : "buff",
  }];
}

export function getWinterDebuffs(winterData: any, t: TFunc): ActiveBuff[] {
  if (!winterData?.winterState && !winterData?.isWinter) return [];

  const buffs: ActiveBuff[] = [];

  if (winterData?.isWinter) {
    const hourly = Math.round(winterData.hourlyConsumption * 100) / 100;
    buffs.push({
      id: "winter-food-drain",
      icon: "\u2744\uFE0F",
      label: t("play.buffs.winterFoodDrain"),
      description: `${t("play.buffs.winterFoodDrainDesc")}: ${hourly}/h`,
      source: t("play.buffs.sourceWinter"),
      type: "debuff",
    });
  }

  if (winterData?.winterState?.isStarving) {
    buffs.push({
      id: "winter-starving",
      icon: "\u26A0\uFE0F",
      label: t("play.buffs.starving"),
      description: t("play.buffs.starvingDesc"),
      source: t("play.buffs.sourceWinter"),
      type: "debuff",
    });
  }

  if (winterData?.winterState?.combatPenalty && Number(winterData.winterState.combatPenalty) < 1) {
    const pct = Math.round((1 - Number(winterData.winterState.combatPenalty)) * 100);
    buffs.push({
      id: "winter-combat-penalty",
      icon: "\u2694\uFE0F",
      label: t("play.buffs.combatPenalty") + ` -${pct}%`,
      description: t("play.buffs.combatPenaltyDesc").replace("{pct}", String(pct)),
      source: t("play.buffs.sourceWinter"),
      type: "debuff",
    });
  }

  const desertion = winterData?.winterState?.desertionLosses;
  if (desertion && Object.values(desertion).some((v: any) => Number(v) > 0)) {
    buffs.push({
      id: "winter-desertion",
      icon: "\uD83D\uDC80",
      label: t("play.buffs.desertion"),
      description: t("play.buffs.desertionDesc"),
      source: t("play.buffs.sourceWinter"),
      type: "debuff",
    });
  }

  return buffs;
}

export function getZoneBuffs(posX: number, posY: number, t: TFunc): ActiveBuff[] {
  if (!posX || !posY) return [];

  const zone = resolveZone(posX, posY);
  const modifiers: Record<string, Record<string, number>> = {
    NORTH: { wood: -10, food: -15 },
    CENTER: { food: 5 },
    SOUTH: { gold: 5, food: -5 },
    COAST: { gold: 5, food: 10 },
    MOUNTAIN: { wood: -10, stone: 20, food: -10 },
    FOREST: { wood: 20, food: 5 },
    PLAINS: { wood: -5, food: 10 },
  };

  const mods = modifiers[zone] ?? {};
  if (Object.keys(mods).length === 0) return [];

  return [{
    id: "zone-effect",
    icon: "\uD83C\uDF32",
    label: t(`play.buffs.zone.${zone.toLowerCase()}`),
    description: Object.entries(mods).map(([res, val]) => {
      const ri = RES_ICONS[res] ?? res;
      return `${ri} ${val >= 0 ? "+" : ""}${val}%`;
    }).join(", "),
    source: t("play.buffs.sourceZone"),
    type: Object.values(mods).some(v => v < 0) ? "debuff" : "buff",
  }];
}

const DEFAULT_MAP_WIDTH = 3600;
const DEFAULT_MAP_HEIGHT = 2400;

function resolveZone(posX: number, posY: number): string {
  const mapW = DEFAULT_MAP_WIDTH;
  const mapH = DEFAULT_MAP_HEIGHT;
  const x = posX / mapW;
  const y = posY / mapH;

  if (y < 0.18) return "NORTH";
  if (y > 0.78) return "SOUTH";
  if (x < 0.22) { if (y < 0.25) return "MOUNTAIN"; return "FOREST"; }
  if (x > 0.78) { if (y < 0.35) return "MOUNTAIN"; return "COAST"; }
  if (y < 0.25) return "MOUNTAIN";
  if (y > 0.65) return "PLAINS";
  return "CENTER";
}
