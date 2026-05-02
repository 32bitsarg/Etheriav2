import { PrismaClient, BuildingType } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Base configuration for each building type.
 * All level N values are derived from these bases using formulas.
 * To balance the game, just tweak these numbers.
 */
interface BaseBuildingConfig {
  type: BuildingType;
  maxLevel: number;
  baseCost: { gold: number; wood: number; stone: number; food: number; gems: number };
  baseBuildTimeSeconds: number;
  costMultiplier: number; // Cost increases by this factor per level
  timeMultiplier: number; // Build time increases by this factor per level

  // Production per hour at level 1
  prodGold?: number;
  prodWood?: number;
  prodStone?: number;
  prodFood?: number;
  prodMultiplier: number; // Production increases by this per level

  // Storage bonus at level 1
  storageGold?: number;
  storageWood?: number;
  storageStone?: number;
  storageFood?: number;
  storageMultiplier: number; // Storage increases by this per level
}

const BASE_CONFIGS: BaseBuildingConfig[] = [
  {
    type: "TOWN_HALL",
    maxLevel: 20,
    baseCost: { gold: 0, wood: 0, stone: 0, food: 0, gems: 0 }, // Free starter
    baseBuildTimeSeconds: 0,
    costMultiplier: 1.8,
    timeMultiplier: 1.6,
    storageGold: 500,
    storageWood: 500,
    storageStone: 300,
    storageFood: 300,
    storageMultiplier: 1.4,
    prodMultiplier: 1.0, // Town hall doesn't produce
  },
  {
    type: "GOLD_MINE",
    maxLevel: 20,
    baseCost: { gold: 50, wood: 100, stone: 20, food: 0, gems: 0 },
    baseBuildTimeSeconds: 30,
    costMultiplier: 1.45,
    timeMultiplier: 1.3,
    prodGold: 100,
    prodMultiplier: 1.25,
    storageMultiplier: 1.0,
  },
  {
    type: "LUMBER_MILL",
    maxLevel: 20,
    baseCost: { gold: 50, wood: 50, stone: 20, food: 0, gems: 0 },
    baseBuildTimeSeconds: 30,
    costMultiplier: 1.45,
    timeMultiplier: 1.3,
    prodWood: 100,
    prodMultiplier: 1.25,
    storageMultiplier: 1.0,
  },
  {
    type: "QUARRY",
    maxLevel: 20,
    baseCost: { gold: 100, wood: 150, stone: 0, food: 0, gems: 0 },
    baseBuildTimeSeconds: 45,
    costMultiplier: 1.5,
    timeMultiplier: 1.35,
    prodStone: 60,
    prodMultiplier: 1.25,
    storageMultiplier: 1.0,
  },
  {
    type: "FARM",
    maxLevel: 20,
    baseCost: { gold: 40, wood: 80, stone: 10, food: 0, gems: 0 },
    baseBuildTimeSeconds: 30,
    costMultiplier: 1.45,
    timeMultiplier: 1.3,
    prodFood: 60,
    prodMultiplier: 1.25,
    storageMultiplier: 1.0,
  },
  {
    type: "BARRACKS",
    maxLevel: 20,
    baseCost: { gold: 200, wood: 200, stone: 100, food: 50, gems: 0 },
    baseBuildTimeSeconds: 60,
    costMultiplier: 1.5,
    timeMultiplier: 1.4,
    prodMultiplier: 1.0,
    storageMultiplier: 1.0,
  },
  {
    type: "STABLE",
    maxLevel: 20,
    baseCost: { gold: 250, wood: 300, stone: 150, food: 100, gems: 0 },
    baseBuildTimeSeconds: 90,
    costMultiplier: 1.55,
    timeMultiplier: 1.4,
    prodMultiplier: 1.0,
    storageMultiplier: 1.0,
  },
  {
    type: "ALLIANCE_CENTER",
    maxLevel: 10,
    baseCost: { gold: 500, wood: 400, stone: 200, food: 100, gems: 0 },
    baseBuildTimeSeconds: 300,
    costMultiplier: 1.6,
    timeMultiplier: 1.5,
    prodMultiplier: 1.0,
    storageMultiplier: 1.0,
  },
  {
    type: "LIBRARY",
    maxLevel: 15,
    baseCost: { gold: 300, wood: 400, stone: 300, food: 50, gems: 0 },
    baseBuildTimeSeconds: 120,
    costMultiplier: 1.55,
    timeMultiplier: 1.45,
    prodMultiplier: 1.0,
    storageMultiplier: 1.0,
  },
  {
    type: "STORAGE",
    maxLevel: 20,
    baseCost: { gold: 100, wood: 200, stone: 100, food: 0, gems: 0 },
    baseBuildTimeSeconds: 60,
    costMultiplier: 1.5,
    timeMultiplier: 1.35,
    storageGold: 500,
    storageWood: 500,
    storageStone: 300,
    storageFood: 300,
    storageMultiplier: 1.4,
    prodMultiplier: 1.0,
  },
  {
    type: "WALL",
    maxLevel: 15,
    baseCost: { gold: 100, wood: 300, stone: 300, food: 0, gems: 0 },
    baseBuildTimeSeconds: 120,
    costMultiplier: 1.5,
    timeMultiplier: 1.35,
    prodMultiplier: 1.0,
    storageMultiplier: 1.0,
  },
  {
    type: "TOWER",
    maxLevel: 15,
    baseCost: { gold: 150, wood: 200, stone: 200, food: 0, gems: 0 },
    baseBuildTimeSeconds: 180,
    costMultiplier: 1.5,
    timeMultiplier: 1.4,
    prodMultiplier: 1.0,
    storageMultiplier: 1.0,
  },
  {
    type: "MARKET",
    maxLevel: 10,
    baseCost: { gold: 300, wood: 250, stone: 150, food: 50, gems: 0 },
    baseBuildTimeSeconds: 240,
    costMultiplier: 1.55,
    timeMultiplier: 1.45,
    prodMultiplier: 1.0,
    storageMultiplier: 1.0,
  },
];

function generateLevelConfig(base: BaseBuildingConfig, level: number) {
  const costMult = Math.pow(base.costMultiplier, level - 1);
  const timeMult = Math.pow(base.timeMultiplier, level - 1);
  const prodMult = level * base.prodMultiplier; // Linear production growth
  const storageMult = level * base.storageMultiplier;

  return {
    type: base.type,
    level,
    costGold: Math.floor(base.baseCost.gold * costMult),
    costWood: Math.floor(base.baseCost.wood * costMult),
    costStone: Math.floor(base.baseCost.stone * costMult),
    costFood: Math.floor(base.baseCost.food * costMult),
    costGems: Math.floor(base.baseCost.gems * costMult),
    buildTimeSeconds: Math.floor(base.baseBuildTimeSeconds * timeMult),
    prodGoldPerHour: Math.floor((base.prodGold ?? 0) * prodMult),
    prodWoodPerHour: Math.floor((base.prodWood ?? 0) * prodMult),
    prodStonePerHour: Math.floor((base.prodStone ?? 0) * prodMult),
    prodFoodPerHour: Math.floor((base.prodFood ?? 0) * prodMult),
    storageGold: Math.floor((base.storageGold ?? 0) * storageMult),
    storageWood: Math.floor((base.storageWood ?? 0) * storageMult),
    storageStone: Math.floor((base.storageStone ?? 0) * storageMult),
    storageFood: Math.floor((base.storageFood ?? 0) * storageMult),
    maxLevel: base.maxLevel,
  };
}

async function main() {
  console.log("🌱 Seeding building configs...");

  // Clear existing configs
  await prisma.buildingConfig.deleteMany();

  const configs = [];

  for (const base of BASE_CONFIGS) {
    for (let level = 1; level <= base.maxLevel; level++) {
      configs.push(generateLevelConfig(base, level));
    }
  }

  // Batch insert
  await prisma.buildingConfig.createMany({ data: configs });

  console.log(`✅ Seeded ${configs.length} building config rows`);
  console.log("📊 Sample: Gold Mine L1 -> L5 production:");

  const samples = await prisma.buildingConfig.findMany({
    where: { type: "GOLD_MINE", level: { in: [1, 2, 3, 4, 5] } },
    orderBy: { level: "asc" },
    select: { level: true, prodGoldPerHour: true, costGold: true, buildTimeSeconds: true },
  });

  for (const s of samples) {
    console.log(`  L${s.level}: ${s.prodGoldPerHour}g/h | Cost: ${s.costGold}g | Time: ${s.buildTimeSeconds}s`);
  }
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
