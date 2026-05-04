import { describe, it, expect, vi } from 'vitest';
import type { WorldSeasonState } from '@etheria/shared';
import { calculateEffectiveProduction } from '../production.js';

// Mock DB and infrastructure before importing production
vi.mock('../infrastructure/matecito.js', () => ({
  db: {},
  COLLECTIONS: {},
}));

vi.mock('../worldConfig.js', () => ({
  getWorldConfig: vi.fn(() => Promise.resolve({
    map: { width: 1000, height: 1000 },
  })),
}));

vi.mock('../seasons.js', () => ({
  getSeasonState: vi.fn(() => Promise.resolve(null)),
  initializeSeasonState: vi.fn(),
  advanceSeason: vi.fn(),
}));

vi.mock('../worldZoneConfigData.js', () => ({
  LOCAL_WORLD_ZONE_CONFIGS: [],
  resolveWorldZone: vi.fn(() => ({ id: 'CENTER', name: 'Center', resourceModifiers: {} })),
}));

function makeSeasonState(season: WorldSeasonState['currentSeason'], intensity: number): WorldSeasonState {
  const now = new Date().toISOString();
  return {
    id: 'season-1',
    currentSeason: season,
    nextSeason: season,
    phase: 'PEAK',
    intensity,
    startedAt: now,
    peakAt: now,
    transitionAt: now,
    endsAt: now,
    updatedAt: now,
  };
}

describe('calculateEffectiveProduction', () => {
  const baseProduction = {
    goldPerHour: 100,
    woodPerHour: 100,
    stonePerHour: 50,
    foodPerHour: 50,
  };

  it('returns base production with no modifiers', async () => {
    const result = await calculateEffectiveProduction(baseProduction, {
      cityPosX: 0,
      cityPosY: 0,
    });
    expect(result.production).toEqual(baseProduction);
    expect(result.seasonModifier).toEqual({ gold: 1, wood: 1, stone: 1, food: 1 });
  });

  it('applies tech bonus correctly', async () => {
    const result = await calculateEffectiveProduction(baseProduction, {
      techBonuses: { resourceProdBonus: { all: 0.1, gold: 0.05 } },
      cityPosX: 0,
      cityPosY: 0,
    });
    // gold: 100 * 1.15 ≈ 115, wood: 100 * 1.1 = 110, stone: 50 * 1.1 = 55, food: 50 * 1.1 = 55
    // Allow ±1 for floating point rounding
    expect(result.production.goldPerHour).toBeGreaterThanOrEqual(114);
    expect(result.production.goldPerHour).toBeLessThanOrEqual(115);
    expect(result.production.woodPerHour).toBe(110);
    expect(result.production.stonePerHour).toBe(55);
    expect(result.production.foodPerHour).toBe(55);
  });

  it('applies SPRING food bonus', async () => {
    const result = await calculateEffectiveProduction(baseProduction, {
      seasonState: makeSeasonState('SPRING', 1.0),
      cityPosX: 0,
      cityPosY: 0,
    });
    // food: 50 * 1.10 = 55
    expect(result.production.foodPerHour).toBe(55);
    expect(result.production.goldPerHour).toBe(100); // unchanged
    expect(result.seasonModifier.food).toBe(1.1);
  });

  it('applies WINTER food and wood penalties', async () => {
    const result = await calculateEffectiveProduction(baseProduction, {
      seasonState: makeSeasonState('WINTER', 1.0),
      cityPosX: 0,
      cityPosY: 0,
    });
    // food: 50 * 0.85 = 42.5 → floor = 42
    // wood: 100 * 0.95 = 95
    expect(result.production.foodPerHour).toBe(42);
    expect(result.production.woodPerHour).toBe(95);
    expect(result.production.goldPerHour).toBe(100); // unchanged
    expect(result.seasonModifier.food).toBe(0.85);
    expect(result.seasonModifier.wood).toBe(0.95);
  });

  it('applies zone modifier', async () => {
    const { resolveWorldZone } = await import('../worldZoneConfigData.js');
    vi.mocked(resolveWorldZone).mockReturnValue({
      id: 'MOUNTAIN',
      name: 'Mountain',
      resourceModifiers: { stone: 0.20, wood: -0.10, food: -0.10 },
    } as any);

    const result = await calculateEffectiveProduction(baseProduction, {
      cityPosX: 500,
      cityPosY: 500,
    });
    // stone: 50 * 1.20 = 60
    // wood: 100 * 0.90 = 90
    // food: 50 * 0.90 = 45
    expect(result.production.stonePerHour).toBe(60);
    expect(result.production.woodPerHour).toBe(90);
    expect(result.production.foodPerHour).toBe(45);
    expect(result.production.goldPerHour).toBe(100);
  });

  it('combines tech + season + zone modifiers', async () => {
    const { resolveWorldZone } = await import('../worldZoneConfigData.js');
    vi.mocked(resolveWorldZone).mockReturnValue({
      id: 'MOUNTAIN',
      name: 'Mountain',
      resourceModifiers: { stone: 0.20 },
    } as any);

    const result = await calculateEffectiveProduction(
      { goldPerHour: 100, woodPerHour: 100, stonePerHour: 100, foodPerHour: 100 },
      {
        techBonuses: { resourceProdBonus: { all: 0.1 } },
        seasonState: makeSeasonState('AUTUMN', 1.0),
        cityPosX: 500,
        cityPosY: 500,
      }
    );

    // food: 100 * 1.1 (tech) * 1.15 (autumn) * 1.0 (zone) = 126.5 → floor 126
    // stone: 100 * 1.1 (tech) * 1.0 (autumn) * 1.20 (mountain) = 132 → floor 132
    expect(result.production.foodPerHour).toBe(126);
    expect(result.production.stonePerHour).toBe(132);
  });

  it('never returns negative production', async () => {
    const result = await calculateEffectiveProduction(
      { goldPerHour: 1, woodPerHour: 1, stonePerHour: 1, foodPerHour: 1 },
      {
        seasonState: makeSeasonState('WINTER', 10.0), // extreme penalty
        cityPosX: 0,
        cityPosY: 0,
      }
    );
    expect(result.production.goldPerHour).toBeGreaterThanOrEqual(0);
    expect(result.production.woodPerHour).toBeGreaterThanOrEqual(0);
    expect(result.production.stonePerHour).toBeGreaterThanOrEqual(0);
    expect(result.production.foodPerHour).toBeGreaterThanOrEqual(0);
  });

  it('applies Math.floor only once at the end', async () => {
    const result = await calculateEffectiveProduction(
      { goldPerHour: 10, woodPerHour: 10, stonePerHour: 10, foodPerHour: 10 },
      {
        techBonuses: { resourceProdBonus: { all: 0.0 } },
        seasonState: makeSeasonState('SUMMER', 1.0),
        cityPosX: 0,
        cityPosY: 0,
      }
    );

    // summer gives +5% to all
    // 10 * 1.05 = 10.5 → floor = 10
    expect(result.production.goldPerHour).toBe(10);
  });
});
