import type { UnitType, City, CityWinterState } from '@etheria/shared';

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
    PIKEMAN: 0.45,
    CROSSBOWMAN: 0.35,
    CATAPULT: 0.4,
  },
  starvationGraceHours: 4,
  starvationCombatPenalty: 0.8,
  desertionAfterHours: 12,
  desertionRatePerHour: 0.05,
  minimumFoodReserve: 100,
};

// ─── Zone intensity multipliers for winter pressure ───
// North gets hit harder, coast gets hit less.

export const ZONE_WINTER_INTENSITY: Record<string, number> = {
  north_frozen: 1.35,
  center_temperate: 1.0,
  south_warm: 0.7,
  coast: 0.75,
  mountain: 1.2,
  forest: 0.9,
  plains: 1.0,
};

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

/**
 * Evaluate winter pressure for a city using real elapsed time.
 * Uses effective food production (already includes season/zone modifiers)
 * and scales all effects by hoursElapsed derived from lastWinterEvaluatedAt.
 */
// Acepta tanto la fila de Prisma (food plano) como el tipo compartido City
// (resources.food anidado): producción pasa lo primero, los tests lo segundo.
type WinterCity = City & { food?: number };

export function evaluateWinterPressure(
  city: WinterCity,
  effectiveFoodProduction: number,
  units: Record<UnitType, number>,
  currentWinterState: CityWinterState | null,
  now: Date,
  config: WinterPressureConfig = DEFAULT_WINTER_PRESSURE_CONFIG
): CityWinterState {
  const hourlyConsumption = calculateHourlyFoodConsumption(units, config);
  const netFoodPerHour = effectiveFoodProduction - hourlyConsumption;

  const lastEvaluated = currentWinterState
    ? new Date(city.lastWinterEvaluatedAt ?? city.createdAt)
    : new Date(city.createdAt);

  const hoursElapsed = Math.max(0, (now.getTime() - lastEvaluated.getTime()) / (1000 * 60 * 60));

  const state: CityWinterState = currentWinterState ?? {
    cityId: city.id,
    foodBalance: city.food ?? city.resources?.food ?? 0,
    starvationHours: 0,
    isStarving: false,
    combatPenalty: 1.0,
    desertionLosses: { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0, PIKEMAN: 0, CROSSBOWMAN: 0, CATAPULT: 0 },
  };

  // Update food balance by net food over elapsed time
  state.foodBalance = Math.max(0, state.foodBalance + netFoodPerHour * hoursElapsed);

  // Check if below minimum reserve
  if (state.foodBalance < config.minimumFoodReserve) {
    state.isStarving = true;
    state.starvationHours += hoursElapsed;

    // Apply combat penalty after grace period
    if (state.starvationHours >= config.starvationGraceHours) {
      state.combatPenalty = config.starvationCombatPenalty;
    }

    // Apply desertion after extended starvation, scaled by elapsed time
    if (state.starvationHours >= config.desertionAfterHours) {
      const desertionLosses: Record<UnitType, number> = {
        WARRIOR: state.desertionLosses.WARRIOR ?? 0,
        ARCHER: state.desertionLosses.ARCHER ?? 0,
        CAVALRY: state.desertionLosses.CAVALRY ?? 0,
        SIEGE: state.desertionLosses.SIEGE ?? 0,
        SPY: state.desertionLosses.SPY ?? 0,
        PIKEMAN: state.desertionLosses.PIKEMAN ?? 0,
        CROSSBOWMAN: state.desertionLosses.CROSSBOWMAN ?? 0,
        CATAPULT: state.desertionLosses.CATAPULT ?? 0,
      };
      for (const [unitType, count] of Object.entries(units)) {
        const loss = Math.floor(count * config.desertionRatePerHour * hoursElapsed);
        desertionLosses[unitType as UnitType] = desertionLosses[unitType as UnitType] + loss;
      }
      state.desertionLosses = desertionLosses;
    }
  } else {
    // Recovering: reduce starvation hours gradually (2x speed when fed)
    state.isStarving = false;
    if (state.starvationHours > 0) {
      state.starvationHours = Math.max(0, state.starvationHours - hoursElapsed * 2);
    }
    if (state.starvationHours === 0) {
      state.combatPenalty = 1.0;
      state.desertionLosses = { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 };
    }
  }

  return state;
}

/**
 * Reset winter state when season is not winter.
 * Clears penalties and resets lastWinterEvaluatedAt so next winter starts fresh.
 */
export function resetWinterState(cityId: string, currentFood: number): CityWinterState {
  return {
    cityId,
    foodBalance: currentFood,
    starvationHours: 0,
    isStarving: false,
    combatPenalty: 1.0,
    desertionLosses: { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0, PIKEMAN: 0, CROSSBOWMAN: 0, CATAPULT: 0 },
  };
}

export function getWinterPressureSummary(
  city: WinterCity,
  effectiveFoodProduction: number,
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
  const netFoodPerHour = effectiveFoodProduction - hourlyConsumption;

  const hoursUntilStarvation = netFoodPerHour < 0
    ? Math.floor(((city.food ?? city.resources?.food ?? 0) - config.minimumFoodReserve) / Math.abs(netFoodPerHour))
    : Infinity;

  return {
    hourlyConsumption,
    effectiveProduction: effectiveFoodProduction,
    netFoodPerHour,
    hoursUntilStarvation: Math.max(0, hoursUntilStarvation),
    zoneIntensity: 1.0, // Zone effect is already baked into effectiveFoodProduction
  };
}
