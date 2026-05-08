import type { BuildingType, UnitType } from "@etheria/shared";

// ─── Building Display Info ───

export const BUILDING_INFO: Record<BuildingType, { nameKey: string; icon: string; descriptionKey: string; category: "economic" | "military" | "civic" }> = {
  TOWN_HALL: {
    nameKey: "play.buildings.town_hall.name",
    icon: "🏛️",
    descriptionKey: "play.buildings.town_hall.description",
    category: "civic",
  },
  GOLD_MINE: {
    nameKey: "play.buildings.gold_mine.name",
    icon: "⛏️",
    descriptionKey: "play.buildings.gold_mine.description",
    category: "economic",
  },
  LUMBER_MILL: {
    nameKey: "play.buildings.lumber_mill.name",
    icon: "🌲",
    descriptionKey: "play.buildings.lumber_mill.description",
    category: "economic",
  },
  QUARRY: {
    nameKey: "play.buildings.quarry.name",
    icon: "🪨",
    descriptionKey: "play.buildings.quarry.description",
    category: "economic",
  },
  FARM: {
    nameKey: "play.buildings.farm.name",
    icon: "🌾",
    descriptionKey: "play.buildings.farm.description",
    category: "economic",
  },
  BARRACKS: {
    nameKey: "play.buildings.barracks.name",
    icon: "⚔️",
    descriptionKey: "play.buildings.barracks.description",
    category: "military",
  },
  STABLE: {
    nameKey: "play.buildings.stable.name",
    icon: "🐴",
    descriptionKey: "play.buildings.stable.description",
    category: "military",
  },
  ALLIANCE_CENTER: {
    nameKey: "play.buildings.alliance_center.name",
    icon: "🛡️",
    descriptionKey: "play.buildings.alliance_center.description",
    category: "civic",
  },
  LIBRARY: {
    nameKey: "play.buildings.library.name",
    icon: "📚",
    descriptionKey: "play.buildings.library.description",
    category: "civic",
  },
  STORAGE: {
    nameKey: "play.buildings.storage.name",
    icon: "📦",
    descriptionKey: "play.buildings.storage.description",
    category: "economic",
  },
  TOWER: {
    nameKey: "play.buildings.tower.name",
    icon: "🏰",
    descriptionKey: "play.buildings.tower.description",
    category: "military",
  },
  MARKET: {
    nameKey: "play.buildings.market.name",
    icon: "🏪",
    descriptionKey: "play.buildings.market.description",
    category: "economic",
  },
};

// ─── Building Sizes (in tiles) ───

export const BUILDING_SIZES: Record<BuildingType, { w: number; h: number }> = {
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

// ─── Unit Display Info ───

export const UNIT_INFO: Record<UnitType, { nameKey: string; icon: string; shortNameKey: string }> = {
  WARRIOR: { nameKey: "play.units.warrior.name", icon: "⚔️", shortNameKey: "play.units.warrior.short" },
  ARCHER: { nameKey: "play.units.archer.name", icon: "🏹", shortNameKey: "play.units.archer.short" },
  CAVALRY: { nameKey: "play.units.cavalry.name", icon: "🐎", shortNameKey: "play.units.cavalry.short" },
  SIEGE: { nameKey: "play.units.siege.name", icon: "🔨", shortNameKey: "play.units.siege.short" },
  SPY: { nameKey: "play.units.spy.name", icon: "🕵️", shortNameKey: "play.units.spy.short" },
};

export const UNIT_IMAGE_PATHS: Partial<Record<UnitType, string>> = {
  WARRIOR: "/assets/units/warrior.png",
  ARCHER: "/assets/units/archer.png",
  CAVALRY: "/assets/units/cavalry.png",
};

// ─── Resource Display Info ───

export const RESOURCE_INFO = {
  gold: { nameKey: "play.resources.gold", icon: "🪙", color: "text-etheria-gold" },
  wood: { nameKey: "play.resources.wood", icon: "🪵", color: "text-etheria-wood" },
  stone: { nameKey: "play.resources.stone", icon: "🪨", color: "text-etheria-stone" },
  food: { nameKey: "play.resources.food", icon: "🍖", color: "text-etheria-food" },
  gems: { nameKey: "play.resources.gems", icon: "💎", color: "text-etheria-gems" },
} as const;

// ─── Building Atlas Mapping ───

export const BUILDING_ATLAS_MAP: Record<string, [string, number] | null> = {
  TOWN_HALL: ["housing", 0],
  FARM: ["housing", 1],
  STORAGE: ["housing", 2],
  LIBRARY: null,
  MARKET: null,
  ALLIANCE_CENTER: null,
  BARRACKS: ["fortified", 0],
  STABLE: ["fortified", 1],
  TOWER: null,
  GOLD_MINE: ["nature", 0],
  LUMBER_MILL: ["nature", 1],
  QUARRY: ["nature", 2],
};

export const BUILDING_IMAGE_PATHS: Partial<Record<BuildingType, string>> = {
  TOWN_HALL: "/assets/buildings/generated/town-hall.png",
  GOLD_MINE: "/assets/buildings/generated/gold-mine.png",
  LUMBER_MILL: "/assets/buildings/generated/lumber-mill.png",
  QUARRY: "/assets/buildings/generated/quarry.png",
  FARM: "/assets/buildings/generated/farm.png",
  BARRACKS: "/assets/buildings/generated/barracks.png",
  STABLE: "/assets/buildings/generated/stable.png",
  STORAGE: "/assets/buildings/generated/storage.png",
  TOWER: "/assets/buildings/generated/tower.png",
  MARKET: "/assets/buildings/generated/market.png",
  ALLIANCE_CENTER: "/assets/buildings/generated/alliance-center.png",
  LIBRARY: "/assets/buildings/generated/library.png",
};

export const MAX_BUILDING_LEVEL = 25;
export const BUILDING_VISUAL_TIERS = [1, 5, 10, 15, 20, 25] as const;

const BUILDING_ASSET_SLUGS: Record<BuildingType, string> = {
  TOWN_HALL: "town-hall",
  GOLD_MINE: "gold-mine",
  LUMBER_MILL: "lumber-mill",
  QUARRY: "quarry",
  FARM: "farm",
  BARRACKS: "barracks",
  STABLE: "stable",
  ALLIANCE_CENTER: "alliance-center",
  LIBRARY: "library",
  STORAGE: "storage",
  TOWER: "tower",
  MARKET: "market",
};

export function getBuildingVisualTier(level: number): typeof BUILDING_VISUAL_TIERS[number] {
  if (level >= 25) return 25;
  if (level >= 20) return 20;
  if (level >= 15) return 15;
  if (level >= 10) return 10;
  if (level >= 5) return 5;
  return 1;
}

export function getBuildingTierImagePath(type: BuildingType, level: number): string {
  const slug = BUILDING_ASSET_SLUGS[type];
  const tier = getBuildingVisualTier(level);
  return `/assets/buildings/generated/${slug}/${slug}-lvl-${tier}.png`;
}

export function getBuildingImagePath(type: BuildingType, level: number = 1): string {
  return getBuildingTierImagePath(type, level);
}

// ─── Category Labels ───

export const CATEGORY_LABELS = {
  economic: "play.categories.economic",
  military: "play.categories.military",
  civic: "play.categories.civic",
} as const;

export const CATEGORY_ICONS = {
  economic: "💰",
  military: "⚔️",
  civic: "🏛️",
} as const;

// ─── Helper Functions (return i18n keys, resolve with t() in components) ───

export function getBuildingNameKey(type: string): string {
  return BUILDING_INFO[type as BuildingType]?.nameKey ?? type;
}

export function getBuildingDescriptionKey(type: string): string {
  return BUILDING_INFO[type as BuildingType]?.descriptionKey ?? "";
}

export function getBuildingIcon(type: string): string {
  return BUILDING_INFO[type as BuildingType]?.icon ?? "🏗️";
}

export function getUnitNameKey(type: string): string {
  return UNIT_INFO[type as UnitType]?.nameKey ?? type;
}

export function getUnitShortNameKey(type: string): string {
  return UNIT_INFO[type as UnitType]?.shortNameKey ?? type;
}

export function getUnitIcon(type: string): string {
  return UNIT_INFO[type as UnitType]?.icon ?? "🎖️";
}

export function getResourceNameKey(resource: string): string {
  return RESOURCE_INFO[resource as keyof typeof RESOURCE_INFO]?.nameKey ?? resource;
}

export function getResourceIcon(resource: string): string {
  return RESOURCE_INFO[resource as keyof typeof RESOURCE_INFO]?.icon ?? "💰";
}

export function getCategoryLabelKey(category: string): string {
  return CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category;
}

export function formatTime(seconds: number): string {
  if (seconds < 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}d ${rh}h ${m}m`;
  }
  return `${h}h ${m}m ${s}s`;
}

export function formatShortTime(seconds: number): string {
  if (seconds < 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 24) return `${Math.floor(h / 24)}d`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Aliases for backwards compatibility (return i18n keys) ───

export const BUILDING_NAMES = Object.fromEntries(
  Object.entries(BUILDING_INFO).map(([k, v]) => [k, v.nameKey])
) as Record<BuildingType, string>;

export const BUILDING_ICONS = Object.fromEntries(
  Object.entries(BUILDING_INFO).map(([k, v]) => [k, v.icon])
) as Record<BuildingType, string>;

const BUILDING_UPGRADE_BASE: Record<BuildingType, { cost: { gold: number; wood: number; stone: number; food: number }; baseTimeSeconds: number; costMultiplier: number; timeMultiplier: number }> = {
  TOWN_HALL: { cost: { gold: 100, wood: 80, stone: 60, food: 40 }, baseTimeSeconds: 420, costMultiplier: 1.5, timeMultiplier: 1.35 },
  GOLD_MINE: { cost: { gold: 50, wood: 30, stone: 40, food: 20 }, baseTimeSeconds: 30, costMultiplier: 1.45, timeMultiplier: 1.3 },
  LUMBER_MILL: { cost: { gold: 40, wood: 60, stone: 30, food: 20 }, baseTimeSeconds: 30, costMultiplier: 1.45, timeMultiplier: 1.3 },
  QUARRY: { cost: { gold: 40, wood: 30, stone: 60, food: 20 }, baseTimeSeconds: 45, costMultiplier: 1.5, timeMultiplier: 1.35 },
  FARM: { cost: { gold: 30, wood: 40, stone: 20, food: 50 }, baseTimeSeconds: 30, costMultiplier: 1.45, timeMultiplier: 1.3 },
  BARRACKS: { cost: { gold: 80, wood: 100, stone: 80, food: 60 }, baseTimeSeconds: 60, costMultiplier: 1.5, timeMultiplier: 1.4 },
  STABLE: { cost: { gold: 120, wood: 80, stone: 100, food: 80 }, baseTimeSeconds: 90, costMultiplier: 1.55, timeMultiplier: 1.4 },
  ALLIANCE_CENTER: { cost: { gold: 150, wood: 100, stone: 120, food: 80 }, baseTimeSeconds: 300, costMultiplier: 1.6, timeMultiplier: 1.5 },
  LIBRARY: { cost: { gold: 100, wood: 80, stone: 80, food: 60 }, baseTimeSeconds: 120, costMultiplier: 1.55, timeMultiplier: 1.45 },
  STORAGE: { cost: { gold: 60, wood: 80, stone: 100, food: 40 }, baseTimeSeconds: 60, costMultiplier: 1.5, timeMultiplier: 1.35 },
  TOWER: { cost: { gold: 80, wood: 60, stone: 100, food: 40 }, baseTimeSeconds: 180, costMultiplier: 1.5, timeMultiplier: 1.4 },
  MARKET: { cost: { gold: 100, wood: 80, stone: 60, food: 40 }, baseTimeSeconds: 240, costMultiplier: 1.55, timeMultiplier: 1.45 },
};

// ─── Unit Training Costs & Times ───

export const UNIT_TRAINING_COST: Record<UnitType, { gold: number; food: number; wood?: number; stone?: number }> = {
  WARRIOR: { gold: 20, wood: 30, food: 10 },
  ARCHER: { gold: 30, wood: 40, food: 15 },
  CAVALRY: { gold: 80, wood: 60, stone: 20, food: 40 },
  SIEGE: { gold: 200, wood: 300, stone: 150, food: 50 },
  SPY: { gold: 100, wood: 20, food: 10 },
};

export const UNIT_TRAINING_TIME: Record<UnitType, number> = {
  WARRIOR: 30,
  ARCHER: 45,
  CAVALRY: 120,
  SIEGE: 300,
  SPY: 60,
};

// ─── Tech Display Info ───

export const TECH_INFO: Record<string, { nameKey: string; icon: string; descriptionKey: string; category: "ECONOMY" | "MILITARY" | "DEFENSE"; baseCost: { gold: number; wood?: number; stone?: number; food?: number }; timeSeconds: number }> = {
  COLLECTION_EFFICIENT_I: { nameKey: "play.tech.names.efficient_collection_1", icon: "⛏️", descriptionKey: "play.tech.desc.efficient_collection_1", category: "ECONOMY", baseCost: { gold: 200, wood: 100, stone: 50, food: 50 }, timeSeconds: 300 },
  COLLECTION_EFFICIENT_II: { nameKey: "play.tech.names.efficient_collection_2", icon: "⛏️", descriptionKey: "play.tech.desc.efficient_collection_2", category: "ECONOMY", baseCost: { gold: 500, wood: 300, stone: 150, food: 150 }, timeSeconds: 600 },
  COLLECTION_EFFICIENT_III: { nameKey: "play.tech.names.efficient_collection_3", icon: "⛏️", descriptionKey: "play.tech.desc.efficient_collection_3", category: "ECONOMY", baseCost: { gold: 1200, wood: 800, stone: 400, food: 400 }, timeSeconds: 1200 },
  ADVANCED_STORAGE: { nameKey: "play.tech.names.advanced_storage", icon: "📦", descriptionKey: "play.tech.desc.advanced_storage", category: "ECONOMY", baseCost: { gold: 400, wood: 300, stone: 200, food: 100 }, timeSeconds: 480 },
  WARTIME_ECONOMY: { nameKey: "play.tech.names.wartime_economy", icon: "💰", descriptionKey: "play.tech.desc.wartime_economy", category: "ECONOMY", baseCost: { gold: 800, wood: 600, stone: 300, food: 300 }, timeSeconds: 900 },
  TRADE: { nameKey: "play.tech.names.trade_routes", icon: "🚢", descriptionKey: "play.tech.desc.trade_routes", category: "ECONOMY", baseCost: { gold: 600, wood: 400, stone: 200, food: 200 }, timeSeconds: 720 },
  WEAPON_FORGE_I: { nameKey: "play.tech.names.weapon_forge_1", icon: "⚔️", descriptionKey: "play.tech.desc.weapon_forge_1", category: "MILITARY", baseCost: { gold: 300, wood: 200, stone: 100, food: 50 }, timeSeconds: 360 },
  WEAPON_FORGE_II: { nameKey: "play.tech.names.weapon_forge_2", icon: "⚔️", descriptionKey: "play.tech.desc.weapon_forge_2", category: "MILITARY", baseCost: { gold: 700, wood: 500, stone: 300, food: 150 }, timeSeconds: 720 },
  REINFORCED_BOWS: { nameKey: "play.tech.names.reinforced_bows", icon: "🏹", descriptionKey: "play.tech.desc.reinforced_bows", category: "MILITARY", baseCost: { gold: 500, wood: 400, stone: 100, food: 100 }, timeSeconds: 540 },
  HORSE_BREEDING: { nameKey: "play.tech.names.horse_breeding", icon: "🐴", descriptionKey: "play.tech.desc.horse_breeding", category: "MILITARY", baseCost: { gold: 600, wood: 400, stone: 200, food: 300 }, timeSeconds: 600 },
  HEAVY_CAVALRY: { nameKey: "play.tech.names.heavy_cavalry", icon: "🐎", descriptionKey: "play.tech.desc.heavy_cavalry", category: "MILITARY", baseCost: { gold: 1000, wood: 700, stone: 400, food: 500 }, timeSeconds: 1080 },
  SIEGE_ENGINEERING: { nameKey: "play.tech.names.siege_engineering", icon: "🔨", descriptionKey: "play.tech.desc.siege_engineering", category: "MILITARY", baseCost: { gold: 1200, wood: 900, stone: 600, food: 200 }, timeSeconds: 1200 },
  BALLISTICS: { nameKey: "play.tech.names.ballistics", icon: "🏹", descriptionKey: "play.tech.desc.ballistics", category: "MILITARY", baseCost: { gold: 1800, wood: 1200, stone: 800, food: 300 }, timeSeconds: 1500 },
  GUERRILLA_TACTICS: { nameKey: "play.tech.names.guerrilla_tactics", icon: "🗡️", descriptionKey: "play.tech.desc.guerrilla_tactics", category: "MILITARY", baseCost: { gold: 800, wood: 600, stone: 300, food: 200 }, timeSeconds: 840 },
  MASONRY: { nameKey: "play.tech.names.masonry", icon: "🧱", descriptionKey: "play.tech.desc.masonry", category: "DEFENSE", baseCost: { gold: 250, wood: 200, stone: 300, food: 50 }, timeSeconds: 360 },
  STONE_WALLS: { nameKey: "play.tech.names.stone_walls", icon: "🏰", descriptionKey: "play.tech.desc.stone_walls", category: "DEFENSE", baseCost: { gold: 600, wood: 400, stone: 600, food: 100 }, timeSeconds: 720 },
  WATCHTOWER: { nameKey: "play.tech.names.watchtower_network", icon: "🗼", descriptionKey: "play.tech.desc.watchtower_network", category: "DEFENSE", baseCost: { gold: 400, wood: 300, stone: 200, food: 50 }, timeSeconds: 480 },
  POISONED_ARROWS: { nameKey: "play.tech.names.poisoned_arrows", icon: "☠️", descriptionKey: "play.tech.desc.poisoned_arrows", category: "DEFENSE", baseCost: { gold: 800, wood: 600, stone: 400, food: 100 }, timeSeconds: 900 },
  FORTIFICATIONS: { nameKey: "play.tech.names.fortifications", icon: "🛡️", descriptionKey: "play.tech.desc.fortifications", category: "DEFENSE", baseCost: { gold: 1500, wood: 1000, stone: 1000, food: 200 }, timeSeconds: 1500 },
  SPY_NETWORK: { nameKey: "play.tech.names.spy_network", icon: "👁️", descriptionKey: "play.tech.desc.spy_network", category: "DEFENSE", baseCost: { gold: 500, wood: 300, stone: 100, food: 100 }, timeSeconds: 600 },
  SPEC_SIEGE: { nameKey: "play.tech.names.siege_mastery", icon: "🔨", descriptionKey: "play.tech.desc.siege_mastery", category: "MILITARY", baseCost: { gold: 2500, wood: 1800, stone: 1200, food: 500 }, timeSeconds: 2400 },
  SPEC_CAVALRY: { nameKey: "play.tech.names.cavalry_mastery", icon: "🐎", descriptionKey: "play.tech.desc.cavalry_mastery", category: "MILITARY", baseCost: { gold: 2500, wood: 1500, stone: 800, food: 1000 }, timeSeconds: 2400 },
};

export function getTrainingCost(unitType: UnitType, count: number): Record<string, number> {
  const base = UNIT_TRAINING_COST[unitType];
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) => [k, Math.floor(v * count)])
  );
}

export function applyTrainingCostReduction(cost: Record<string, number>, reduction: number = 0): Record<string, number> {
  const multiplier = Math.max(0, 1 - reduction);
  return Object.fromEntries(
    Object.entries(cost).map(([k, v]) => [k, Math.floor(v * multiplier)])
  );
}

export function getTrainingTimeSeconds(unitType: UnitType, count: number): number {
  return UNIT_TRAINING_TIME[unitType] * count;
}

export function getTechCost(techId: string, currentLevel: number): Record<string, number> {
  const tech = TECH_INFO[techId];
  if (!tech) return { gold: 100 };
  const multiplier = Math.pow(1.5, currentLevel);
  return Object.fromEntries(
    Object.entries(tech.baseCost).map(([k, v]) => [k, Math.floor(v * multiplier)])
  );
}

export function getTechTimeSeconds(techId: string, currentLevel: number): number {
  const tech = TECH_INFO[techId];
  if (!tech) return 120;
  return Math.floor(tech.timeSeconds * Math.pow(1.3, currentLevel));
}

// ─── Cost Helpers ───

export function getUpgradeCost(buildingType: string, currentLevel: number): Record<string, number> {
  const config = BUILDING_UPGRADE_BASE[buildingType as BuildingType];
  if (!config) return { gold: 50, wood: 50, stone: 50, food: 50 };
  const multiplier = Math.pow(config.costMultiplier, currentLevel);
  return Object.fromEntries(
    Object.entries(config.cost).map(([k, v]) => [k, Math.floor(v * multiplier)])
  );
}

export function getUpgradeTimeSeconds(buildingType: string, currentLevel: number): number {
  const config = BUILDING_UPGRADE_BASE[buildingType as BuildingType];
  if (!config) return 300;
  return Math.floor(config.baseTimeSeconds * Math.pow(config.timeMultiplier, currentLevel));
}

export function formatCost(cost: Record<string, number>): string {
  return Object.entries(cost)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => {
      const info = RESOURCE_INFO[k as keyof typeof RESOURCE_INFO];
      return info ? `${info.icon} ${v}` : `${k}: ${v}`;
    })
    .join(" | ");
}
