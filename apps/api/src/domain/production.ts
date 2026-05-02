import type { Season, WorldSeasonState, WorldZone } from '@etheria/shared';
import { LOCAL_WORLD_ZONE_CONFIGS, resolveWorldZone } from './worldZoneConfigData.js';
import { getSeasonState } from './seasons.js';
import { getWorldConfig } from './worldConfig.js';

export interface BaseProduction {
  goldPerHour: number;
  woodPerHour: number;
  stonePerHour: number;
  foodPerHour: number;
}

export interface EffectiveProductionResult {
  production: BaseProduction;
  seasonModifier: Record<string, number>;
  zoneModifier: Record<string, number>;
  totalMultiplier: Record<string, number>;
}

export async function calculateEffectiveProduction(
  baseProduction: BaseProduction,
  options: {
    techBonuses?: Record<string, unknown>;
    allianceEffects?: any[];
    seasonState?: WorldSeasonState | null;
    cityPosX?: number;
    cityPosY?: number;
  } = {}
): Promise<EffectiveProductionResult> {
  const {
    techBonuses,
    allianceEffects = [],
    seasonState,
    cityPosX = 0,
    cityPosY = 0,
  } = options;

  // Step 1: Start with base production
  let production = { ...baseProduction };

  // Step 2: Apply tech bonuses
  const resourceBonus = (techBonuses as any)?.resourceProdBonus ?? {};
  const allianceProductionBonus = allianceEffects
    .filter((effect: any) => effect.type === 'PEACE_PRODUCTION')
    .reduce((sum: number, effect: any) => sum + Number(effect.value ?? 0), 0);

  const bonusFor = (resource: string) =>
    (resourceBonus.all ?? 0) + (resourceBonus[resource] ?? 0) + allianceProductionBonus;

  production = {
    goldPerHour: Math.floor(production.goldPerHour * (1 + bonusFor('gold'))),
    woodPerHour: Math.floor(production.woodPerHour * (1 + bonusFor('wood'))),
    stonePerHour: Math.floor(production.stonePerHour * (1 + bonusFor('stone'))),
    foodPerHour: Math.floor(production.foodPerHour * (1 + bonusFor('food'))),
  };

  // Step 3: Apply season modifier
  const seasonModifier: Record<string, number> = { gold: 1, wood: 1, stone: 1, food: 1 };
  if (seasonState && seasonState.intensity > 0) {
    const season = seasonState.currentSeason as Season;
    const intensity = seasonState.intensity;

    // Season effects on resources (configurable, not hardcoded in workers)
    const seasonEffects: Record<Season, Record<string, number>> = {
      SPRING: { food: 0.10 },
      SUMMER: { gold: 0.05, wood: 0.05, stone: 0.05, food: 0.05 },
      AUTUMN: { food: 0.15 },
      WINTER: { food: -0.15, wood: -0.05 },
    };

    const effects = seasonEffects[season] ?? {};
    for (const [resource, baseMod] of Object.entries(effects)) {
      seasonModifier[resource] = 1 + baseMod * intensity;
    }
  }

  production = {
    goldPerHour: Math.floor(production.goldPerHour * seasonModifier.gold),
    woodPerHour: Math.floor(production.woodPerHour * seasonModifier.wood),
    stonePerHour: Math.floor(production.stonePerHour * seasonModifier.stone),
    foodPerHour: Math.floor(production.foodPerHour * seasonModifier.food),
  };

  // Step 4: Apply geographic zone modifier
  const zoneModifier: Record<string, number> = { gold: 1, wood: 1, stone: 1, food: 1 };
  if (cityPosX > 0 || cityPosY > 0) {
    const worldConfig = await getWorldConfig();
    const zone = resolveWorldZone(cityPosX, cityPosY, worldConfig.map.width, worldConfig.map.height);
    const resourceMods = zone.resourceModifiers ?? {};

    for (const [resource, mod] of Object.entries(resourceMods)) {
      zoneModifier[resource] = 1 + mod;
    }
  }

  production = {
    goldPerHour: Math.floor(production.goldPerHour * zoneModifier.gold),
    woodPerHour: Math.floor(production.woodPerHour * zoneModifier.wood),
    stonePerHour: Math.floor(production.stonePerHour * zoneModifier.stone),
    foodPerHour: Math.floor(production.foodPerHour * zoneModifier.food),
  };

  // Step 5: Ensure non-negative production
  production = {
    goldPerHour: Math.max(0, production.goldPerHour),
    woodPerHour: Math.max(0, production.woodPerHour),
    stonePerHour: Math.max(0, production.stonePerHour),
    foodPerHour: Math.max(0, production.foodPerHour),
  };

  // Calculate total multiplier for transparency
  const totalMultiplier: Record<string, number> = {
    gold: seasonModifier.gold * zoneModifier.gold,
    wood: seasonModifier.wood * zoneModifier.wood,
    stone: seasonModifier.stone * zoneModifier.stone,
    food: seasonModifier.food * zoneModifier.food,
  };

  return { production, seasonModifier, zoneModifier, totalMultiplier };
}

export async function getCityEffectiveProduction(
  city: {
    posX: number;
    posY: number;
    techBonuses?: any;
    userId?: string;
  },
  baseProduction: BaseProduction
): Promise<EffectiveProductionResult> {
  const seasonState = await getSeasonState();

  let allianceEffects: any[] = [];
  if (city.userId) {
    // Would need to import from alliances.ts, but to avoid circular deps
    // we fetch directly here
    const { db, COLLECTIONS } = await import('../infrastructure/matecito.js');
    const membershipRes = await db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq('userId', city.userId).getFirst() as any;
    if (membershipRes.data?.allianceId) {
      const effectsRes = await db.from(COLLECTIONS.ALLIANCE_EFFECTS).eq('allianceId', membershipRes.data.allianceId).get() as any;
      const now = Date.now();
      allianceEffects = (effectsRes.data ?? []).filter((effect: any) => !effect.expiresAt || new Date(effect.expiresAt).getTime() > now);
    }
  }

  return calculateEffectiveProduction(baseProduction, {
    techBonuses: city.techBonuses,
    allianceEffects,
    seasonState,
    cityPosX: city.posX,
    cityPosY: city.posY,
  });
}
