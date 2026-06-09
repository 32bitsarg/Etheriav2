import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { mergeRecordByLogicalId } from "../infrastructure/matecitoRecord.js";

export type BotRecord = {
  id: string;
  userId: string;
  cityId: string;
  worldId: string;
  profile: string;
  status: "ACTIVE" | "PAUSED" | "ERROR";
  state?: any;
  createdAt?: string | Date;
  lastTickAt?: string | Date | null;
  nextTickAt: string | Date;
};

function normalizeDateValue(value: unknown) {
  return value instanceof Date ? value.toISOString() : value;
}

export function normalizeBotRecord(bot: any): BotRecord {
  return {
    ...bot,
    worldId: bot.worldId ?? "default",
    createdAt: normalizeDateValue(bot.createdAt),
    lastTickAt: normalizeDateValue(bot.lastTickAt) ?? null,
    nextTickAt: normalizeDateValue(bot.nextTickAt),
  };
}

export async function listBots(worldId?: string) {
  let query = db.from(COLLECTIONS.BOT_PLAYERS).limit(5000);
  if (worldId) query = query.eq("worldId", worldId);
  const res = await query.get() as any;
  return (res.data ?? []).map(normalizeBotRecord).sort((a: BotRecord, b: BotRecord) =>
    new Date(String(a.createdAt ?? 0)).getTime() - new Date(String(b.createdAt ?? 0)).getTime()
  );
}

export async function listDueBots(now: Date, limit: number, worldId?: string) {
  const bots = (await listBots(worldId))
    .filter((bot: BotRecord) => bot.status === "ACTIVE" && new Date(String(bot.nextTickAt)).getTime() <= now.getTime())
    .sort((a: BotRecord, b: BotRecord) => new Date(String(a.nextTickAt)).getTime() - new Date(String(b.nextTickAt)).getTime());
  return bots.slice(0, limit);
}

export async function createBotRecord(bot: BotRecord) {
  await db.from(COLLECTIONS.BOT_PLAYERS).insert({
    ...bot,
    worldId: bot.worldId ?? "default",
    createdAt: bot.createdAt ?? new Date().toISOString(),
    lastTickAt: bot.lastTickAt ?? null,
    nextTickAt: normalizeDateValue(bot.nextTickAt),
  });
  return bot;
}

export async function updateBotRecord(botId: string, patch: Record<string, unknown>) {
  return mergeRecordByLogicalId(COLLECTIONS.BOT_PLAYERS, botId, Object.fromEntries(
    Object.entries(patch).map(([key, value]) => [key, normalizeDateValue(value)])
  ));
}

export async function deleteBotRecord(botId: string) {
  await db.from(COLLECTIONS.BOT_PLAYERS).eq("id", botId).delete().execute();
}

export async function logBotAction(input: {
  botId: string;
  cityId: string;
  actionType: string;
  status: string;
  reason?: string;
  errorKind?: string;
  errorMessage?: string;
  payload?: unknown;
}) {
  await db.from(COLLECTIONS.BOT_ACTION_LOGS).insert({
    id: crypto.randomUUID(),
    botId: input.botId,
    cityId: input.cityId,
    actionType: input.actionType,
    status: input.status,
    reason: input.reason ?? null,
    errorKind: input.errorKind ?? null,
    errorMessage: input.errorMessage ?? null,
    payload: input.payload ?? null,
    createdAt: new Date().toISOString(),
  });
}

export async function listRecentBotLogs(since: Date) {
  const res = await db.from(COLLECTIONS.BOT_ACTION_LOGS)
    .gte("createdAt", since.toISOString())
    .get() as any;
  return res.data ?? [];
}

export async function writeBotMetrics(input: Record<string, unknown>) {
  await db.from(COLLECTIONS.BOT_METRICS_SNAPSHOTS).insert({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  });
}
