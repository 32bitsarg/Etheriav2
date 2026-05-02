import type { BuildingType, UnitType } from "@etheria/shared";

// ─── Building Display Info ───

export const BUILDING_INFO: Record<BuildingType, { name: string; icon: string; description: string; category: "economic" | "military" | "civic" }> = {
  TOWN_HALL: {
    name: "Town Hall",
    icon: "🏛️",
    description: "The heart of your city. Upgrading unlocks new buildings and increases storage capacity.",
    category: "civic",
  },
  GOLD_MINE: {
    name: "Gold Mine",
    icon: "⛏️",
    description: "Extracts gold from the earth. Higher levels produce more gold per hour.",
    category: "economic",
  },
  LUMBER_MILL: {
    name: "Lumber Mill",
    icon: "🌲",
    description: "Processes wood from nearby forests. Essential for construction and training.",
    category: "economic",
  },
  QUARRY: {
    name: "Quarry",
    icon: "🪨",
    description: "Mines stone for building fortifications and structures.",
    category: "economic",
  },
  FARM: {
    name: "Farm",
    icon: "🌾",
    description: "Produces food to sustain your growing army.",
    category: "economic",
  },
  BARRACKS: {
    name: "Barracks",
    icon: "⚔️",
    description: "Train infantry units. Higher levels unlock stronger warriors.",
    category: "military",
  },
  STABLE: {
    name: "Stable",
    icon: "🐴",
    description: "Train cavalry units. Faster and stronger than infantry.",
    category: "military",
  },
  ALLIANCE_CENTER: {
    name: "Alliance Center",
    icon: "🛡️",
    description: "Manage alliances and coordinate with other players.",
    category: "civic",
  },
  LIBRARY: {
    name: "Library",
    icon: "📚",
    description: "Research technologies to improve your city and army.",
    category: "civic",
  },
  STORAGE: {
    name: "Storage",
    icon: "📦",
    description: "Increases your maximum resource capacity.",
    category: "economic",
  },
  TOWER: {
    name: "Tower",
    icon: "🏰",
    description: "Main defensive structure. Grants the city's defense bonus and attacks incoming enemies.",
    category: "military",
  },
  MARKET: {
    name: "Market",
    icon: "🏪",
    description: "Trade resources with other players. Higher levels unlock better trade rates.",
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

export const UNIT_INFO: Record<UnitType, { name: string; icon: string; shortName: string }> = {
  WARRIOR: { name: "Warrior", icon: "⚔️", shortName: "War" },
  ARCHER: { name: "Archer", icon: "🏹", shortName: "Arc" },
  CAVALRY: { name: "Cavalry", icon: "🐎", shortName: "Cav" },
  SIEGE: { name: "Siege Engine", icon: "🔨", shortName: "Sie" },
  SPY: { name: "Spy", icon: "🕵️", shortName: "Spy" },
};

// ─── Resource Display Info ───

export const RESOURCE_INFO = {
  gold: { name: "Gold", icon: "🪙", color: "text-etheria-gold" },
  wood: { name: "Wood", icon: "🪵", color: "text-etheria-wood" },
  stone: { name: "Stone", icon: "🪨", color: "text-etheria-stone" },
  food: { name: "Food", icon: "🍖", color: "text-etheria-food" },
  gems: { name: "Gems", icon: "💎", color: "text-etheria-gems" },
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

// ─── Category Labels ───

export const CATEGORY_LABELS = {
  economic: "Economic",
  military: "Military",
  civic: "Civic",
} as const;

export const CATEGORY_ICONS = {
  economic: "💰",
  military: "⚔️",
  civic: "🏛️",
} as const;

// ─── Helper Functions ───

export function getBuildingName(type: string): string {
  return BUILDING_INFO[type as BuildingType]?.name ?? type;
}

export function getBuildingIcon(type: string): string {
  return BUILDING_INFO[type as BuildingType]?.icon ?? "🏗️";
}

export function getUnitName(type: string): string {
  return UNIT_INFO[type as UnitType]?.name ?? type;
}

export function getUnitIcon(type: string): string {
  return UNIT_INFO[type as UnitType]?.icon ?? "🎖️";
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

// ─── Aliases for backwards compatibility ───

export const BUILDING_NAMES = Object.fromEntries(
  Object.entries(BUILDING_INFO).map(([k, v]) => [k, v.name])
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

export const TECH_INFO: Record<string, { name: string; icon: string; description: string; category: "ECONOMY" | "MILITARY" | "DEFENSE"; baseCost: { gold: number; wood?: number; stone?: number; food?: number }; timeSeconds: number }> = {
  COLLECTION_EFFICIENT_I: { name: "Efficient Collection I", icon: "⛏️", description: "Increases all resource production by 5%", category: "ECONOMY", baseCost: { gold: 200, wood: 100, stone: 50, food: 50 }, timeSeconds: 300 },
  COLLECTION_EFFICIENT_II: { name: "Efficient Collection II", icon: "⛏️", description: "Increases all resource production by 10%", category: "ECONOMY", baseCost: { gold: 500, wood: 300, stone: 150, food: 150 }, timeSeconds: 600 },
  COLLECTION_EFFICIENT_III: { name: "Efficient Collection III", icon: "⛏️", description: "Increases all resource production by 15%", category: "ECONOMY", baseCost: { gold: 1200, wood: 800, stone: 400, food: 400 }, timeSeconds: 1200 },
  ADVANCED_STORAGE: { name: "Advanced Storage", icon: "📦", description: "Increases storage capacity by 20%", category: "ECONOMY", baseCost: { gold: 400, wood: 300, stone: 200, food: 100 }, timeSeconds: 480 },
  WARTIME_ECONOMY: { name: "Wartime Economy", icon: "💰", description: "Reduces unit training costs by 15%", category: "ECONOMY", baseCost: { gold: 800, wood: 600, stone: 300, food: 300 }, timeSeconds: 900 },
  TRADE: { name: "Trade Routes", icon: "🚢", description: "Unlocks market trading and increases gold production by 10%", category: "ECONOMY", baseCost: { gold: 600, wood: 400, stone: 200, food: 200 }, timeSeconds: 720 },
  WEAPON_FORGE_I: { name: "Weapon Forge I", icon: "⚔️", description: "Increases all unit attack by 10%", category: "MILITARY", baseCost: { gold: 300, wood: 200, stone: 100, food: 50 }, timeSeconds: 360 },
  WEAPON_FORGE_II: { name: "Weapon Forge II", icon: "⚔️", description: "Increases all unit attack by 15% and armor penetration by 5", category: "MILITARY", baseCost: { gold: 700, wood: 500, stone: 300, food: 150 }, timeSeconds: 720 },
  REINFORCED_BOWS: { name: "Reinforced Bows", icon: "🏹", description: "Archer attack +20% and range bonus", category: "MILITARY", baseCost: { gold: 500, wood: 400, stone: 100, food: 100 }, timeSeconds: 540 },
  HORSE_BREEDING: { name: "Horse Breeding", icon: "🐴", description: "Unlocks Cavalry units. Cavalry HP +15%", category: "MILITARY", baseCost: { gold: 600, wood: 400, stone: 200, food: 300 }, timeSeconds: 600 },
  HEAVY_CAVALRY: { name: "Heavy Cavalry", icon: "🐎", description: "Cavalry defense +20% and attack +10%", category: "MILITARY", baseCost: { gold: 1000, wood: 700, stone: 400, food: 500 }, timeSeconds: 1080 },
  SIEGE_ENGINEERING: { name: "Siege Engineering", icon: "🔨", description: "Unlocks Siege units. Siege attack +15%", category: "MILITARY", baseCost: { gold: 1200, wood: 900, stone: 600, food: 200 }, timeSeconds: 1200 },
  BALLISTICS: { name: "Ballistics", icon: "🏹", description: "Siege armor penetration +15 and attack +10%", category: "MILITARY", baseCost: { gold: 1800, wood: 1200, stone: 800, food: 300 }, timeSeconds: 1500 },
  GUERRILLA_TACTICS: { name: "Guerrilla Tactics", icon: "🗡️", description: "All unit speed +10%", category: "MILITARY", baseCost: { gold: 800, wood: 600, stone: 300, food: 200 }, timeSeconds: 840 },
  MASONRY: { name: "Masonry", icon: "🧱", description: "Tower defense effectiveness +25%", category: "DEFENSE", baseCost: { gold: 250, wood: 200, stone: 300, food: 50 }, timeSeconds: 360 },
  STONE_WALLS: { name: "Stone Walls", icon: "🏰", description: "Tower fortification effectiveness +40%", category: "DEFENSE", baseCost: { gold: 600, wood: 400, stone: 600, food: 100 }, timeSeconds: 720 },
  WATCHTOWER: { name: "Watchtower Network", icon: "🗼", description: "Tower damage +10 per round", category: "DEFENSE", baseCost: { gold: 400, wood: 300, stone: 200, food: 50 }, timeSeconds: 480 },
  POISONED_ARROWS: { name: "Poisoned Arrows", icon: "☠️", description: "Tower damage +20 per round and Archer attack +10%", category: "DEFENSE", baseCost: { gold: 800, wood: 600, stone: 400, food: 100 }, timeSeconds: 900 },
  FORTIFICATIONS: { name: "Fortifications", icon: "🛡️", description: "Tower fortifications +50%", category: "DEFENSE", baseCost: { gold: 1500, wood: 1000, stone: 1000, food: 200 }, timeSeconds: 1500 },
  SPY_NETWORK: { name: "Spy Network", icon: "👁️", description: "Unlocks Spy units", category: "DEFENSE", baseCost: { gold: 500, wood: 300, stone: 100, food: 100 }, timeSeconds: 600 },
  SPEC_SIEGE: { name: "Siege Mastery", icon: "🔨", description: "Siege units: attack +30%, armor penetration +20, HP +20%", category: "MILITARY", baseCost: { gold: 2500, wood: 1800, stone: 1200, food: 500 }, timeSeconds: 2400 },
  SPEC_CAVALRY: { name: "Cavalry Mastery", icon: "🐎", description: "Cavalry units: attack +25%, speed +20%, HP +25%", category: "MILITARY", baseCost: { gold: 2500, wood: 1500, stone: 800, food: 1000 }, timeSeconds: 2400 },
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
