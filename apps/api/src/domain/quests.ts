import type { Resources } from "@etheria/shared";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { mergeRecordByLogicalId, mergeRecordBySelector } from "../infrastructure/matecitoRecord.js";
import { createGameReport } from "./reports.js";
import { getQuestConfigs } from "./questConfigData.js";

const genId = () => crypto.randomUUID();

export async function ensurePlayerQuests(city: any) {
  const existingRes = await db.from(COLLECTIONS.PLAYER_QUESTS).eq("cityId", city.id).get() as any;
  const existing = existingRes.data ?? [];
  const existingIds = new Set(existing.map((quest: any) => quest.questId));
  const now = new Date().toISOString();
  for (const quest of getQuestConfigs()) {
    if (existingIds.has(quest.questId)) continue;
    await db.from(COLLECTIONS.PLAYER_QUESTS).insert({
      id: genId(),
      userId: city.userId,
      cityId: city.id,
      ...quest,
      progress: 0,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function listPlayerQuests(userId: string, cityId?: string | null) {
  let query = db.from(COLLECTIONS.PLAYER_QUESTS).eq("userId", userId);
  if (cityId) query = query.eq("cityId", cityId);
  const res = await query.get() as any;
  const orderByQuest = new Map(getQuestConfigs().map((quest) => [quest.questId, quest.order]));
  return (res.data ?? []).sort((a: any, b: any) => (orderByQuest.get(a.questId) ?? 999) - (orderByQuest.get(b.questId) ?? 999));
}

export async function advanceQuest(cityId: string, questType: string, amount = 1) {
  const questsRes = await db.from(COLLECTIONS.PLAYER_QUESTS).eq("cityId", cityId).eq("type", questType).get() as any;
  for (const quest of questsRes.data ?? []) {
    if (quest.status === "CLAIMED") continue;
    const progress = Math.min(Number(quest.target), Number(quest.progress ?? 0) + amount);
    const status = progress >= Number(quest.target) ? "CLAIMABLE" : "ACTIVE";
    await mergeRecordBySelector(COLLECTIONS.PLAYER_QUESTS, quest, {
      progress,
      status,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function claimQuest(userId: string, questId: string) {
  const questRes = await db.from(COLLECTIONS.PLAYER_QUESTS).eq("id", questId).getFirst() as any;
  const quest = questRes.data;
  if (!quest || quest.userId !== userId) return { error: "Quest not found", status: 404 } as const;
  if (quest.status !== "CLAIMABLE") return { error: "Quest is not claimable", status: 400 } as const;

  const cityRes = await db.from(COLLECTIONS.CITIES).eq("id", quest.cityId).getFirst() as any;
  const city = cityRes.data;
  if (!city) return { error: "City not found", status: 404 } as const;
  const reward = quest.reward as Resources;
  const next = {
    gold: Math.min(Number(city.maxGold ?? 1000), Number(city.gold ?? 0) + reward.gold),
    wood: Math.min(Number(city.maxWood ?? 1000), Number(city.wood ?? 0) + reward.wood),
    stone: Math.min(Number(city.maxStone ?? 500), Number(city.stone ?? 0) + reward.stone),
    food: Math.min(Number(city.maxFood ?? 500), Number(city.food ?? 0) + reward.food),
    gems: Number(city.gems ?? 0) + reward.gems,
  };
  const now = new Date().toISOString();
  await mergeRecordBySelector(COLLECTIONS.CITIES, city, { ...next, lastResourceUpdate: now });
  await mergeRecordByLogicalId(COLLECTIONS.PLAYER_QUESTS, quest.id, { status: "CLAIMED", claimedAt: now, updatedAt: now });
  await createGameReport({
    type: "QUEST",
    userId,
    cityId: quest.cityId,
    title: "Quest completed",
    summary: "A quest reward was claimed.",
    payload: { questId: quest.questId, reward },
  });
  return { success: true, resources: next, reward };
}
