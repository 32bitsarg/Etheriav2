import type { Resources } from "@etheria/shared";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { mergeRecordByLogicalId, mergeRecordBySelector } from "../infrastructure/matecitoRecord.js";
import { createGameReport } from "./reports.js";
import { advanceQuest } from "./quests.js";

const genId = () => crypto.randomUUID();

const DEFAULT_TARGET: Resources = { gold: 800, wood: 800, stone: 600, food: 800, gems: 0 };
const ZERO: Resources = { gold: 0, wood: 0, stone: 0, food: 0, gems: 0 };

function add(a: Resources, b: Resources): Resources {
  return {
    gold: a.gold + b.gold,
    wood: a.wood + b.wood,
    stone: a.stone + b.stone,
    food: a.food + b.food,
    gems: a.gems + b.gems,
  };
}

function complete(progress: Resources, target: Resources) {
  return progress.gold >= target.gold && progress.wood >= target.wood && progress.stone >= target.stone && progress.food >= target.food;
}

export async function ensureAllianceObjective(allianceId: string) {
  const existing = await db.from(COLLECTIONS.ALLIANCE_OBJECTIVES).eq("allianceId", allianceId).eq("status", "ACTIVE").getFirst() as any;
  if (existing.data) return existing.data;
  const now = new Date();
  const objective = {
    id: genId(),
    allianceId,
    title: "Shared stores",
    summary: "Contribute resources to unlock a temporary production effect.",
    target: DEFAULT_TARGET,
    progress: ZERO,
    rewardEffect: { type: "PEACE_PRODUCTION", value: 0.03, durationHours: 24 },
    status: "ACTIVE",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 7 * 24 * 3600_000).toISOString(),
    completedAt: null,
  };
  await db.from(COLLECTIONS.ALLIANCE_OBJECTIVES).insert(objective);
  return objective;
}

export async function contributeAllianceObjective(input: {
  userId: string;
  allianceId: string;
  objectiveId: string;
  cityId: string;
  resources: Resources;
}) {
  const [objectiveRes, cityRes] = await Promise.all([
    db.from(COLLECTIONS.ALLIANCE_OBJECTIVES).eq("id", input.objectiveId).getFirst() as any,
    db.from(COLLECTIONS.CITIES).eq("id", input.cityId).getFirst() as any,
  ]);
  const objective = objectiveRes.data;
  const city = cityRes.data;
  if (!objective || objective.allianceId !== input.allianceId || objective.status !== "ACTIVE") return { error: "Objective not found", status: 404 } as const;
  if (!city || city.userId !== input.userId) return { error: "City not found", status: 404 } as const;
  const resources = input.resources;
  const total = resources.gold + resources.wood + resources.stone + resources.food + resources.gems;
  if (total <= 0) return { error: "Contribution must include resources", status: 400 } as const;
  for (const key of ["gold", "wood", "stone", "food", "gems"] as const) {
    if (Number(city[key] ?? 0) < resources[key]) return { error: "Not enough resources", status: 400 } as const;
  }
  const nextCity = {
    gold: Number(city.gold ?? 0) - resources.gold,
    wood: Number(city.wood ?? 0) - resources.wood,
    stone: Number(city.stone ?? 0) - resources.stone,
    food: Number(city.food ?? 0) - resources.food,
    gems: Number(city.gems ?? 0) - resources.gems,
  };
  const nextProgress = add(objective.progress ?? ZERO, resources);
  const now = new Date().toISOString();
  await mergeRecordBySelector(COLLECTIONS.CITIES, city, { ...nextCity, lastResourceUpdate: now });
  await db.from(COLLECTIONS.ALLIANCE_OBJECTIVE_CONTRIBUTIONS).insert({
    id: genId(),
    objectiveId: objective.id,
    allianceId: input.allianceId,
    userId: input.userId,
    cityId: input.cityId,
    resources,
    createdAt: now,
  });
  const completed = complete(nextProgress, objective.target);
  await mergeRecordByLogicalId(COLLECTIONS.ALLIANCE_OBJECTIVES, objective.id, {
    progress: nextProgress,
    status: completed ? "COMPLETED" : "ACTIVE",
    completedAt: completed ? now : null,
  });
  if (completed) {
    const effect = objective.rewardEffect ?? { type: "PEACE_PRODUCTION", value: 0.03, durationHours: 24 };
    await db.from(COLLECTIONS.ALLIANCE_EFFECTS).insert({
      id: genId(),
      allianceId: input.allianceId,
      type: effect.type,
      value: effect.value,
      reason: "Alliance objective completed",
      expiresAt: new Date(Date.now() + Number(effect.durationHours) * 3600_000).toISOString(),
      createdAt: now,
    });
  }
  await createGameReport({ type: "ALLIANCE", userId: input.userId, cityId: input.cityId, title: "Alliance contribution", summary: "Your contribution was added to the alliance objective.", payload: { objectiveId: objective.id, resources } });
  await advanceQuest(input.cityId, "USE_ALLIANCE", 1);
  return { success: true, progress: nextProgress, resources: nextCity, completed };
}
