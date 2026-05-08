import type { GameReportType } from "@etheria/shared";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { mergeRecordByLogicalId } from "../infrastructure/matecitoRecord.js";

const genId = () => crypto.randomUUID();

export async function createGameReport(input: {
  type: GameReportType;
  userId: string;
  cityId?: string | null;
  title: string;
  summary: string;
  payload?: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const report = {
    id: genId(),
    type: input.type,
    userId: input.userId,
    cityId: input.cityId ?? null,
    title: input.title,
    summary: input.summary,
    payload: input.payload ?? {},
    readAt: null,
    createdAt: now,
  };
  await db.from(COLLECTIONS.GAME_REPORTS).insert(report);
  return report;
}

export async function listGameReports(userId: string, type?: string | null) {
  let query = db.from(COLLECTIONS.GAME_REPORTS).eq("userId", userId).limit(100);
  if (type) query = query.eq("type", type);
  const res = await query.get() as any;
  return (res.data ?? []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markGameReportRead(userId: string, reportId: string) {
  const reportRes = await db.from(COLLECTIONS.GAME_REPORTS).eq("id", reportId).getFirst() as any;
  const report = reportRes.data;
  if (!report || report.userId !== userId) return false;
  await mergeRecordByLogicalId(COLLECTIONS.GAME_REPORTS, reportId, { readAt: new Date().toISOString() });
  return true;
}
