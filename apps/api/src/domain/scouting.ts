import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { mergeRecordBySelector } from "../infrastructure/matecitoRecord.js";
import { createGameReport } from "./reports.js";

async function checkSpyDetection(targetCityId: string): Promise<boolean> {
  const buildingsRes = await db.from(COLLECTIONS.BUILDINGS).eq("cityId", targetCityId).get() as any;
  const tower = (buildingsRes.data ?? []).find((b: any) => b.type === "TOWER");
  const towerLevel = tower?.level ?? 0;

  const techsRes = await db.from(COLLECTIONS.CITY_TECHS).eq("cityId", targetCityId).get() as any;
  const hasSpyNetwork = (techsRes.data ?? []).some((t: any) => t.techId === "SPY_NETWORK" && (t.level ?? 0) > 0);

  const baseChance = 0.15;
  const towerBonus = towerLevel * 0.05;
  const techBonus = hasSpyNetwork ? 0.10 : 0;
  const detectionChance = Math.min(0.85, baseChance + towerBonus + techBonus);

  return Math.random() < detectionChance;
}

async function getCityUserId(cityId: string): Promise<string | null> {
  const cityRes = await db.from(COLLECTIONS.CITIES).eq("id", cityId).getFirst() as any;
  return cityRes.data?.userId ?? null;
}

export async function scoutTarget(userId: string, input: { cityId: string; targetType: "CITY" | "BARBARIAN_CAMP"; targetId: string }) {
  const cityRes = await db.from(COLLECTIONS.CITIES).eq("id", input.cityId).getFirst() as any;
  const city = cityRes.data;
  if (!city || city.userId !== userId) return { error: "City not found", status: 404 } as const;

  const spyRes = await db.from(COLLECTIONS.UNITS).eq("cityId", input.cityId).eq("type", "SPY").getFirst() as any;
  const spy = spyRes.data;
  if (!spy || Number(spy.count ?? 0) < 1) return { error: "Spy required", status: 400 } as const;

  let payload: Record<string, unknown>;
  let title = "Intel report";
  if (input.targetType === "CITY") {
    const targetRes = await db.from(COLLECTIONS.CITIES).eq("id", input.targetId).getFirst() as any;
    const target = targetRes.data;
    if (!target) return { error: "Target city not found", status: 404 } as const;
    const [unitsRes, buildingsRes] = await Promise.all([
      db.from(COLLECTIONS.UNITS).eq("cityId", target.id).get() as any,
      db.from(COLLECTIONS.BUILDINGS).eq("cityId", target.id).get() as any,
    ]);
    const troopTotal = (unitsRes.data ?? []).reduce((sum: number, unit: any) => sum + Number(unit.count ?? 0), 0);
    const buildingPower = (buildingsRes.data ?? []).reduce((sum: number, building: any) => sum + Number(building.level ?? 1) * 12, 0);
    title = `Intel: ${target.name}`;
    payload = {
      targetType: "CITY",
      targetId: target.id,
      targetName: target.name,
      estimatedResources: {
        gold: Math.round(Number(target.gold ?? 0) / 50) * 50,
        wood: Math.round(Number(target.wood ?? 0) / 50) * 50,
        stone: Math.round(Number(target.stone ?? 0) / 50) * 50,
        food: Math.round(Number(target.food ?? 0) / 50) * 50,
      },
      approximateTroops: troopTotal < 10 ? "LOW" : troopTotal < 50 ? "MEDIUM" : "HIGH",
      approximateDefensePower: Math.round((troopTotal * 8 + buildingPower) / 25) * 25,
      risk: troopTotal > 50 ? "HIGH" : troopTotal > 15 ? "MEDIUM" : "LOW",
      scoutedAt: new Date().toISOString(),
    };
  } else {
    const campRes = await db.from(COLLECTIONS.BARBARIAN_CAMPS).eq("id", input.targetId).getFirst() as any;
    const camp = campRes.data;
    if (!camp) return { error: "Barbarian camp not found", status: 404 } as const;
    const armyRes = await db.from(COLLECTIONS.BARBARIAN_ARMIES).eq("campId", camp.id).getFirst() as any;
    title = `Intel: ${camp.name}`;
    payload = {
      targetType: "BARBARIAN_CAMP",
      targetId: camp.id,
      targetName: camp.name,
      level: camp.level,
      approximateTroops: armyRes.data?.units ?? {},
      approximateDefensePower: armyRes.data?.power ?? Math.floor(100 + 50 * (camp.level - 1)),
      risk: Number(camp.level ?? 1) >= 4 ? "HIGH" : Number(camp.level ?? 1) >= 2 ? "MEDIUM" : "LOW",
      scoutedAt: new Date().toISOString(),
    };
  }

  await mergeRecordBySelector(COLLECTIONS.UNITS, spy, { count: Number(spy.count ?? 0) - 1 });

  if (input.targetType === "CITY") {
    const detected = await checkSpyDetection(input.targetId);
    if (detected) {
      const targetUserId = await getCityUserId(input.targetId);
      if (targetUserId) {
        const targetCityRes = await db.from(COLLECTIONS.CITIES).eq("id", input.targetId).getFirst() as any;
        const targetName = targetCityRes.data?.name ?? "Unknown";
        await createGameReport({
          type: "SPY_DETECTED",
          userId: targetUserId,
          cityId: input.targetId,
          title: "Spy detected!",
          summary: `An enemy spy was spotted near ${targetName}. They may have gathered intelligence about your city.`,
          payload: { scoutCityId: input.cityId, targetCityId: input.targetId, detectedAt: new Date().toISOString() },
        });
      }
    }
  }

  const report = await createGameReport({
    type: "SPY_INTEL",
    userId,
    cityId: input.cityId,
    title,
    summary: "Your spy returned with estimates. Fog and map visibility were not changed.",
    payload,
  });
  return { success: true, report };
}
