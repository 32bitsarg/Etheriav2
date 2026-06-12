import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { prisma } from '@etheria/database';
import {
  deleteRecordBySelector,
  getRecordByLogicalId,
  mergeRecordByLogicalId,
  mergeRecordBySelector,
} from '../infrastructure/matecitoRecord.js';
import { calculateCityStats } from '../domain/buildings.js';
import { resolveBattle, calculateLoot, calculateTravelTimeWithMultiplier, calculateTravelTime } from '../domain/battles.js';
import { getUnitStats } from '../domain/units.js';
import { addResources } from '../domain/resources.js';
import { calculateTechBonuses } from '../domain/techs.js';
import { normalizeBuildingsByType } from '../domain/buildingNormalization.js';
import { calculateEffectiveProduction } from '../domain/production.js';
import { getSeasonState } from '../domain/seasons.js';
import type { BarbarianArchetype } from '@etheria/shared';
import { calculateEstimatedReward, calculateActualReward } from '../domain/barbarianRewardConfigData.js';
import { processBarbarianAttacks } from '../domain/barbarianAttacks.js';
import { LOCAL_BARBARIAN_ATTACK_CONFIG } from '../domain/barbarianAttackConfigData.js';
import { resolveWorldZone } from '../domain/worldZoneConfigData.js';
import { getWorldConfig } from '../domain/worldConfig.js';
import { calculatePathSpeedMultiplier } from '../domain/worldTerrainConfigData.js';
import {
  evaluateWinterPressure,
  resetWinterState,
  DEFAULT_WINTER_PRESSURE_CONFIG,
  ZONE_WINTER_INTENSITY,
} from '../domain/winterPressure.js';
import type { UnitType, Season } from '@etheria/shared';
import { advanceDailyQuest } from '../routes/dailyQuests.js';
import { unlockAchievement } from '../routes/achievements.js';
import { finishWorkerMetric, startWorkerMetric } from '../infrastructure/perfMetrics.js';
import { getActiveEventEffect } from '../routes/events.js';
import { resolveEspionageMission } from '../routes/espionage.js';

let workerRunning = false;
let workerTickRunning = false;
let lastResourceTickAt = 0;
let lastWonderDayAt = 0;
const WONDER_DAY_INTERVAL_MS = 24 * 60 * 60 * 1000;
const QUEUE_WORKER_INTERVAL_MS = Number(process.env.QUEUE_WORKER_INTERVAL_MS ?? 5000);
const RESOURCE_TICK_INTERVAL_MS = Number(process.env.RESOURCE_TICK_INTERVAL_MS ?? 60000);
const RESOURCE_TICK_MIN_ELAPSED_MS = Number(process.env.RESOURCE_TICK_MIN_ELAPSED_MS ?? 60000);
const RESOURCE_TICK_BATCH_SIZE = Number(process.env.RESOURCE_TICK_BATCH_SIZE ?? 100);
const QUEUE_DUE_BATCH_SIZE = Number(process.env.QUEUE_DUE_BATCH_SIZE ?? 100);
const BATTLE_DUE_BATCH_SIZE = Number(process.env.BATTLE_DUE_BATCH_SIZE ?? 100);

async function getActiveAllianceEffects(userId?: string) {
  if (!userId) return [];
  const membershipRes = await db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq('userId', userId).getFirst() as any;
  if (!membershipRes.data?.allianceId) return [];

  const effectsRes = await db.from(COLLECTIONS.ALLIANCE_EFFECTS).eq('allianceId', membershipRes.data.allianceId).get() as any;
  const now = Date.now();
  return (effectsRes.data ?? []).filter((effect: any) => !effect.expiresAt || new Date(effect.expiresAt).getTime() > now);
}

export function startQueueWorker(): void {
  if (workerRunning) return;
  workerRunning = true;

  console.log('⏱️  Queue worker started (tick every 5s)');

  setInterval(async () => {
    if (workerTickRunning) return;
    workerTickRunning = true;
    const metricStart = startWorkerMetric('queue');
    try {
      await processQueueWorkerTick();
      finishWorkerMetric('queue', metricStart);
    } catch (err) {
      finishWorkerMetric('queue', metricStart, err);
      console.error('Queue worker error:', err);
    } finally {
      workerTickRunning = false;
    }
  }, QUEUE_WORKER_INTERVAL_MS);
}

export async function processQueueWorkerTick() {
  await processBuildQueues();
  await processTrainingQueues();
  await processResearchQueues();
  if (Date.now() - lastResourceTickAt >= RESOURCE_TICK_INTERVAL_MS) {
    lastResourceTickAt = Date.now();
    await processResourceTicks();
  }
  await processRallyLaunches();
  await processEspionageMissions();
  await processBattles();
  await processBattleReturns();
  await processBarbarianBattles();
  await processBarbarianReturns();
  await processBarbarianAttacks();
  await resolveBarbarianAttackArrivals();
  await processBarbarianAttackReturns();
  await processTradeCaravans();
  await processWonderDayTick();
}

async function processWonderDayTick() {
  if (Date.now() - lastWonderDayAt < WONDER_DAY_INTERVAL_MS) return;
  lastWonderDayAt = Date.now();
  const res = await db.from(COLLECTIONS.WONDER).eq('id', 'world_wonder').getFirst() as any;
  const wonder = res.data;
  if (!wonder?.holderAllianceId) return;
  const days = (wonder.daysControlled ?? 0) + 1;
  await db.from(COLLECTIONS.WONDER).eq('id', 'world_wonder').merge({ daysControlled: days, updatedAt: new Date().toISOString() }).execute();
  if (days >= 7) {
    const { createActivityFeedEntry } = await import('../routes/activityFeed.js');
    const allianceRes = await db.from(COLLECTIONS.ALLIANCES).eq('id', wonder.holderAllianceId).getFirst() as any;
    await createActivityFeedEntry('WONDER_VICTORY', allianceRes.data?.name ?? 'Alianza', wonder.holderAllianceId, { cityId: wonder.holderCityId, daysControlled: days });
    await db.from(COLLECTIONS.WONDER).eq('id', 'world_wonder').merge({ daysControlled: 0, holderAllianceId: null, holderCityId: null, controlStartedAt: null, updatedAt: new Date().toISOString() }).execute();
  }
}

async function processEspionageMissions() {
  const now = new Date();
  const due = await prisma.espionageMission.findMany({
    where: { status: 'TRAVELING', arrivesAt: { lte: now } },
    take: 20,
  });
  for (const m of due) {
    try { await resolveEspionageMission(m.id); }
    catch (err) { console.error(`Espionage mission ${m.id} failed:`, err); }
  }
}

// ─── Build Queues ───

async function processBuildQueues() {
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const initialQueues = {
    data: await prisma.buildQueue.findMany({
      where: { isComplete: false, completesAt: { lte: nowDate } },
      orderBy: [{ completesAt: 'asc' }, { startedAt: 'asc' }],
      take: QUEUE_DUE_BATCH_SIZE,
    }),
  };

  const cityIds = new Set<string>((initialQueues.data ?? []).map((queue: any) => queue.cityId));
  for (const cityId of cityIds) {
    await cleanupDuplicateBuildings(cityId);
  }

  const queues = initialQueues;

  const byBuilding = new Map<string, any[]>();
  for (const queue of queues.data ?? []) {
    const queueKey = `${queue.cityId}:${queue.buildingType}`;
    const list = byBuilding.get(queueKey) ?? [];
    list.push(queue);
    byBuilding.set(queueKey, list);
  }

  for (const group of byBuilding.values()) {
    group.sort((a, b) => {
      const startedDiff = new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      if (startedDiff !== 0) return startedDiff;
      const targetDiff = (b.targetLevel ?? 0) - (a.targetLevel ?? 0);
      if (targetDiff !== 0) return targetDiff;
      return 0;
    });

    const [primary, ...duplicates] = group;
    if (!primary) continue;

    const allQueues = [...group];

    const cityBuildingsRes = await db.from(COLLECTIONS.BUILDINGS)
      .eq('cityId', primary.cityId)
      .get() as any;

    const normalizedBuildings = normalizeBuildingsByType((cityBuildingsRes.data ?? []) as any[]);
    const canonicalBuilding = normalizedBuildings.kept.find((building: any) => building.type === primary.buildingType) ?? null;
    const currentLevel = canonicalBuilding?.level ?? 0;

    if (currentLevel >= (primary.targetLevel ?? 0)) {
      await deleteBuildQueues(allQueues);
      continue;
    }

    if (new Date(primary.completesAt) <= new Date(now)) {
      if (canonicalBuilding) {
        await mergeRecordBySelector(COLLECTIONS.BUILDINGS, canonicalBuilding, {
          level: primary.targetLevel,
          upgradedAt: now,
        });
      } else {
        await deleteBuildQueues(allQueues);
        continue;
      }

      await deleteBuildQueues(allQueues);

      const updatedCityBuildings = await db.from(COLLECTIONS.BUILDINGS)
        .eq('cityId', primary.cityId)
        .get() as any;

      const stats = calculateCityStats(updatedCityBuildings.data ?? []);
      await mergeRecordByLogicalId(COLLECTIONS.CITIES, primary.cityId, {
          goldPerHour: stats.production.goldPerHour,
          woodPerHour: stats.production.woodPerHour,
          stonePerHour: stats.production.stonePerHour,
          foodPerHour: stats.production.foodPerHour,
          maxGold: stats.storage.maxGold,
          maxWood: stats.storage.maxWood,
          maxStone: stats.storage.maxStone,
          maxFood: stats.storage.maxFood,
        });

      console.log(`✅ Build completed: ${primary.buildingType} → L${primary.targetLevel} (city: ${primary.cityId})`);
    }
  }
}

async function deleteBuildQueues(queues: any[]) {
  await Promise.all(
    queues.map((queue) => deleteRecordBySelector(COLLECTIONS.BUILD_QUEUES, queue))
  );
}

async function cleanupDuplicateBuildings(cityId: string) {
  const buildingsRes = await db.from(COLLECTIONS.BUILDINGS).eq('cityId', cityId).get() as any;
  const activeQueuesRes = await db.from(COLLECTIONS.BUILD_QUEUES)
    .eq('cityId', cityId)
    .eq('isComplete', false)
    .get() as any;
  const activeBuildingIds = new Set<string>((activeQueuesRes.data ?? []).map((queue: any) => queue.buildingId));
  const deduped = normalizeBuildingsByType((buildingsRes.data ?? []) as any[], activeBuildingIds);
  if (deduped.removed.length === 0) return;

  const queueUpdates: Promise<any>[] = [];
  for (const removed of deduped.removed as any[]) {
    const primary = deduped.primaryByType.get(String(removed.type));
    if (!primary) continue;

    queueUpdates.push(
      db.from(COLLECTIONS.BUILD_QUEUES)
        .eq('cityId', cityId)
        .eq('buildingId', removed.id)
        .eq('isComplete', false)
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

// ─── Training Queues ───

async function processTrainingQueues() {
  const nowDate = new Date();
  const queues = {
    data: await prisma.trainingQueue.findMany({
      where: { isComplete: false, completesAt: { lte: nowDate } },
      orderBy: [{ completesAt: 'asc' }, { startedAt: 'asc' }],
      take: QUEUE_DUE_BATCH_SIZE,
    }),
  };

  for (const queue of queues.data ?? []) {
    if (new Date(queue.completesAt) <= nowDate) {
      const existing = await db.from(COLLECTIONS.UNITS)
        .eq('cityId', queue.cityId)
        .eq('type', queue.unitType)
        .get() as any;

      if (existing.data?.length > 0) {
        const current = existing.data[0];
        await mergeRecordBySelector(COLLECTIONS.UNITS, current, { count: current.count + queue.count });
      } else {
        await db.from(COLLECTIONS.UNITS).insert({
          id: crypto.randomUUID(),
          cityId: queue.cityId,
          type: queue.unitType,
          count: queue.count,
        });
      }

      await mergeRecordBySelector(COLLECTIONS.TRAINING_QUEUES, queue, { isComplete: true });

      console.log(`✅ Training completed: ${queue.count} ${queue.unitType} (city: ${queue.cityId})`);
    }
  }
}

// ─── Resource Ticks ───

async function processResourceTicks() {
  const now = new Date();
  const eligibleCities = await prisma.city.findMany({
    where: {
      lastResourceUpdate: {
        lte: new Date(now.getTime() - RESOURCE_TICK_MIN_ELAPSED_MS),
      },
    },
    include: { units: true },
    orderBy: { lastResourceUpdate: 'asc' },
    take: RESOURCE_TICK_BATCH_SIZE,
  });

  if (eligibleCities.length === 0) return;

  // Season and map config are per-world: a winter in Etheria I must not
  // starve cities living in another world's summer.
  const worldIds = [...new Set(eligibleCities.map((c: any) => c.worldId ?? 'default'))];
  const seasonByWorld = new Map<string, any>();
  const configByWorld = new Map<string, any>();
  for (const wId of worldIds) {
    const state = await getSeasonState(wId).catch(() => null);
    seasonByWorld.set(wId, state);
    if (state?.currentSeason === 'WINTER') {
      configByWorld.set(wId, await getWorldConfig(wId));
    }
  }

  // Preload alliance effects to avoid N+1 queries per city
  const userIds = new Set(eligibleCities.map((city: any) => city.userId).filter(Boolean));
  const allianceEffectsByUserId = new Map<string, any[]>();
  if (userIds.size > 0) {
    const memberships = await prisma.allianceMember.findMany({
      where: { userId: { in: [...userIds] } },
      select: { userId: true, allianceId: true },
    });
    const allianceIds = new Set(memberships.map((m: any) => m.allianceId).filter(Boolean));
    if (allianceIds.size > 0) {
      const nowMs = Date.now();
      const allEffects = await prisma.allianceEffect.findMany({
        where: {
          allianceId: { in: [...allianceIds] },
          expiresAt: { gt: new Date(nowMs) },
        },
      });
      const effectsByAllianceId = new Map<string, any[]>();
      for (const effect of allEffects) {
        const list = effectsByAllianceId.get(effect.allianceId) ?? [];
        list.push(effect);
        effectsByAllianceId.set(effect.allianceId, list);
      }
      for (const m of memberships) {
        if (m.allianceId) {
          allianceEffectsByUserId.set(m.userId, effectsByAllianceId.get(m.allianceId) ?? []);
        }
      }
    }
  }

  for (const city of eligibleCities) {
    const lastUpdate = new Date(city.lastResourceUpdate ?? city.createdAt);
    const hoursElapsed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    if (hoursElapsed < 0.001) continue;

    const cityWorldId = (city as any).worldId ?? 'default';
    const seasonState = seasonByWorld.get(cityWorldId) ?? null;
    const isWinter = seasonState?.currentSeason === 'WINTER';
    const worldCfg = configByWorld.get(cityWorldId) ?? null;

    const activeAllianceEffects = allianceEffectsByUserId.get(city.userId) ?? [];
    const effective = await calculateEffectiveProduction({
      goldPerHour: city.goldPerHour ?? 0,
      woodPerHour: city.woodPerHour ?? 0,
      stonePerHour: city.stonePerHour ?? 0,
      foodPerHour: city.foodPerHour ?? 0,
    }, {
      techBonuses: city.techBonuses ? city.techBonuses as Record<string, unknown> : undefined,
      allianceEffects: activeAllianceEffects,
      seasonState,
      cityPosX: city.posX ?? 0,
      cityPosY: city.posY ?? 0,
    });

    let newFood = Math.min(city.maxFood, Math.floor(city.food + effective.production.foodPerHour * hoursElapsed));

    // Winter pressure: troop food consumption
    const units: Record<UnitType, number> = { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0, PIKEMAN: 0, CROSSBOWMAN: 0, CATAPULT: 0 };
    for (const u of city.units ?? []) {
      units[u.type as UnitType] = (units[u.type as UnitType] ?? 0) + u.count;
    }

    if (isWinter) {
      const totalTroops = Object.values(units).reduce((s, c) => s + c, 0);
      if (totalTroops > 0) {
        // Apply zone winter intensity to troop food consumption
        const zoneId = resolveWorldZone(city.posX ?? 0, city.posY ?? 0, worldCfg!.map.width, worldCfg!.map.height).id;
        const zoneIntensity = ZONE_WINTER_INTENSITY[zoneId] ?? 1.0;
        
        const winterState = evaluateWinterPressure(
          city as any,
          effective.production.foodPerHour,
          units,
          (city.winterState ?? null) as any,
          now,
          { ...DEFAULT_WINTER_PRESSURE_CONFIG, zoneIntensity } as any
        );

        // foodBalance already accounts for netFood (production - consumption) over elapsed time.
        // We apply the final food amount directly from the winter state balance,
        // clamped to storage cap.
        newFood = Math.min(city.maxFood, Math.max(0, Math.floor(winterState.foodBalance)));

        // Persist winter state and evaluation timestamp
        await db.from(COLLECTIONS.CITIES).eq('id', city.id).merge({
          winterState: {
            cityId: city.id,
            foodBalance: winterState.foodBalance,
            starvationHours: winterState.starvationHours,
            isStarving: winterState.isStarving,
            combatPenalty: winterState.combatPenalty,
            desertionLosses: winterState.desertionLosses,
          },
          lastWinterEvaluatedAt: now.toISOString(),
        }).execute() as any;

        // Apply desertion losses if starving long enough
        if (winterState.isStarving && winterState.starvationHours >= DEFAULT_WINTER_PRESSURE_CONFIG.desertionAfterHours) {
          for (const [type, loss] of Object.entries(winterState.desertionLosses)) {
            if ((loss as number) > 0) {
              const unitRecord = city.units?.find((u: any) => u.type === type);
              if (unitRecord) {
                const newCount = Math.max(0, unitRecord.count - (loss as number));
                if (newCount > 0) {
                  await db.from(COLLECTIONS.UNITS).eq('id', unitRecord.id).merge({ count: newCount }).execute() as any;
                } else {
                  await db.from(COLLECTIONS.UNITS).eq('id', unitRecord.id).delete() as any;
                }
              }
            }
          }
        }
      }
    } else {
      // Not winter: reset winter state if it exists so next winter starts fresh
      if (city.winterState) {
        const cleared = resetWinterState(city.id, newFood);
        await db.from(COLLECTIONS.CITIES).eq('id', city.id).merge({
          winterState: cleared,
          lastWinterEvaluatedAt: null,
        }).execute() as any;
      }
    }

    const newGold = Math.min(city.maxGold, Math.floor(city.gold + effective.production.goldPerHour * hoursElapsed));
    const newWood = Math.min(city.maxWood, Math.floor(city.wood + effective.production.woodPerHour * hoursElapsed));
    const newStone = Math.min(city.maxStone, Math.floor(city.stone + effective.production.stonePerHour * hoursElapsed));

    await db.from(COLLECTIONS.CITIES).eq('id', city.id).merge({
        gold: newGold,
        wood: newWood,
        stone: newStone,
        food: newFood,
        lastResourceUpdate: now.toISOString(),
      }).execute() as any;
  }
}

// ─── Battle Resolution ───

async function processBattles() {
  const nowDate = new Date();
  const battles = {
    data: await prisma.battle.findMany({
      where: { status: 'MARCHING', arrivesAt: { lte: nowDate } },
      orderBy: { arrivesAt: 'asc' },
      take: BATTLE_DUE_BATCH_SIZE,
    }),
  };

  for (const battle of battles.data ?? []) {
    if (new Date(battle.arrivesAt) <= nowDate) {
      await resolveAndProcessBattle(battle);
    }
  }
}

async function resolveAndProcessBattle(battle: any) {
  const now = new Date();
  const nowIso = now.toISOString();
  const battleId = battle.id;

  console.log(`⚔️ Battle arrived: ${battleId}`);

  // Fetch defender's current units, resources, buildings, and tech bonuses
  const [defenderUnitsRes, defenderCityRes, attackerCityRes, defenderBuildingsRes] = await Promise.all([
    db.from(COLLECTIONS.UNITS).eq('cityId', battle.defenderCityId).get() as any,
    db.from(COLLECTIONS.CITIES).eq('id', battle.defenderCityId).getFirst() as any,
    db.from(COLLECTIONS.CITIES).eq('id', battle.attackerCityId).getFirst() as any,
    db.from(COLLECTIONS.BUILDINGS).eq('cityId', battle.defenderCityId).get() as any,
  ]);

  const defenderUnits: Record<string, number> = {};
  for (const u of defenderUnitsRes.data ?? []) {
    defenderUnits[u.type] = (defenderUnits[u.type] || 0) + u.count;
  }

  const attackerUnits: Record<string, number> = {};
  for (const u of battle.units) {
    attackerUnits[u.type] = (attackerUnits[u.type] || 0) + u.count;
  }

  // WALL is legacy; TOWER now provides both the defensive bonus and tower damage.
  const defenderBuildings = defenderBuildingsRes.data ?? [];
  const tower = defenderBuildings.find((b: any) => b.type === 'TOWER');
  const wallLevel = Math.max(
    0,
    ...defenderBuildings
      .filter((b: any) => b.type === 'WALL' || b.type === 'TOWER')
      .map((b: any) => b.level ?? 0)
  );
  const towerLevel = tower?.level ?? 0;
  const defenderTechBonuses = defenderCityRes.data?.techBonuses ?? undefined;
  const attackerTechBonuses = attackerCityRes.data?.techBonuses ?? undefined;
  const attackerEffects = (await getActiveAllianceEffects(attackerCityRes.data?.userId))
    .filter((effect: any) => effect.type === 'DISHONOR_ATTACK');
  const attackerAttackMultiplier = Math.max(0.1, 1 + attackerEffects.reduce((sum: number, effect: any) => sum + Number(effect.value ?? 0), 0));

  // Resolve battle
  const result = resolveBattle(
    attackerUnits as any,
    defenderUnits as any,
    wallLevel,
    towerLevel,
    attackerTechBonuses,
    defenderTechBonuses,
    attackerAttackMultiplier
  );

  // Calculate loot based on surviving attacker's carry
  const defenderResources = {
    gold: defenderCityRes.data?.gold ?? 0,
    wood: defenderCityRes.data?.wood ?? 0,
    stone: defenderCityRes.data?.stone ?? 0,
    food: defenderCityRes.data?.food ?? 0,
    gems: 0,
  };
  const baseLoot = calculateLoot(result.attackerSurvivors, defenderResources);
  const pvpEventEffect = getActiveEventEffect();
  const pvpLootMult = pvpEventEffect?.type === 'PVP_LOOT_MULTIPLIER' ? pvpEventEffect.value : 1;
  const loot = pvpLootMult !== 1
    ? { gold: Math.floor(baseLoot.gold * pvpLootMult), wood: Math.floor(baseLoot.wood * pvpLootMult), stone: Math.floor(baseLoot.stone * pvpLootMult), food: Math.floor(baseLoot.food * pvpLootMult), gems: baseLoot.gems }
    : baseLoot;

  // Calculate return travel time (same distance, same slowest unit speed)
  const speeds = Object.entries(result.attackerSurvivors)
    .filter(([, count]) => count > 0)
    .map(([type]) => getUnitStats(type as any, 1, attackerTechBonuses).speed);
  const minSpeed = speeds.length > 0 ? Math.min(...speeds) : 60;
  const worldConfig = await getWorldConfig(attackerCityRes.data?.worldId);
  const terrainSpeed = calculatePathSpeedMultiplier(
    attackerCityRes.data?.posX ?? 0,
    attackerCityRes.data?.posY ?? 0,
    defenderCityRes.data?.posX ?? 0,
    defenderCityRes.data?.posY ?? 0,
    worldConfig.map.width,
    worldConfig.map.height
  );
  const returnTime = calculateTravelTimeWithMultiplier(
    attackerCityRes.data?.posX ?? 0,
    attackerCityRes.data?.posY ?? 0,
    defenderCityRes.data?.posX ?? 0,
    defenderCityRes.data?.posY ?? 0,
    minSpeed,
    terrainSpeed
  );
  const returnsAt = new Date(now.getTime() + returnTime * 1000).toISOString();

  // Apply defender losses immediately
  for (const [type, lossCount] of Object.entries(result.defenderLosses)) {
    const existing = defenderUnitsRes.data?.find((u: any) => u.type === type);
    if (existing) {
      const newCount = Math.max(0, existing.count - lossCount);
      if (newCount > 0) {
        await mergeRecordBySelector(COLLECTIONS.UNITS, existing, { count: newCount });
      } else {
        await deleteRecordBySelector(COLLECTIONS.UNITS, existing);
      }
    }
  }

  // Deduct loot from defender
  if (result.victory) {
    await mergeRecordByLogicalId(COLLECTIONS.CITIES, battle.defenderCityId, {
      gold: Math.max(0, defenderResources.gold - loot.gold),
      wood: Math.max(0, defenderResources.wood - loot.wood),
      stone: Math.max(0, defenderResources.stone - loot.stone),
      food: Math.max(0, defenderResources.food - loot.food),
      lastResourceUpdate: nowIso,
    });
  }

  // Update battle status
  await mergeRecordByLogicalId(COLLECTIONS.BATTLES, battleId, {
    status: 'RETURNING',
    resolvedAt: nowIso,
    returnsAt,
    loot,
    result: {
      victory: result.victory,
      attackerLosses: result.attackerLosses,
      defenderLosses: result.defenderLosses,
      attackerSurvivors: result.attackerSurvivors,
    },
  });

  // Create battle reports for both sides
  const attackerName = attackerCityRes.data?.name ?? 'Unknown';
  const defenderName = defenderCityRes.data?.name ?? 'Unknown';

  // Attacker report
  await db.from(COLLECTIONS.BATTLE_REPORTS).insert({
    id: crypto.randomUUID(),
    battleId,
    cityId: battle.attackerCityId,
    attackerCityId: battle.attackerCityId,
    defenderCityId: battle.defenderCityId,
    attackerName,
    defenderName,
    status: result.victory ? 'VICTORY' : 'DEFEAT',
    attackerLosses: result.attackerLosses,
    defenderLosses: result.defenderLosses,
    loot: result.victory ? loot : undefined,
    read: false,
    createdAt: nowIso,
  });

  // Defender report
  await db.from(COLLECTIONS.BATTLE_REPORTS).insert({
    id: crypto.randomUUID(),
    battleId,
    cityId: battle.defenderCityId,
    attackerCityId: battle.attackerCityId,
    defenderCityId: battle.defenderCityId,
    attackerName,
    defenderName,
    status: result.victory ? 'DEFEAT' : 'VICTORY', // Opposite perspective
    attackerLosses: result.attackerLosses,
    defenderLosses: result.defenderLosses,
    loot: result.victory ? loot : undefined,
    read: false,
    createdAt: nowIso,
  });

  console.log(
    `⚔️ Battle resolved: ${result.victory ? 'ATTACKER WON' : 'DEFENDER WON'} | ` +
    `Losses - ATK: ${JSON.stringify(result.attackerLosses)}, DEF: ${JSON.stringify(result.defenderLosses)} | ` +
    `Loot: ${JSON.stringify(loot)} | Returns at: ${returnsAt}`
  );

  // Activity feed: major victory when loot > 500 of any resource
  if (result.victory && loot && (loot.gold > 500 || loot.wood > 500 || loot.stone > 500 || loot.food > 500)) {
    try {
      const { createActivityFeedEntry } = await import('../routes/activityFeed.js');
      await createActivityFeedEntry('BATTLE_MAJOR_VICTORY', attackerName, battle.attackerCityId, { defenderName, loot });
    } catch (_) { /* non-critical */ }
  }

  // Daily quests + achievements for PvP
  if (result.victory) {
    const attackerCityId = battle.attackerCityId;
    const attackerUserRes = await db.from(COLLECTIONS.CITIES).eq('id', attackerCityId).getFirst() as any;
    const attackerUserId = attackerUserRes.data?.userId;
    advanceDailyQuest(attackerCityId, 'ATTACK_PLAYER').catch(() => {});
    if (attackerUserId) {
      unlockAchievement(attackerUserId, 'first_victory').catch(() => {});
    }
  }

  // Mark incoming attack reports as read for the defender
  const incomingReports = await db.from(COLLECTIONS.GAME_REPORTS)
    .eq("type", "INCOMING_ATTACK")
    .eq("cityId", battle.defenderCityId)
    .get() as any;
  for (const report of incomingReports.data ?? []) {
    if (report.payload?.battleId === battleId) {
      await db.from(COLLECTIONS.GAME_REPORTS).eq("id", report.id)
        .merge({ readAt: new Date().toISOString() }).execute();
    }
  }
}

// ─── Battle Returns ───

async function processBattleReturns() {
  const nowDate = new Date();
  const battles = {
    data: await prisma.battle.findMany({
      where: { status: 'RETURNING', returnsAt: { lte: nowDate } },
      orderBy: { returnsAt: 'asc' },
      take: BATTLE_DUE_BATCH_SIZE,
    }),
  };

  for (const battle of battles.data ?? []) {
    if (battle.returnsAt && new Date(battle.returnsAt) <= nowDate) {
      await processBattleReturn(battle);
    }
  }
}

async function processBattleReturn(battle: any) {
  const now = new Date().toISOString();
  const battleId = battle.id;

  console.log(`🏠 Battle return: ${battleId}`);

  const result = battle.result;
  if (!result) {
    console.error(`Battle ${battleId} has no result data`);
    return;
  }

  // Add surviving troops back to attacker
  for (const [type, count] of Object.entries(result.attackerSurvivors)) {
    if ((count as number) <= 0) continue;

    const existing = await db.from(COLLECTIONS.UNITS)
      .eq('cityId', battle.attackerCityId)
      .eq('type', type)
      .get() as any;

    if (existing.data?.length > 0) {
      const current = existing.data[0];
      await mergeRecordBySelector(COLLECTIONS.UNITS, current, { count: current.count + (count as number) });
    } else {
      await db.from(COLLECTIONS.UNITS).insert({
        id: crypto.randomUUID(),
        cityId: battle.attackerCityId,
        type,
        count: count as number,
      });
    }
  }

  // Add loot to attacker's resources
  if (result.victory && battle.loot) {
    const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', battle.attackerCityId).getFirst() as any;
    const city = cityRes.data;
    if (city) {
      const newResources = addResources(
        { gold: city.gold, wood: city.wood, stone: city.stone, food: city.food, gems: city.gems },
        battle.loot
      );
      await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
        gold: Math.min(city.maxGold, newResources.gold),
        wood: Math.min(city.maxWood, newResources.wood),
        stone: Math.min(city.maxStone, newResources.stone),
        food: Math.min(city.maxFood, newResources.food),
        lastResourceUpdate: now,
      });
    }
  }

  // Mark battle as completed
  const finalStatus = result.victory ? 'VICTORY' : 'DEFEAT';
  await mergeRecordByLogicalId(COLLECTIONS.BATTLES, battleId, {
    status: finalStatus,
  });

  console.log(`✅ Battle completed: ${finalStatus} | Troops returned to ${battle.attackerCityId}`);
}

// ─── Barbarian Battle Resolution ───

async function processBarbarianBattles() {
  const nowDate = new Date();
  const battles = {
    data: await prisma.barbarianBattle.findMany({
      where: { status: 'MARCHING', arrivesAt: { lte: nowDate } },
      orderBy: { arrivesAt: 'asc' },
      take: BATTLE_DUE_BATCH_SIZE,
    }),
  };

  for (const battle of battles.data ?? []) {
    if (new Date(battle.arrivesAt) <= nowDate) {
      await resolveAndProcessBarbarianBattle(battle);
    }
  }
}

async function resolveAndProcessBarbarianBattle(battle: any) {
  const now = new Date();
  const nowIso = now.toISOString();
  const battleId = battle.id;

  console.log(`⚔️ Barbarian battle arrived: ${battleId}`);

  // Fetch attacker city for tech bonuses
  const attackerCityRes = await db.from(COLLECTIONS.CITIES).eq('id', battle.attackerCityId).getFirst() as any;
  const attackerCity = attackerCityRes.data;
  const attackerTechBonuses = attackerCity?.techBonuses ?? undefined;

  // Build attacker units record
  const attackerUnits: Record<string, number> = {};
  for (const u of battle.units) {
    attackerUnits[u.type] = (attackerUnits[u.type] || 0) + u.count;
  }

  // Fetch barbarian army
  const armyRes = await db.from(COLLECTIONS.BARBARIAN_ARMIES).eq('campId', battle.targetCampId).getFirst() as any;
  const army = armyRes.data;
  if (!army) {
    // Camp army missing, auto-victory
    await mergeRecordByLogicalId(COLLECTIONS.BARBARIAN_BATTLES, battleId, {
      status: 'RETURNING',
      resolvedAt: nowIso,
      returnsAt: nowIso,
      result: {
        victory: true,
        attackerLosses: {},
        defenderLosses: {},
        attackerSurvivors: attackerUnits,
        roundsFought: 0,
      },
      loot: { gold: 0, wood: 0, stone: 0, food: 0 },
    });
    return;
  }

  // Resolve battle (no wall/tower for barbarians, no defender tech)
  const result = resolveBattle(
    attackerUnits as any,
    army.units as any,
    0, // no wall
    0, // no tower
    attackerTechBonuses,
    undefined, // barbarians have no tech
    1 // no dishonor penalty for barbarian attacks
  );

  // Calculate return travel time
  const speeds = Object.entries(result.attackerSurvivors)
    .filter(([, count]) => (count as number) > 0)
    .map(([type]) => getUnitStats(type as any, 1, attackerTechBonuses).speed);
  const minSpeed = speeds.length > 0 ? Math.min(...speeds) : 60;
  const returnTime = Math.max(10, Math.floor(minSpeed * 2)); // simplified return time
  const returnsAt = new Date(now.getTime() + returnTime * 1000).toISOString();

  // Calculate rewards if victory
  let loot = { gold: 0, wood: 0, stone: 0, food: 0 };
  if (result.victory) {
    const campRes = await db.from(COLLECTIONS.BARBARIAN_CAMPS).eq('id', battle.targetCampId).getFirst() as any;
    const camp = campRes.data;
    if (camp) {
      const seasonState = await getSeasonState(camp.worldId ?? attackerCity?.worldId);
      const season = (seasonState?.currentSeason ?? 'SUMMER') as Season;
      const attackerPower = Object.values(result.attackerSurvivors).reduce((s: number, v: number) => s + v, 0) * 10;
      const defenderPower = army.power;
      const overkillRatio = defenderPower > 0 ? attackerPower / defenderPower : 1;
      loot = calculateActualReward(camp.archetype, camp.level, season, overkillRatio);
      const barbEventEffect = getActiveEventEffect();
      if (barbEventEffect?.type === 'BARBARIAN_LOOT_MULTIPLIER') {
        const m = barbEventEffect.value;
        loot = { gold: Math.floor(loot.gold * m), wood: Math.floor(loot.wood * m), stone: Math.floor(loot.stone * m), food: Math.floor(loot.food * m) };
      }
    }
  }

  // Update battle status
  await mergeRecordByLogicalId(COLLECTIONS.BARBARIAN_BATTLES, battleId, {
    status: 'RETURNING',
    resolvedAt: nowIso,
    returnsAt,
    result: {
      victory: result.victory,
      attackerLosses: result.attackerLosses,
      defenderLosses: result.defenderLosses,
      attackerSurvivors: result.attackerSurvivors,
      roundsFought: Math.ceil(result.victory
        ? (army.power * 2) / (Object.values(attackerUnits).reduce((s: number, v: number) => s + v, 0) * 10)
        : 10),
    },
    loot,
  });

  console.log(
    `⚔️ Barbarian battle resolved: ${result.victory ? 'VICTORY' : 'DEFEAT'} | ` +
    `Losses: ${JSON.stringify(result.attackerLosses)} | Loot: ${JSON.stringify(loot)}`
  );

  if (result.victory) {
    try {
      const { createActivityFeedEntry } = await import('../routes/activityFeed.js');
      const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', battle.attackerCityId).getFirst() as any;
      await createActivityFeedEntry('BARBARIAN_CAMP_CLEARED', cityRes.data?.name ?? 'Ciudad', battle.attackerCityId, { loot });

      // Daily quests + achievements for barbarian victory
      const attackerCityId = battle.attackerCityId;
      const attackerUserId = cityRes.data?.userId;
      advanceDailyQuest(attackerCityId, 'ATTACK_BARBARIAN').catch(() => {});
      if (attackerUserId) {
        unlockAchievement(attackerUserId, 'first_barbarian').catch(() => {});
        // Track barbarian kill count for Exterminador achievement
        const killsRes = await db.from(COLLECTIONS.PLAYER_ACHIEVEMENTS)
          .eq('userId', attackerUserId).eq('achievementKey', 'barbarian_kills_tracker').getFirst() as any;
        const kills = (killsRes.data?.count ?? 0) + 1;
        if (killsRes.data) {
          await db.from(COLLECTIONS.PLAYER_ACHIEVEMENTS).eq('id', killsRes.data.id).merge({ count: kills }).execute();
        } else {
          await db.from(COLLECTIONS.PLAYER_ACHIEVEMENTS).insert({ id: crypto.randomUUID(), userId: attackerUserId, achievementKey: 'barbarian_kills_tracker', count: 1 });
        }
        if (kills >= 100) unlockAchievement(attackerUserId, '100_barbarian_kills').catch(() => {});
      }
    } catch (_) { /* non-critical */ }
  }
}

// ─── Barbarian Battle Returns ───

async function processBarbarianReturns() {
  const nowDate = new Date();
  const battles = {
    data: await prisma.barbarianBattle.findMany({
      where: { status: 'RETURNING', returnsAt: { lte: nowDate } },
      orderBy: { returnsAt: 'asc' },
      take: BATTLE_DUE_BATCH_SIZE,
    }),
  };

  for (const battle of battles.data ?? []) {
    if (battle.returnsAt && new Date(battle.returnsAt) <= nowDate) {
      await processBarbarianReturn(battle);
    }
  }
}

async function processBarbarianReturn(battle: any) {
  const now = new Date().toISOString();
  const battleId = battle.id;

  console.log(`🏠 Barbarian battle return: ${battleId}`);

  const result = battle.result;
  if (!result) {
    console.error(`Barbarian battle ${battleId} has no result data`);
    return;
  }

  // Add surviving troops back to attacker
  for (const [type, count] of Object.entries(result.attackerSurvivors)) {
    if ((count as number) <= 0) continue;

    const existing = await db.from(COLLECTIONS.UNITS)
      .eq('cityId', battle.attackerCityId)
      .eq('type', type)
      .get() as any;

    if (existing.data?.length > 0) {
      const current = existing.data[0];
      await mergeRecordBySelector(COLLECTIONS.UNITS, current, { count: current.count + (count as number) });
    } else {
      await db.from(COLLECTIONS.UNITS).insert({
        id: crypto.randomUUID(),
        cityId: battle.attackerCityId,
        type,
        count: count as number,
      });
    }
  }

  // Add loot to attacker's resources if victory
  if (result.victory && battle.loot) {
    const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', battle.attackerCityId).getFirst() as any;
    const city = cityRes.data;
    if (city) {
      const newResources = addResources(
        { gold: city.gold, wood: city.wood, stone: city.stone, food: city.food, gems: city.gems ?? 0 },
        battle.loot
      );
      await mergeRecordBySelector(COLLECTIONS.CITIES, city, {
        gold: Math.min(city.maxGold, newResources.gold),
        wood: Math.min(city.maxWood, newResources.wood),
        stone: Math.min(city.maxStone, newResources.stone),
        food: Math.min(city.maxFood, newResources.food),
        lastResourceUpdate: now,
      });
    }

    // Mark camp as DESPAWNING (will be cleaned up by spawn worker)
    await mergeRecordByLogicalId(COLLECTIONS.BARBARIAN_CAMPS, battle.targetCampId, {
      status: 'DESPAWNING',
      expiresAt: now,
    });

    // Delete barbarian army
    const armyRes = await db.from(COLLECTIONS.BARBARIAN_ARMIES).eq('campId', battle.targetCampId).getFirst() as any;
    if (armyRes.data) {
      await db.from(COLLECTIONS.BARBARIAN_ARMIES).eq('id', armyRes.data.id).delete();
    }
  }

  // Mark battle as completed
  const finalStatus = result.victory ? 'VICTORY' : 'DEFEAT';
  await mergeRecordByLogicalId(COLLECTIONS.BARBARIAN_BATTLES, battleId, {
    status: finalStatus,
  });

  console.log(`✅ Barbarian battle completed: ${finalStatus} | Troops returned to ${battle.attackerCityId}`);
}

// ─── Research Queues ───

async function processResearchQueues() {
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const queues = {
    data: await prisma.researchQueue.findMany({
      where: { isComplete: false, completesAt: { lte: nowDate } },
      orderBy: [{ completesAt: 'asc' }, { startedAt: 'asc' }],
      take: QUEUE_DUE_BATCH_SIZE,
    }),
  };

  for (const queue of queues.data ?? []) {
    if (new Date(queue.completesAt) <= nowDate) {
      const cityId = queue.cityId;
      const techId = queue.techId;
      const targetLevel = queue.targetLevel;

      // Upsert city_tech record
      const existingRes = await db.from(COLLECTIONS.CITY_TECHS)
        .eq('cityId', cityId)
        .eq('techId', techId)
        .get() as any;

      if (existingRes.data?.length > 0) {
        await mergeRecordBySelector(COLLECTIONS.CITY_TECHS, existingRes.data[0], {
          level: targetLevel,
          unlockedAt: now,
        });
      } else {
        await db.from(COLLECTIONS.CITY_TECHS).insert({
          id: crypto.randomUUID(),
          cityId,
          techId,
          level: targetLevel,
          unlockedAt: now,
        });
      }

      // Mark queue complete
      await mergeRecordBySelector(COLLECTIONS.RESEARCH_QUEUES, queue, { isComplete: true });

      // Recalculate and store tech bonuses on city
      const cityTechsRes = await db.from(COLLECTIONS.CITY_TECHS)
        .eq('cityId', cityId)
        .get() as any;
      const cityTechs = (cityTechsRes.data ?? []).map((t: any) => ({ techId: t.techId, level: t.level }));
      const bonuses = calculateTechBonuses(cityTechs);

      await mergeRecordByLogicalId(COLLECTIONS.CITIES, cityId, { techBonuses: bonuses });

      console.log(`🔬 Research completed: ${techId} L${targetLevel} (city: ${cityId})`);
    }
  }
}

// ─── Barbarian Attack Resolution (Barbarian → Player) ───

async function resolveBarbarianAttackArrivals() {
  const nowDate = new Date();
  const attacks = {
    data: await prisma.barbarianAttack.findMany({
      where: { status: 'MARCHING', arrivesAt: { lte: nowDate } },
      orderBy: { arrivesAt: 'asc' },
      take: BATTLE_DUE_BATCH_SIZE,
    }),
  };

  for (const attack of attacks.data ?? []) {
    if (new Date(attack.arrivesAt) <= nowDate) {
      await resolveBarbarianAttack(attack);
    }
  }
}

async function resolveBarbarianAttack(attack: any) {
  const now = new Date();
  const nowIso = now.toISOString();
  const attackId = attack.id;

  console.log(`🏹 Barbarian attack arrived: ${attackId}`);

  // Fetch defender city
  const defenderCityRes = await db.from(COLLECTIONS.CITIES).eq('id', attack.targetCityId).getFirst() as any;
  const defenderCity = defenderCityRes.data;
  if (!defenderCity) {
    await db.from(COLLECTIONS.BARBARIAN_ATTACKS).eq('id', attackId).merge({ status: 'DEFEAT' }).execute() as any;
    return;
  }

  // Fetch defender units
  const defenderUnitsRes = await db.from(COLLECTIONS.UNITS).eq('cityId', attack.targetCityId).get() as any;
  const defenderUnits: Record<string, number> = {};
  for (const u of defenderUnitsRes.data ?? []) {
    defenderUnits[u.type] = (defenderUnits[u.type] || 0) + u.count;
  }

  // Fetch defender buildings for wall/tower
  const defenderBuildingsRes = await db.from(COLLECTIONS.BUILDINGS).eq('cityId', attack.targetCityId).get() as any;
  const defenderBuildings = defenderBuildingsRes.data ?? [];
  const tower = defenderBuildings.find((b: any) => b.type === 'TOWER');
  const wallLevel = Math.max(
    0,
    ...defenderBuildings
      .filter((b: any) => b.type === 'WALL' || b.type === 'TOWER')
      .map((b: any) => b.level ?? 0)
  );
  const towerLevel = tower?.level ?? 0;

  // Build attacker (barbarian) units
  const attackerUnits: Record<string, number> = {};
  for (const u of attack.units) {
    attackerUnits[u.type] = (attackerUnits[u.type] || 0) + u.count;
  }

  // Fetch camp for archetype info
  const campRes = await db.from(COLLECTIONS.BARBARIAN_CAMPS).eq('id', attack.campId).getFirst() as any;
  const camp = campRes.data;

  // Resolve battle (barbarian as attacker, city as defender)
  const defenderTechBonuses = defenderCity?.techBonuses ?? undefined;
  const result = resolveBattle(
    attackerUnits as any,
    defenderUnits as any,
    wallLevel,
    towerLevel,
    undefined, // barbarians have no tech
    defenderTechBonuses,
    1 // no multiplier
  );

  // Apply defender losses
  for (const [type, lossCount] of Object.entries(result.defenderLosses)) {
    const existing = defenderUnitsRes.data?.find((u: any) => u.type === type);
    if (existing) {
      const newCount = Math.max(0, existing.count - lossCount);
      if (newCount > 0) {
        await mergeRecordBySelector(COLLECTIONS.UNITS, existing, { count: newCount });
      } else {
        await deleteRecordBySelector(COLLECTIONS.UNITS, existing);
      }
    }
  }

  // Calculate loot if barbarians win
  let loot = { gold: 0, wood: 0, stone: 0, food: 0 };
  if (result.victory) {
    const config = LOCAL_BARBARIAN_ATTACK_CONFIG;

    const totalResources = {
      gold: defenderCity.gold ?? 0,
      wood: defenderCity.wood ?? 0,
      stone: defenderCity.stone ?? 0,
      food: defenderCity.food ?? 0,
    };

    // Loot up to maxLootPercentage but leave minimum survival resources
    for (const resource of ['gold', 'wood', 'stone', 'food'] as const) {
      const maxLootable = Math.max(0, totalResources[resource] - config.minSurvivalResources[resource]);
      loot[resource] = Math.floor(Math.min(maxLootable, totalResources[resource] * config.maxLootPercentage));
    }

    // Deduct loot from city
    await db.from(COLLECTIONS.CITIES).eq('id', attack.targetCityId).merge({
      gold: Math.max(config.minSurvivalResources.gold, totalResources.gold - loot.gold),
      wood: Math.max(config.minSurvivalResources.wood, totalResources.wood - loot.wood),
      stone: Math.max(config.minSurvivalResources.stone, totalResources.stone - loot.stone),
      food: Math.max(config.minSurvivalResources.food, totalResources.food - loot.food),
      lastResourceUpdate: nowIso,
    }).execute() as any;
  }

  // Calculate return travel time
  const speeds = Object.entries(result.attackerSurvivors)
    .filter(([, count]) => (count as number) > 0)
    .map(([type]) => getUnitStats(type as any, 1).speed);
  const minSpeed = speeds.length > 0 ? Math.min(...speeds) : 60;
  const returnTime = Math.max(10, Math.floor(minSpeed * 2));
  const returnsAt = new Date(now.getTime() + returnTime * 1000).toISOString();

  // Update attack status
  await db.from(COLLECTIONS.BARBARIAN_ATTACKS).eq('id', attackId).merge({
    status: 'RETURNING',
    resolvedAt: nowIso,
    returnsAt,
    result: {
      victory: result.victory,
      attackerLosses: result.attackerLosses,
      defenderLosses: result.defenderLosses,
      attackerSurvivors: result.attackerSurvivors,
      roundsFought: Math.ceil(result.victory ? 5 : 10),
    },
    loot,
  }).execute() as any;

  // Delete attack alert for this city
  await db.from(COLLECTIONS.BARBARIAN_ATTACK_ALERTS)
    .eq('cityId', attack.targetCityId)
    .eq('campId', attack.campId)
    .delete() as any;

  // Create battle reports
  const cityName = defenderCity.name ?? 'Unknown City';
  const campName = camp?.name ?? 'Barbarian Camp';

  // Defender (player) report
  await db.from(COLLECTIONS.BATTLE_REPORTS).insert({
    id: crypto.randomUUID(),
    battleId: attackId,
    cityId: attack.targetCityId,
    attackerCityId: null,
    defenderCityId: attack.targetCityId,
    attackerName: `${campName} (${attack.archetype})`,
    defenderName: cityName,
    status: result.victory ? 'DEFEAT' : 'VICTORY',
    attackerLosses: result.attackerLosses,
    defenderLosses: result.defenderLosses,
    loot: result.victory ? loot : undefined,
    read: false,
    createdAt: nowIso,
    barbarianCampId: attack.campId,
    isBarbarianAttack: true,
  });

  console.log(
    `🏹 Barbarian attack resolved: ${result.victory ? 'BARBARIANS WON' : 'CITY DEFENDED'} | ` +
    `Camp: ${campName} → City: ${cityName} | ` +
    `Loot: ${JSON.stringify(loot)}`
  );
}

// ─── Barbarian Attack Returns ───

async function processBarbarianAttackReturns() {
  const nowDate = new Date();
  const attacks = {
    data: await prisma.barbarianAttack.findMany({
      where: { status: 'RETURNING', returnsAt: { lte: nowDate } },
      orderBy: { returnsAt: 'asc' },
      take: BATTLE_DUE_BATCH_SIZE,
    }),
  };

  for (const attack of attacks.data ?? []) {
    if (attack.returnsAt && new Date(attack.returnsAt) <= nowDate) {
      await processBarbarianAttackReturn(attack);
    }
  }
}

async function processBarbarianAttackReturn(attack: any) {
  const now = new Date().toISOString();
  const attackId = attack.id;

  console.log(`🏠 Barbarian attack return: ${attackId}`);

  const result = attack.result;
  if (!result) {
    console.error(`Barbarian attack ${attackId} has no result data`);
    return;
  }

  // Return surviving barbarian troops to camp army
  if (result.attackerSurvivors && Object.values(result.attackerSurvivors).some((c) => (c as number) > 0)) {
    const armyRes = await db.from(COLLECTIONS.BARBARIAN_ARMIES).eq('campId', attack.campId).getFirst() as any;
    if (armyRes.data) {
      const currentUnits = armyRes.data.units ?? {};
      const updatedUnits = { ...currentUnits };

      for (const [type, count] of Object.entries(result.attackerSurvivors)) {
        if ((count as number) > 0) {
          updatedUnits[type] = (updatedUnits[type] ?? 0) + (count as number);
        }
      }

      await db.from(COLLECTIONS.BARBARIAN_ARMIES).eq('id', armyRes.data.id).merge({
        units: updatedUnits,
      }).execute() as any;
    }
  }

  // Mark attack as completed
  const finalStatus = result.victory ? 'VICTORY' : 'DEFEAT';
  await db.from(COLLECTIONS.BARBARIAN_ATTACKS).eq('id', attackId).merge({
    status: finalStatus,
  }).execute() as any;

  console.log(`✅ Barbarian attack completed: ${finalStatus} | Troops returned to camp ${attack.campId}`);
}
// ─── Trade Caravans ───

async function processTradeCaravans() {
  const now = new Date().toISOString();
  const [marchingRes, returningRes] = await Promise.all([
    db.from(COLLECTIONS.TRADE_CARAVANS).eq('status', 'MARCHING').get() as any,
    db.from(COLLECTIONS.TRADE_CARAVANS).eq('status', 'RETURNING').get() as any,
  ]);
  const caravans = [...(marchingRes.data ?? []), ...(returningRes.data ?? [])];

  for (const caravan of caravans) {
    if (caravan.status === 'MARCHING' && new Date(caravan.arrivesAt) <= new Date(now)) {
      await resolveTradeCaravanArrival(caravan);
      continue;
    }
    if (caravan.status === 'RETURNING' && caravan.returnsAt && new Date(caravan.returnsAt) <= new Date(now)) {
      await resolveTradeCaravanReturn(caravan);
    }
  }
}

async function resolveTradeCaravanArrival(caravan: any) {
  const now = new Date().toISOString();
  const caravanId = caravan.id;

  console.log(`🚚 Trade caravan arrived: ${caravanId}`);

  // Add resources to recipient
  const recipientRes = await db.from(COLLECTIONS.CITIES).eq('id', caravan.recipientCityId).getFirst() as any;
  const recipient = recipientRes.data;

  if (recipient) {
    const newResources = addResources(
      { gold: recipient.gold, wood: recipient.wood, stone: recipient.stone, food: recipient.food, gems: recipient.gems ?? 0 },
      caravan.resources
    );

    await mergeRecordBySelector(COLLECTIONS.CITIES, recipient, {
      gold: Math.min(recipient.maxGold, newResources.gold),
      wood: Math.min(recipient.maxWood, newResources.wood),
      stone: Math.min(recipient.maxStone, newResources.stone),
      food: Math.min(recipient.maxFood, newResources.food),
      lastResourceUpdate: now,
    });

    console.log(`✅ Resources delivered to city ${caravan.recipientCityId}: ${JSON.stringify(caravan.resources)}`);
  }

  const departure = new Date(caravan.startedAt).getTime();
  const arrival = new Date(caravan.arrivesAt).getTime();
  const outboundDurationMs = Math.max(0, arrival - departure);
  const returnsAt = new Date(new Date(caravan.arrivesAt).getTime() + outboundDurationMs).toISOString();

  // Mark caravan as returning after delivery
  await mergeRecordByLogicalId(COLLECTIONS.TRADE_CARAVANS, caravanId, {
    status: 'RETURNING',
    deliveredAt: now,
    resolvedAt: now,
    returnsAt,
  });
}

async function resolveTradeCaravanReturn(caravan: any) {
  const now = new Date().toISOString();
  await mergeRecordByLogicalId(COLLECTIONS.TRADE_CARAVANS, caravan.id, {
    status: 'COMPLETED',
    completedAt: now,
  });
}

// ─── Rally Launches ───

async function processRallyLaunches() {
  const now = new Date();
  const dueRallies = await prisma.rallyAttack.findMany({
    where: { status: 'OPEN', launchAt: { lte: now } },
    include: { participants: true },
    take: 10,
  });

  for (const rally of dueRallies) {
    try {
      await launchRally(rally);
    } catch (err) {
      console.error(`Rally launch failed ${rally.id}:`, err);
    }
  }
}

async function launchRally(rally: any) {
  if (!rally.participants || rally.participants.length === 0) {
    await prisma.rallyAttack.update({ where: { id: rally.id }, data: { status: 'CANCELLED' } });
    return;
  }

  // Aggregate units from all participants
  const aggregatedUnits: Record<string, number> = {};
  for (const p of rally.participants) {
    const units = Array.isArray(p.units) ? p.units : [];
    for (const u of units as { type: string; count: number }[]) {
      aggregatedUnits[u.type] = (aggregatedUnits[u.type] ?? 0) + u.count;
    }
  }

  const totalUnits = Object.values(aggregatedUnits).reduce((s, c) => s + c, 0);
  if (totalUnits === 0) {
    await prisma.rallyAttack.update({ where: { id: rally.id }, data: { status: 'CANCELLED' } });
    return;
  }

  const attackerCityRes = await db.from(COLLECTIONS.CITIES).eq('id', rally.createdByCityId).getFirst() as any;
  const attackerCity = attackerCityRes.data;
  if (!attackerCity) {
    await prisma.rallyAttack.update({ where: { id: rally.id }, data: { status: 'CANCELLED' } });
    return;
  }

  const speeds = Object.entries(aggregatedUnits)
    .filter(([, c]) => c > 0)
    .map(([type]) => getUnitStats(type as any, 1, attackerCity.techBonuses).speed);
  const minSpeed = speeds.length > 0 ? Math.min(...speeds) : 60;

  if (rally.targetCityId) {
    // PvP rally attack — create a Battle record and let processBattles pick it up
    const defenderCityRes = await db.from(COLLECTIONS.CITIES).eq('id', rally.targetCityId).getFirst() as any;
    const defenderCity = defenderCityRes.data;
    if (!defenderCity) {
      await prisma.rallyAttack.update({ where: { id: rally.id }, data: { status: 'CANCELLED' } });
      return;
    }
    const worldConfig = await getWorldConfig(attackerCity.worldId);
    const terrainSpeed = calculatePathSpeedMultiplier(attackerCity.posX, attackerCity.posY, defenderCity.posX, defenderCity.posY, worldConfig.map.width, worldConfig.map.height);
    const travelSeconds = calculateTravelTimeWithMultiplier(attackerCity.posX, attackerCity.posY, defenderCity.posX, defenderCity.posY, minSpeed, terrainSpeed);
    const arrivesAt = new Date(Date.now() + travelSeconds * 1000).toISOString();

    const battleId = crypto.randomUUID();
    await mergeRecordByLogicalId(COLLECTIONS.BATTLES, battleId, {
      id: battleId,
      attackerCityId: rally.createdByCityId,
      defenderCityId: rally.targetCityId,
      units: Object.entries(aggregatedUnits).filter(([, c]) => c > 0).map(([type, count]) => ({ type, count })),
      status: 'MARCHING',
      type: 'ATTACK',
      startedAt: new Date().toISOString(),
      arrivesAt,
      rallyId: rally.id,
    });
    console.log(`🚩 Rally ${rally.id} launched → PvP battle ${battleId} arrives at ${arrivesAt}`);
  } else if (rally.targetCampId) {
    // Rally vs barbarian camp — create a BarbarianAttack record
    const campRes = await db.from(COLLECTIONS.BARBARIAN_CAMPS).eq('id', rally.targetCampId).getFirst() as any;
    const camp = campRes.data;
    if (!camp) {
      await prisma.rallyAttack.update({ where: { id: rally.id }, data: { status: 'CANCELLED' } });
      return;
    }
    const travelSeconds = calculateTravelTime(attackerCity.posX, attackerCity.posY, camp.posX, camp.posY, minSpeed);
    const arrivesAt = new Date(Date.now() + travelSeconds * 1000).toISOString();

    const attackId = crypto.randomUUID();
    await mergeRecordByLogicalId(COLLECTIONS.BARBARIAN_ATTACKS, attackId, {
      id: attackId,
      attackerCityId: rally.createdByCityId,
      campId: rally.targetCampId,
      units: Object.entries(aggregatedUnits).filter(([, c]) => c > 0).map(([type, count]) => ({ type, count })),
      status: 'MARCHING',
      startedAt: new Date().toISOString(),
      arrivesAt,
      rallyId: rally.id,
    });
    console.log(`🚩 Rally ${rally.id} launched → barb attack ${attackId} arrives at ${arrivesAt}`);
  }

  await prisma.rallyAttack.update({ where: { id: rally.id }, data: { status: 'LAUNCHED' } });

  // Notify all participants
  for (const p of rally.participants) {
    await db.from(COLLECTIONS.NOTIFICATIONS).insert({
      id: crypto.randomUUID(),
      userId: p.userId,
      type: 'RALLY_LAUNCHED',
      message: `El rally ha sido lanzado. Las tropas están en marcha.`,
      payload: { rallyId: rally.id },
      createdAt: new Date().toISOString(),
      read: false,
    });
  }
}
