import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { db, COLLECTIONS } from './src/infrastructure/matecito.js';
import type { UnitType } from '@etheria/shared';
import { BASE_BUILDING_CONFIGS, EXPECTED_BUILDING_TYPES, generateBuildingLevelConfig } from './src/domain/buildingConfigSeedData.js';

function assertDbOk(result: any, context: string) {
  if (!result) return;
  const err = result.error ?? result.err;
  if (err) {
    const msg = typeof err === 'string' ? err : (err.message ?? JSON.stringify(err));
    throw new Error(`[seed-db] ${context}: ${msg}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function insertWithRetry(collection: string, payload: unknown, context: string, maxAttempts = 6) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await db.from(collection).insert(payload) as any;
    const err = result?.error ?? result?.err;
    if (!err) {
      await sleep(45);
      return result;
    }

    lastError = err;
    const message = typeof err === 'string' ? err : (err.message ?? JSON.stringify(err));
    const retryable = /internal server error/i.test(message) || Number(err?.status ?? 0) >= 500;
    if (!retryable || attempt === maxAttempts) {
      assertDbOk(result, `${context} attempt ${attempt}`);
    }

    const waitMs = 600 * attempt;
    console.warn(`⚠️ Retry ${attempt}/${maxAttempts} for ${context} after ${waitMs}ms: ${message}`);
    await sleep(waitMs);
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Base configuration for each building type.
 * All level N values are derived from these bases using formulas.
 * To balance the game, just tweak these numbers.
 */

// ─── Unit Configs ───

interface UnitConfig {
  type: UnitType;
  level: number;
  costGold: number;
  costWood: number;
  costStone: number;
  costFood: number;
  costGems: number;
  trainingTimeSeconds: number;
  attack: number;
  defense: number;
  speed: number;
  carry: number;
  hp: number;
  armorPenetration: number;
  maxLevel: number;
}

const BASE_UNIT_CONFIGS: { type: UnitType; maxLevel: number; base: Omit<UnitConfig, 'type' | 'level' | 'maxLevel'> & { costMultiplier: number; statMultiplier: number; apMultiplier: number } }[] = [
  {
    type: 'WARRIOR', maxLevel: 20,
    base: {
      costGold: 20, costWood: 30, costStone: 0, costFood: 10, costGems: 0,
      trainingTimeSeconds: 30,
      attack: 10, defense: 15, speed: 60, carry: 20,
      hp: 100, armorPenetration: 0,
      costMultiplier: 1.3, statMultiplier: 1.15, apMultiplier: 1.02,
    },
  },
  {
    type: 'ARCHER', maxLevel: 20,
    base: {
      costGold: 30, costWood: 40, costStone: 0, costFood: 15, costGems: 0,
      trainingTimeSeconds: 45,
      attack: 20, defense: 8, speed: 50, carry: 15,
      hp: 60, armorPenetration: 5,
      costMultiplier: 1.35, statMultiplier: 1.18, apMultiplier: 1.04,
    },
  },
  {
    type: 'CAVALRY', maxLevel: 20,
    base: {
      costGold: 80, costWood: 60, costStone: 20, costFood: 40, costGems: 0,
      trainingTimeSeconds: 120,
      attack: 40, defense: 25, speed: 120, carry: 50,
      hp: 120, armorPenetration: 10,
      costMultiplier: 1.4, statMultiplier: 1.2, apMultiplier: 1.05,
    },
  },
  {
    type: 'SIEGE', maxLevel: 15,
    base: {
      costGold: 200, costWood: 300, costStone: 150, costFood: 50, costGems: 0,
      trainingTimeSeconds: 300,
      attack: 80, defense: 10, speed: 20, carry: 100,
      hp: 80, armorPenetration: 30,
      costMultiplier: 1.5, statMultiplier: 1.25, apMultiplier: 1.08,
    },
  },
  {
    type: 'SPY', maxLevel: 10,
    base: {
      costGold: 100, costWood: 20, costStone: 0, costFood: 10, costGems: 0,
      trainingTimeSeconds: 60,
      attack: 0, defense: 2, speed: 200, carry: 0,
      hp: 30, armorPenetration: 0,
      costMultiplier: 1.45, statMultiplier: 1.1, apMultiplier: 1.0,
    },
  },
];

function generateUnitLevelConfig(base: typeof BASE_UNIT_CONFIGS[0], level: number): UnitConfig {
  const costMult = Math.pow(base.base.costMultiplier, level - 1);
  const statMult = Math.pow(base.base.statMultiplier, level - 1);
  const apMult = Math.pow(base.base.apMultiplier, level - 1);

  return {
    type: base.type,
    level,
    costGold: Math.floor(base.base.costGold * costMult),
    costWood: Math.floor(base.base.costWood * costMult),
    costStone: Math.floor(base.base.costStone * costMult),
    costFood: Math.floor(base.base.costFood * costMult),
    costGems: Math.floor(base.base.costGems * costMult),
    trainingTimeSeconds: Math.floor(base.base.trainingTimeSeconds * Math.pow(1.1, level - 1)),
    attack: Math.floor(base.base.attack * statMult),
    defense: Math.floor(base.base.defense * statMult),
    speed: Math.floor(base.base.speed * Math.pow(1.05, level - 1)),
    carry: Math.floor(base.base.carry * statMult),
    hp: Math.floor(base.base.hp * statMult),
    armorPenetration: Math.floor(base.base.armorPenetration * apMult),
    maxLevel: base.maxLevel,
  };
}

async function seed() {
  console.log('🌱 Seeding matecito.dev...');

  async function hardTruncate(collection: string) {
    // Ensure idempotent seeds: wipe even soft-deleted records.
    // 1) Soft-delete in bulk (fast)
    try {
      await (db as any).from(collection).delete().execute();
    } catch {}

    // 2) Hard-delete by id, including soft-deleted records.
    for (let round = 0; round < 200; round++) {
      const res = await (db as any).from(collection).includeDeleted().limit(500).get() as any;
      if (res?.error) throw new Error(`${collection}.get(): ${res.error.message ?? res.error}`);
      const rows = (res.data ?? []) as any[];
      if (rows.length === 0) break;
      for (const row of rows) {
        if (!row?.id) continue;
        const del = await (db as any).from(collection).hardDelete(row.id) as any;
        if (del?.error) {
          const msg = del.error.message ?? del.error;
          if (!/record not found/i.test(String(msg))) {
            throw new Error(`${collection}.hardDelete(${row.id}): ${msg}`);
          }
        }
      }
    }
  }

  // Clean existing building configs
  console.log('🧹 Cleaning existing building configs...');
  await hardTruncate(COLLECTIONS.BUILDING_CONFIGS);

  // Clean existing unit configs
  console.log('🧹 Cleaning existing unit configs...');
  await hardTruncate(COLLECTIONS.UNIT_CONFIGS);

  // Seed building configs
  const buildingConfigs = [];
  for (const base of BASE_BUILDING_CONFIGS) {
    for (let level = 1; level <= base.maxLevel; level++) {
      buildingConfigs.push(generateBuildingLevelConfig(base, level));
    }
  }

  console.log(`🏗️ Inserting ${buildingConfigs.length} building configs...`);
  for (const cfg of buildingConfigs) {
    await insertWithRetry(COLLECTIONS.BUILDING_CONFIGS, cfg, `BUILDING_CONFIGS.insert(${cfg.type} L${cfg.level})`);
  }

  const seededTypes = [...new Set(buildingConfigs.map((cfg) => cfg.type))].sort();
  const missingTypes = EXPECTED_BUILDING_TYPES.filter((type) => !seededTypes.includes(type));
  const unexpectedTypes = seededTypes.filter((type) => !EXPECTED_BUILDING_TYPES.includes(type));
  if (missingTypes.length > 0 || unexpectedTypes.length > 0) {
    throw new Error(
      `[seed] building_configs coverage mismatch. Missing: ${missingTypes.join(', ') || 'none'}. Unexpected: ${unexpectedTypes.join(', ') || 'none'}`
    );
  }

  for (const type of EXPECTED_BUILDING_TYPES) {
    const base = BASE_BUILDING_CONFIGS.find((cfg) => cfg.type === type);
    if (!base) {
      throw new Error(`[seed] Missing base building config for ${type}`);
    }
    for (let level = 1; level <= base.maxLevel; level++) {
      if (!buildingConfigs.some((cfg) => cfg.type === type && cfg.level === level)) {
        throw new Error(`[seed] Missing generated building config ${type} level ${level}`);
      }
    }
  }

  // Seed unit configs
  const unitConfigs: UnitConfig[] = [];
  for (const base of BASE_UNIT_CONFIGS) {
    for (let level = 1; level <= base.maxLevel; level++) {
      unitConfigs.push(generateUnitLevelConfig(base, level));
    }
  }

  console.log(`⚔️ Inserting ${unitConfigs.length} unit configs...`);
  for (const cfg of unitConfigs) {
    await insertWithRetry(COLLECTIONS.UNIT_CONFIGS, cfg, `UNIT_CONFIGS.insert(${cfg.type} L${cfg.level})`);
  }

  // Verify
  const countBuildings = await db.from(COLLECTIONS.BUILDING_CONFIGS).count() as any;
  const countUnits = await db.from(COLLECTIONS.UNIT_CONFIGS).count() as any;

  console.log(`✅ Seeded ${countBuildings.data ?? buildingConfigs.length} building configs`);
  console.log(`✅ Seeded ${countUnits.data ?? unitConfigs.length} unit configs`);

  // Sample
  const goldMine = await db.from(COLLECTIONS.BUILDING_CONFIGS).eq('type', 'GOLD_MINE').get() as any;
  console.log('\n📊 Sample: Gold Mine configs:');
  for (const c of goldMine.data?.slice(0, 5) ?? []) {
    console.log(`  L${c.level}: ${c.prodGoldPerHour}g/h | Cost: ${c.costGold}g | Time: ${c.buildTimeSeconds}s`);
  }

  // ─── Tech Configs ───

  // Clean existing tech configs
  console.log('🧹 Cleaning existing tech configs...');
  await hardTruncate(COLLECTIONS.TECH_CONFIGS);

  const TECH_CONFIGS = [
    // ─── ECONOMY ───
    {
      id: crypto.randomUUID(),
      techId: 'COLLECTION_EFFICIENT_I',
      name: 'Efficient Collection I',
      description: 'Increases all resource production by 5%',
      category: 'ECONOMY',
      maxLevel: 1,
      costGold: 200,
      costWood: 100,
      costStone: 50,
      costFood: 50,
      researchTimeSeconds: 300,
      prerequisites: [],
      mutuallyExclusive: [],
      effects: [
        { type: 'RESOURCE_PROD', target: 'all', stat: 'production', value: 0.05, operation: 'ADD' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'COLLECTION_EFFICIENT_II',
      name: 'Efficient Collection II',
      description: 'Increases all resource production by 10%',
      category: 'ECONOMY',
      maxLevel: 1,
      costGold: 500,
      costWood: 300,
      costStone: 150,
      costFood: 150,
      researchTimeSeconds: 600,
      prerequisites: ['COLLECTION_EFFICIENT_I'],
      mutuallyExclusive: [],
      effects: [
        { type: 'RESOURCE_PROD', target: 'all', stat: 'production', value: 0.10, operation: 'ADD' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'COLLECTION_EFFICIENT_III',
      name: 'Efficient Collection III',
      description: 'Increases all resource production by 15%',
      category: 'ECONOMY',
      maxLevel: 1,
      costGold: 1200,
      costWood: 800,
      costStone: 400,
      costFood: 400,
      researchTimeSeconds: 1200,
      prerequisites: ['COLLECTION_EFFICIENT_II'],
      mutuallyExclusive: [],
      effects: [
        { type: 'RESOURCE_PROD', target: 'all', stat: 'production', value: 0.15, operation: 'ADD' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'ADVANCED_STORAGE',
      name: 'Advanced Storage',
      description: 'Increases storage capacity by 20%',
      category: 'ECONOMY',
      maxLevel: 1,
      costGold: 400,
      costWood: 300,
      costStone: 200,
      costFood: 100,
      researchTimeSeconds: 480,
      prerequisites: ['COLLECTION_EFFICIENT_I'],
      mutuallyExclusive: [],
      effects: [
        { type: 'BUILDING_STAT', target: 'STORAGE', stat: 'capacity', value: 1.2, operation: 'MULTIPLY' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'WARTIME_ECONOMY',
      name: 'Wartime Economy',
      description: 'Reduces unit training costs by 15%',
      category: 'ECONOMY',
      maxLevel: 1,
      costGold: 800,
      costWood: 600,
      costStone: 300,
      costFood: 300,
      researchTimeSeconds: 900,
      prerequisites: ['COLLECTION_EFFICIENT_II'],
      mutuallyExclusive: [],
      effects: [
        { type: 'GLOBAL_BONUS', target: 'trainingCostReduction', stat: 'cost', value: 0.15, operation: 'ADD' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'TRADE',
      name: 'Trade Routes',
      description: 'Unlocks market trading and increases gold production by 10%',
      category: 'ECONOMY',
      maxLevel: 1,
      costGold: 600,
      costWood: 400,
      costStone: 200,
      costFood: 200,
      researchTimeSeconds: 720,
      prerequisites: ['COLLECTION_EFFICIENT_I'],
      mutuallyExclusive: [],
      effects: [
        { type: 'RESOURCE_PROD', target: 'gold', stat: 'production', value: 0.10, operation: 'ADD' },
      ],
    },

    // ─── MILITARY ───
    {
      id: crypto.randomUUID(),
      techId: 'WEAPON_FORGE_I',
      name: 'Weapon Forge I',
      description: 'Increases all unit attack by 10%',
      category: 'MILITARY',
      maxLevel: 1,
      costGold: 300,
      costWood: 200,
      costStone: 100,
      costFood: 50,
      researchTimeSeconds: 360,
      prerequisites: [],
      mutuallyExclusive: [],
      effects: [
        { type: 'UNIT_STAT', target: 'all', stat: 'attack', value: 0.10, operation: 'ADD' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'WEAPON_FORGE_II',
      name: 'Weapon Forge II',
      description: 'Increases all unit attack by 15% and armor penetration by 5',
      category: 'MILITARY',
      maxLevel: 1,
      costGold: 700,
      costWood: 500,
      costStone: 300,
      costFood: 150,
      researchTimeSeconds: 720,
      prerequisites: ['WEAPON_FORGE_I'],
      mutuallyExclusive: [],
      effects: [
        { type: 'UNIT_STAT', target: 'all', stat: 'attack', value: 0.15, operation: 'ADD' },
        { type: 'UNIT_STAT', target: 'all', stat: 'armorPenetration', value: 5, operation: 'ADD' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'REINFORCED_BOWS',
      name: 'Reinforced Bows',
      description: 'Archer attack +20% and range bonus',
      category: 'MILITARY',
      maxLevel: 1,
      costGold: 500,
      costWood: 400,
      costStone: 100,
      costFood: 100,
      researchTimeSeconds: 540,
      prerequisites: ['WEAPON_FORGE_I'],
      mutuallyExclusive: [],
      effects: [
        { type: 'UNIT_STAT', target: 'ARCHER', stat: 'attack', value: 0.20, operation: 'ADD' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'HORSE_BREEDING',
      name: 'Horse Breeding',
      description: 'Unlocks Cavalry units. Cavalry HP +15%',
      category: 'MILITARY',
      maxLevel: 1,
      costGold: 600,
      costWood: 400,
      costStone: 200,
      costFood: 300,
      researchTimeSeconds: 600,
      prerequisites: ['WEAPON_FORGE_I'],
      mutuallyExclusive: [],
      effects: [
        { type: 'UNIT_STAT', target: 'CAVALRY', stat: 'hp', value: 0.15, operation: 'ADD' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'HEAVY_CAVALRY',
      name: 'Heavy Cavalry',
      description: 'Cavalry defense +20% and attack +10%',
      category: 'MILITARY',
      maxLevel: 1,
      costGold: 1000,
      costWood: 700,
      costStone: 400,
      costFood: 500,
      researchTimeSeconds: 1080,
      prerequisites: ['HORSE_BREEDING'],
      mutuallyExclusive: [],
      effects: [
        { type: 'UNIT_STAT', target: 'CAVALRY', stat: 'defense', value: 0.20, operation: 'ADD' },
        { type: 'UNIT_STAT', target: 'CAVALRY', stat: 'attack', value: 0.10, operation: 'ADD' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'SIEGE_ENGINEERING',
      name: 'Siege Engineering',
      description: 'Unlocks Siege units. Siege attack +15%',
      category: 'MILITARY',
      maxLevel: 1,
      costGold: 1200,
      costWood: 900,
      costStone: 600,
      costFood: 200,
      researchTimeSeconds: 1200,
      prerequisites: ['WEAPON_FORGE_II'],
      mutuallyExclusive: [],
      effects: [
        { type: 'UNIT_STAT', target: 'SIEGE', stat: 'attack', value: 0.15, operation: 'ADD' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'BALLISTICS',
      name: 'Ballistics',
      description: 'Siege armor penetration +15 and attack +10%',
      category: 'MILITARY',
      maxLevel: 1,
      costGold: 1800,
      costWood: 1200,
      costStone: 800,
      costFood: 300,
      researchTimeSeconds: 1500,
      prerequisites: ['SIEGE_ENGINEERING'],
      mutuallyExclusive: [],
      effects: [
        { type: 'UNIT_STAT', target: 'SIEGE', stat: 'armorPenetration', value: 15, operation: 'ADD' },
        { type: 'UNIT_STAT', target: 'SIEGE', stat: 'attack', value: 0.10, operation: 'ADD' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'GUERRILLA_TACTICS',
      name: 'Guerrilla Tactics',
      description: 'All unit speed +10%',
      category: 'MILITARY',
      maxLevel: 1,
      costGold: 800,
      costWood: 600,
      costStone: 300,
      costFood: 200,
      researchTimeSeconds: 840,
      prerequisites: ['WEAPON_FORGE_II'],
      mutuallyExclusive: [],
      effects: [
        { type: 'UNIT_STAT', target: 'all', stat: 'speed', value: 0.10, operation: 'ADD' },
      ],
    },

    // ─── DEFENSE ───
    {
      id: crypto.randomUUID(),
      techId: 'MASONRY',
      name: 'Masonry',
      description: 'Tower defense effectiveness +25%',
      category: 'DEFENSE',
      maxLevel: 1,
      costGold: 250,
      costWood: 200,
      costStone: 300,
      costFood: 50,
      researchTimeSeconds: 360,
      prerequisites: [],
      mutuallyExclusive: [],
      effects: [
        { type: 'BUILDING_STAT', target: 'TOWER', stat: 'defenseBonus', value: 1.25, operation: 'MULTIPLY' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'STONE_WALLS',
      name: 'Stone Walls',
      description: 'Tower fortification effectiveness +40%',
      category: 'DEFENSE',
      maxLevel: 1,
      costGold: 600,
      costWood: 400,
      costStone: 600,
      costFood: 100,
      researchTimeSeconds: 720,
      prerequisites: ['MASONRY'],
      mutuallyExclusive: [],
      effects: [
        { type: 'BUILDING_STAT', target: 'TOWER', stat: 'defenseBonus', value: 1.40, operation: 'MULTIPLY' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'WATCHTOWER',
      name: 'Watchtower Network',
      description: 'Tower damage +10 per round',
      category: 'DEFENSE',
      maxLevel: 1,
      costGold: 400,
      costWood: 300,
      costStone: 200,
      costFood: 50,
      researchTimeSeconds: 480,
      prerequisites: ['MASONRY'],
      mutuallyExclusive: [],
      effects: [
        { type: 'BUILDING_STAT', target: 'TOWER', stat: 'damage', value: 10, operation: 'ADD' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'POISONED_ARROWS',
      name: 'Poisoned Arrows',
      description: 'Tower damage +20 per round and Archer attack +10%',
      category: 'DEFENSE',
      maxLevel: 1,
      costGold: 800,
      costWood: 600,
      costStone: 400,
      costFood: 100,
      researchTimeSeconds: 900,
      prerequisites: ['WATCHTOWER', 'REINFORCED_BOWS'],
      mutuallyExclusive: [],
      effects: [
        { type: 'BUILDING_STAT', target: 'TOWER', stat: 'damage', value: 20, operation: 'ADD' },
        { type: 'UNIT_STAT', target: 'ARCHER', stat: 'attack', value: 0.10, operation: 'ADD' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'FORTIFICATIONS',
      name: 'Fortifications',
      description: 'Tower fortifications +50%',
      category: 'DEFENSE',
      maxLevel: 1,
      costGold: 1500,
      costWood: 1000,
      costStone: 1000,
      costFood: 200,
      researchTimeSeconds: 1500,
      prerequisites: ['STONE_WALLS'],
      mutuallyExclusive: [],
      effects: [
        { type: 'BUILDING_STAT', target: 'TOWER', stat: 'defenseBonus', value: 1.50, operation: 'MULTIPLY' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'SPY_NETWORK',
      name: 'Spy Network',
      description: 'Unlocks Spy units',
      category: 'DEFENSE',
      maxLevel: 1,
      costGold: 500,
      costWood: 300,
      costStone: 100,
      costFood: 100,
      researchTimeSeconds: 600,
      prerequisites: [],
      mutuallyExclusive: [],
      effects: [],
    },

    // ─── SPECIALIZATION (Mutually Exclusive) ───
    {
      id: crypto.randomUUID(),
      techId: 'SPEC_SIEGE',
      name: 'Siege Mastery',
      description: 'Siege units: attack +30%, armor penetration +20, HP +20%',
      category: 'MILITARY',
      maxLevel: 1,
      costGold: 2500,
      costWood: 1800,
      costStone: 1200,
      costFood: 500,
      researchTimeSeconds: 2400,
      prerequisites: ['BALLISTICS', 'FORTIFICATIONS'],
      mutuallyExclusive: ['SPEC_CAVALRY'],
      effects: [
        { type: 'UNIT_STAT', target: 'SIEGE', stat: 'attack', value: 0.30, operation: 'ADD' },
        { type: 'UNIT_STAT', target: 'SIEGE', stat: 'armorPenetration', value: 20, operation: 'ADD' },
        { type: 'UNIT_STAT', target: 'SIEGE', stat: 'hp', value: 0.20, operation: 'ADD' },
      ],
    },
    {
      id: crypto.randomUUID(),
      techId: 'SPEC_CAVALRY',
      name: 'Cavalry Mastery',
      description: 'Cavalry units: attack +25%, speed +20%, HP +25%',
      category: 'MILITARY',
      maxLevel: 1,
      costGold: 2500,
      costWood: 1500,
      costStone: 800,
      costFood: 1000,
      researchTimeSeconds: 2400,
      prerequisites: ['HEAVY_CAVALRY', 'STONE_WALLS'],
      mutuallyExclusive: ['SPEC_SIEGE'],
      effects: [
        { type: 'UNIT_STAT', target: 'CAVALRY', stat: 'attack', value: 0.25, operation: 'ADD' },
        { type: 'UNIT_STAT', target: 'CAVALRY', stat: 'speed', value: 0.20, operation: 'ADD' },
        { type: 'UNIT_STAT', target: 'CAVALRY', stat: 'hp', value: 0.25, operation: 'ADD' },
      ],
    },
  ];

  console.log(`📚 Inserting ${TECH_CONFIGS.length} tech configs...`);
  for (const cfg of TECH_CONFIGS) {
    await insertWithRetry(COLLECTIONS.TECH_CONFIGS, cfg, `TECH_CONFIGS.insert(${cfg.techId})`);
  }

  const countTechs = await db.from(COLLECTIONS.TECH_CONFIGS).count() as any;
  console.log(`✅ Seeded ${countTechs.data ?? TECH_CONFIGS.length} tech configs`);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
