import type { UnitType, Season, City } from '@etheria/shared';

// ─── Winter Pressure Configuration ───
// Controls how winter creates resource pressure on cities.
// All values are configurable — no hardcoded gameplay logic.

export interface WinterPressureConfig {
  /** Base food consumption per troop type per hour during winter */
  troopFoodConsumptionPerHour: Record<UnitType, number>;
  /** Grace period (hours) before starvation penalties kick in */
  starvationGraceHours: number;
  /** Attack/defense penalty when starving (applied as multiplier, e.g., 0.8 = -20%) */
  starvationCombatPenalty: number;
  /** Hours of continuous starvation before desertion begins */
  desertionAfterHours: number;
  /** Fraction of troops that desert per hour once desertion starts */
  desertionRatePerHour: number;
  /** Food production penalty during winter (0.3 = -30% food production) */
  foodProductionPenalty: number;
  /** Minimum food reserve that must be maintained (per city) */
  minimumFoodReserve: number;
}

export const DEFAULT_WINTER_PRESSURE_CONFIG: WinterPressureConfig = {
  troopFoodConsumptionPerHour: {
    WARRIOR: 0.5,
    ARCHER: 0.4,
    CAVALRY: 1.0,
    SIEGE: 0.3,
    SPY: 0.2,
  },
  starvationGraceHours: 4,
  starvationCombatPenalty: 0.8,
  desertionAfterHours: 12,
  desertionRatePerHour: 0.05,
  foodProductionPenalty: 0.3,
  minimumFoodReserve: 100,
};

// ─── Zone intensity multipliers for winter pressure ───
// North gets hit harder, coast gets hit less.

export const ZONE_WINTER_INTENSITY: Record<string, number> = {
  NORTH: 1.35,
  CENTER: 1.0,
  SOUTH: 0.7,
  COAST: 0.75,
  MOUNTAIN: 1.2,
  FOREST: 0.9,
  PLAINS: 1.0,
};

export interface CityWinterState {
  cityId: string;
  /** Current food deficit (negative = deficit, positive = surplus) */
  foodBalance: number;
  /** Hours the city has been in starvation */
  starvationHours: number;
  /** Whether the city is currently starving */
  isStarving: boolean;
  /** Combat penalty multiplier (1.0 = no penalty) */
  combatPenalty: number;
  /** Estimated troop losses from desertion this winter cycle */
  desertionLosses: Record<UnitType, number>;
}

export function calculateHourlyFoodConsumption(
  units: Record<UnitType, number>,
  config: WinterPressureConfig = DEFAULT_WINTER_PRESSURE_CONFIG
): number {
  let total = 0;
  for (const [unitType, count] of Object.entries(units)) {
    const rate = config.troopFoodConsumptionPerHour[unitType as UnitType] ?? 0;
    total += count * rate;
  }
  return total;
}

export function calculateWinterFoodProduction(
  baseFoodProduction: number,
  zoneId: string,
  config: WinterPressureConfig = DEFAULT_WINTER_PRESSURE_CONFIG
): number {
  const zoneIntensity = ZONE_WINTER_INTENSITY[zoneId] ?? 1.0;
  // Penalty scales with zone intensity: north gets full penalty * 1.35
  const effectivePenalty = config.foodProductionPenalty * zoneIntensity;
  return Math.max(0, baseFoodProduction * (1 - effectivePenalty));
}

export function evaluateWinterPressure(
  city: City,
  zoneId: string,
  hourlyFoodProduction: number,
  units: Record<UnitType, number>,
  currentWinterState: CityWinterState | null,
  config: WinterPressureConfig = DEFAULT_WINTER_PRESSURE_CONFIG
): CityWinterState {
  const hourlyConsumption = calculateHourlyFoodConsumption(units, config);
  const effectiveProduction = calculateWinterFoodProduction(hourlyFoodProduction, zoneId, config);
  const netFood = effectiveProduction - hourlyConsumption;

  const state = currentWinterState ?? {
    cityId: city.id,
    foodBalance: city.resources.food,
    starvationHours: 0,
    isStarving: false,
    combatPenalty: 1.0,
    desertionLosses: { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 },
  };

  // Update food balance
  state.foodBalance = Math.max(0, state.foodBalance + netFood);

  // Check if below minimum reserve
  if (state.foodBalance < config.minimumFoodReserve) {
    state.isStarving = true;
    state.starvationHours += 1;

    // Apply combat penalty after grace period
    if (state.starvationHours >= config.starvationGraceHours) {
      state.combatPenalty = config.starvationCombatPenalty;
    }

    // Apply desertion after extended starvation
    if (state.starvationHours >= config.desertionAfterHours) {
      const desertionLosses: Record<UnitType, number> = { ...state.desertionLosses };
      for (const [unitType, count] of Object.entries(units)) {
        const loss = Math.floor(count * config.desertionRatePerHour);
        desertionLosses[unitType as UnitType] = (desertionLosses[unitType as UnitType] ?? 0) + loss;
      }
      state.desertionLosses = desertionLosses;
    }
  } else {
    // Recovering: reduce starvation hours gradually
    state.isStarving = false;
    if (state.starvationHours > 0) {
      state.starvationHours = Math.max(0, state.starvationHours - 2);
    }
    if (state.starvationHours === 0) {
      state.combatPenalty = 1.0;
      state.desertionLosses = { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 };
    }
  }

  return state;
}

export function getWinterPressureSummary(
  city: City,
  zoneId: string,
  hourlyFoodProduction: number,
  units: Record<UnitType, number>,
  config: WinterPressureConfig = DEFAULT_WINTER_PRESSURE_CONFIG
): {
  hourlyConsumption: number;
  effectiveProduction: number;
  netFoodPerHour: number;
  hoursUntilStarvation: number;
  zoneIntensity: number;
} {
  const hourlyConsumption = calculateHourlyFoodConsumption(units, config);
  const effectiveProduction = calculateWinterFoodProduction(hourlyFoodProduction, zoneId, config);
  const netFoodPerHour = effectiveProduction - hourlyConsumption;

  const hoursUntilStarvation = netFoodPerHour < 0
    ? Math.floor((city.resources.food - config.minimumFoodReserve) / Math.abs(netFoodPerHour))
    : Infinity;

  return {
    hourlyConsumption,
    effectiveProduction,
    netFoodPerHour,
    hoursUntilStarvation: Math.max(0, hoursUntilStarvation),
    zoneIntensity: ZONE_WINTER_INTENSITY[zoneId] ?? 1.0,
  };
}
