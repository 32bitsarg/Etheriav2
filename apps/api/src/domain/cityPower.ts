import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { getUnitStats } from "./units.js";
import { calculateTechBonuses } from "./techs.js";
import type { TechBonuses } from "@etheria/shared";

const BUILDING_POWER: Record<string, number> = {
  TOWN_HALL: 140,
  GOLD_MINE: 55,
  LUMBER_MILL: 55,
  QUARRY: 55,
  FARM: 55,
  BARRACKS: 90,
  STABLE: 100,
  ALLIANCE_CENTER: 85,
  LIBRARY: 95,
  STORAGE: 60,
  TOWER: 130,
  MARKET: 75,
};

function emptyTechBonuses(): TechBonuses {
  return {
    unitAttackBonus: {}, unitHpBonus: {}, unitDefenseBonus: {}, unitSpeedBonus: {}, unitApBonus: {},
    resourceProdBonus: {}, trainingCostReduction: 0, wallBonusMultiplier: 1, towerDamageBonus: 0,
  };
}

export type CityPowerBreakdown = {
  buildings: number;
  army: number;
  research: number;
  total: number;
};

export function calculateCityPowerFromParts(input: {
  buildings: Array<{ type: string; level: number }>;
  units: Array<{ type: string; count: number; level?: number }>;
  cityTechs: Array<{ techId: string; level: number }>;
}): CityPowerBreakdown {
  const techBonuses = input.cityTechs.length > 0
    ? calculateTechBonuses(input.cityTechs as any)
    : emptyTechBonuses();

  const buildings = input.buildings.reduce((sum, building) => {
    const level = Math.max(1, Number(building.level ?? 1));
    const base = BUILDING_POWER[building.type] ?? 50;
    return sum + base * level + Math.max(0, level - 1) * base * 0.35;
  }, 0);

  const army = input.units.reduce((sum, unit) => {
    const count = Math.max(0, Number(unit.count ?? 0));
    if (count <= 0) return sum;
    const unitLevel = Math.max(1, Number(unit.level ?? 1));
    const stats = getUnitStats(unit.type as any, unitLevel, techBonuses);
    const unitPower = stats.attack * 1.7 + stats.defense * 1.3 + stats.hp * 0.5
      + stats.armorPenetration * 0.5 + stats.speed * 0.08 + stats.carry * 0.08;
    return sum + Math.round(unitPower * count);
  }, 0);

  const research = input.cityTechs.reduce((sum, tech) => {
    const level = Math.max(1, Number(tech.level ?? 1));
    return sum + 120 * level;
  }, 0);

  const total = Math.max(0, Math.round(buildings + army + research));
  return {
    buildings: Math.round(buildings),
    army: Math.round(army),
    research: Math.round(research),
    total,
  };
}

export async function calculateCityPower(cityId: string): Promise<CityPowerBreakdown> {
  const [buildingsRes, unitsRes, cityTechsRes] = await Promise.all([
    db.from(COLLECTIONS.BUILDINGS).eq("cityId", cityId).get() as any,
    db.from(COLLECTIONS.UNITS).eq("cityId", cityId).get() as any,
    db.from(COLLECTIONS.CITY_TECHS).eq("cityId", cityId).get() as any,
  ]);

  return calculateCityPowerFromParts({
    buildings: buildingsRes.data ?? [],
    units: unitsRes.data ?? [],
    cityTechs: cityTechsRes.data ?? [],
  });
}

export async function getCityPowerMap(cityIds: string[]) {
  const [buildingsRes, unitsRes, cityTechsRes] = await Promise.all([
    db.from(COLLECTIONS.BUILDINGS).limit(5000).get() as any,
    db.from(COLLECTIONS.UNITS).limit(5000).get() as any,
    db.from(COLLECTIONS.CITY_TECHS).limit(5000).get() as any,
  ]);

  const requested = new Set(cityIds);
  const map = new Map<string, CityPowerBreakdown>();
  for (const cityId of cityIds) {
    map.set(cityId, calculateCityPowerFromParts({
      buildings: (buildingsRes.data ?? []).filter((row: any) => row.cityId === cityId && requested.has(row.cityId)),
      units: (unitsRes.data ?? []).filter((row: any) => row.cityId === cityId && requested.has(row.cityId)),
      cityTechs: (cityTechsRes.data ?? []).filter((row: any) => row.cityId === cityId && requested.has(row.cityId)),
    }));
  }
  return map;
}
