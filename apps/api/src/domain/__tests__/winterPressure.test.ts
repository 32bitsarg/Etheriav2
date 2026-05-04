import { describe, it, expect } from 'vitest';
import type { City, CityWinterState, UnitType } from '@etheria/shared';
import {
  evaluateWinterPressure,
  resetWinterState,
  getWinterPressureSummary,
  calculateHourlyFoodConsumption,
  DEFAULT_WINTER_PRESSURE_CONFIG,
} from '../winterPressure.js';

function makeCity(overrides: Partial<City> = {}): City {
  return {
    id: 'city-1',
    name: 'Test City',
    userId: 'user-1',
    resources: { gold: 1000, wood: 1000, stone: 500, food: 500, gems: 0 },
    resourcesPerHour: { gold: 100, wood: 100, stone: 50, food: 50, gems: 0 },
    maxStorage: { gold: 2000, wood: 2000, stone: 1000, food: 1000, gems: 0 },
    buildings: [],
    units: [],
    posX: 0,
    posY: 0,
    cityTechs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as City;
}

describe('calculateHourlyFoodConsumption', () => {
  it('returns 0 for empty army', () => {
    const units: Record<UnitType, number> = { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 };
    expect(calculateHourlyFoodConsumption(units)).toBe(0);
  });

  it('calculates correctly for mixed army', () => {
    const units: Record<UnitType, number> = { WARRIOR: 10, ARCHER: 5, CAVALRY: 2, SIEGE: 0, SPY: 0 };
    // 10*0.5 + 5*0.4 + 2*1.0 = 5 + 2 + 2 = 9
    expect(calculateHourlyFoodConsumption(units)).toBe(9);
  });
});

describe('evaluateWinterPressure', () => {
  it('no change when hoursElapsed is 0', () => {
    const city = makeCity();
    const now = new Date(city.createdAt);
    const units: Record<UnitType, number> = { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 };

    const state = evaluateWinterPressure(city, 100, units, null, now);
    expect(state.foodBalance).toBe(500);
    expect(state.starvationHours).toBe(0);
    expect(state.isStarving).toBe(false);
  });

  it('increases food balance when production exceeds consumption', () => {
    const city = makeCity({ resources: { ...makeCity().resources, food: 500 } });
    const units: Record<UnitType, number> = { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 };
    const now = new Date(new Date(city.createdAt).getTime() + 60 * 60 * 1000); // +1h

    const state = evaluateWinterPressure(city, 100, units, null, now);
    expect(state.foodBalance).toBe(600); // 500 + 100*1
    expect(state.starvationHours).toBe(0);
  });

  it('decreases food balance when consumption exceeds production', () => {
    const city = makeCity({ resources: { ...makeCity().resources, food: 500 } });
    const units: Record<UnitType, number> = { WARRIOR: 200, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 };
    // consumption = 200 * 0.5 = 100/h, production = 50/h → net = -50/h
    const now = new Date(new Date(city.createdAt).getTime() + 60 * 60 * 1000); // +1h

    const state = evaluateWinterPressure(city, 50, units, null, now);
    expect(state.foodBalance).toBe(450); // 500 + (-50)*1
  });

  it('scales starvationHours by elapsed time', () => {
    const city = makeCity({ resources: { ...makeCity().resources, food: 50 } }); // below minimumReserve=100
    const units: Record<UnitType, number> = { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 };
    const now = new Date(new Date(city.createdAt).getTime() + 30 * 60 * 1000); // +0.5h

    const state = evaluateWinterPressure(city, 0, units, null, now);
    expect(state.isStarving).toBe(true);
    expect(state.starvationHours).toBe(0.5);
  });

  it('applies combat penalty after grace period', () => {
    const city = makeCity();
    const units: Record<UnitType, number> = { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 };
    const prevState: CityWinterState = {
      cityId: 'city-1',
      foodBalance: 50,
      starvationHours: 6, // > grace=4
      isStarving: true,
      combatPenalty: 1.0,
      desertionLosses: { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 },
    };
    const now = new Date(new Date(city.createdAt).getTime() + 60 * 60 * 1000);

    const state = evaluateWinterPressure(city, 0, units, prevState, now);
    expect(state.combatPenalty).toBe(DEFAULT_WINTER_PRESSURE_CONFIG.starvationCombatPenalty);
  });

  it('applies desertion scaled by elapsed time', () => {
    const city = makeCity();
    const units: Record<UnitType, number> = { WARRIOR: 100, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 };
    const prevState: CityWinterState = {
      cityId: 'city-1',
      foodBalance: 50,
      starvationHours: 14, // > desertionAfter=12
      isStarving: true,
      combatPenalty: 0.8,
      desertionLosses: { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 },
    };
    const now = new Date(new Date(city.createdAt).getTime() + 2 * 60 * 60 * 1000); // +2h

    const state = evaluateWinterPressure(city, 0, units, prevState, now);
    // loss = floor(100 * 0.05 * 2) = 10
    expect(state.desertionLosses.WARRIOR).toBe(10);
  });

  it('recovers when food is above reserve', () => {
    const city = makeCity({ resources: { ...makeCity().resources, food: 200 } });
    const units: Record<UnitType, number> = { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 };
    const prevState: CityWinterState = {
      cityId: 'city-1',
      foodBalance: 200,
      starvationHours: 6,
      isStarving: true,
      combatPenalty: 0.8,
      desertionLosses: { WARRIOR: 5, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 },
    };
    const now = new Date(new Date(city.createdAt).getTime() + 2 * 60 * 60 * 1000); // +2h

    const state = evaluateWinterPressure(city, 50, units, prevState, now);
    expect(state.isStarving).toBe(false);
    // starvationHours = 6 - 2*2 = 2
    expect(state.starvationHours).toBe(2);
    expect(state.combatPenalty).toBe(0.8); // still penalized until 0
  });

  it('fully resets when starvationHours reaches 0', () => {
    const city = makeCity({ resources: { ...makeCity().resources, food: 200 } });
    const units: Record<UnitType, number> = { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 };
    const prevState: CityWinterState = {
      cityId: 'city-1',
      foodBalance: 200,
      starvationHours: 0.5,
      isStarving: true,
      combatPenalty: 0.8,
      desertionLosses: { WARRIOR: 5, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 },
    };
    const now = new Date(new Date(city.createdAt).getTime() + 60 * 60 * 1000); // +1h

    const state = evaluateWinterPressure(city, 50, units, prevState, now);
    expect(state.starvationHours).toBe(0);
    expect(state.combatPenalty).toBe(1.0);
    expect(state.desertionLosses.WARRIOR).toBe(0);
  });
});

describe('resetWinterState', () => {
  it('returns clean state with current food', () => {
    const state = resetWinterState('city-1', 250);
    expect(state.cityId).toBe('city-1');
    expect(state.foodBalance).toBe(250);
    expect(state.starvationHours).toBe(0);
    expect(state.isStarving).toBe(false);
    expect(state.combatPenalty).toBe(1.0);
    expect(state.desertionLosses.WARRIOR).toBe(0);
  });
});

describe('getWinterPressureSummary', () => {
  it('returns Infinity hours until starvation when netFood is positive', () => {
    const city = makeCity({ resources: { ...makeCity().resources, food: 500 } });
    const units: Record<UnitType, number> = { WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 };
    const summary = getWinterPressureSummary(city, 100, units);
    expect(summary.netFoodPerHour).toBe(100);
    expect(summary.hoursUntilStarvation).toBe(Infinity);
  });

  it('calculates hours until starvation correctly', () => {
    const city = makeCity({ resources: { ...makeCity().resources, food: 500 } });
    const units: Record<UnitType, number> = { WARRIOR: 200, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0 };
    // consumption = 100, production = 50 → net = -50
    const summary = getWinterPressureSummary(city, 50, units);
    expect(summary.netFoodPerHour).toBe(-50);
    // (500 - 100) / 50 = 8 hours
    expect(summary.hoursUntilStarvation).toBe(8);
  });
});
