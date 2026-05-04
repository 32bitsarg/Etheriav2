import type { Season, WorldSeasonState, WorldZone } from '@etheria/shared';
import { LOCAL_WORLD_ZONE_CONFIGS, resolveWorldZone } from './worldZoneConfigData.js';
import { getSeasonState } from './seasons.js';
import { getWorldConfig } from './worldConfig.js';
import { LOCAL_SEASON_CONFIG } from './seasonConfigData.js';

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

  // Step 2: Apply tech bonuses (keep precision, floor at the end)
  const resourceBonus = (techBonuses as any)?.resourceProdBonus ?? {};
  const allianceProductionBonus = allianceEffects
    .filter((effect: any) => effect.type === 'PEACE_PRODUCTION')
    .reduce((sum: number, effect: any) => sum + Number(effect.value ?? 0), 0);

  const bonusFor = (resource: string) =>
    (resourceBonus.all ?? 0) + (resourceBonus[resource] ?? 0) + allianceProductionBonus;

  let rawProduction = {
    goldPerHour: production.goldPerHour * (1 + bonusFor('gold')),
    woodPerHour: production.woodPerHour * (1 + bonusFor('wood')),
    stonePerHour: production.stonePerHour * (1 + bonusFor('stone')),
    foodPerHour: production.foodPerHour * (1 + bonusFor('food')),
  };

  // Step 3: Apply season modifier
  const seasonModifier: Record<string, number> = { gold: 1, wood: 1, stone: 1, food: 1 };
  if (seasonState && seasonState.intensity > 0) {
    const season = seasonState.currentSeason as Season;
    const intensity = seasonState.intensity;

    // Season effects on resources loaded from config
    const effects = LOCAL_SEASON_CONFIG.resourceModifiers[season] ?? {};
    for (const [resource, baseMod] of Object.entries(effects)) {
      seasonModifier[resource] = 1 + baseMod * intensity;
    }
  }

  rawProduction = {
    goldPerHour: rawProduction.goldPerHour * seasonModifier.gold,
    woodPerHour: rawProduction.woodPerHour * seasonModifier.wood,
    stonePerHour: rawProduction.stonePerHour * seasonModifier.stone,
    foodPerHour: rawProduction.foodPerHour * seasonModifier.food,
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

  rawProduction = {
    goldPerHour: rawProduction.goldPerHour * zoneModifier.gold,
    woodPerHour: rawProduction.woodPerHour * zoneModifier.wood,
    stonePerHour: rawProduction.stonePerHour * zoneModifier.stone,
    foodPerHour: rawProduction.foodPerHour * zoneModifier.food,
  };

  // Step 5: Floor once at the end and ensure non-negative
  production = {
    goldPerHour: Math.max(0, Math.floor(rawProduction.goldPerHour)),
    woodPerHour: Math.max(0, Math.floor(rawProduction.woodPerHour)),
    stonePerHour: Math.max(0, Math.floor(rawProduction.stonePerHour)),
    foodPerHour: Math.max(0, Math.floor(rawProduction.foodPerHour)),
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
