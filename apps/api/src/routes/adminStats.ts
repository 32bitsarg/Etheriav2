import { Hono } from "hono";
import { prisma } from "@etheria/database";
import { requireAdmin } from "../infrastructure/adminMiddleware.js";

export const adminStatsRouter = new Hono();
adminStatsRouter.use("*", requireAdmin());

// Simple in-memory cache (TTL 60s)
type CacheEntry = { at: number; data: unknown };
const cache = new Map<string, CacheEntry>();
const TTL = 60_000;

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.at < TTL) return Promise.resolve(entry.data as T);
  return fn().then((data) => { cache.set(key, { at: Date.now(), data }); return data; });
}

adminStatsRouter.get("/overview", async (c) => {
  const data = await cached("overview", async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday24h = new Date(Date.now() - 24 * 3_600_000);
    const last7d = new Date(Date.now() - 7 * 24 * 3_600_000);
    const last15m = new Date(Date.now() - 15 * 60_000);

    const [
      totalPlayers, totalBots, newToday,
      activeLast24h, activeLast7d, openSessions,
      messagesToday, battlesResolved24h,
      worlds, recentRegistrations,
    ] = await Promise.all([
      prisma.user.count({ where: { isBot: false } }),
      prisma.user.count({ where: { isBot: true } }),
      prisma.user.count({ where: { createdAt: { gte: today }, isBot: false } }),
      prisma.session.groupBy({ by: ["userId"], where: { lastSeenAt: { gt: yesterday24h } }, _count: { userId: true } }).then((r) => r.length),
      prisma.session.groupBy({ by: ["userId"], where: { lastSeenAt: { gt: last7d } }, _count: { userId: true } }).then((r) => r.length),
      prisma.session.count({ where: { expiresAt: { gt: now } } }),
      prisma.chatMessage.count({ where: { createdAt: { gte: today } } }),
      prisma.battle.count({ where: { resolvedAt: { gte: yesterday24h, not: null } } }),
      prisma.world.findMany({ select: { id: true, name: true } }),
      prisma.user.findMany({ where: { isBot: false }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, name: true, email: true, createdAt: true } }),
    ]);

    return { totalPlayers, totalBots, newToday, activeLast24h, activeLast7d, openSessions, messagesToday, battlesResolved24h, worlds, recentRegistrations };
  });

  return c.json(data, 200, { "Cache-Control": "no-store" });
});

adminStatsRouter.get("/timeseries", async (c) => {
  const days = Math.min(90, Math.max(1, parseInt(c.req.query("days") ?? "14", 10)));
  const key = `timeseries:${days}`;

  const data = await cached(key, async () => {
    const since = new Date(Date.now() - days * 24 * 3_600_000);
    const [users, messages, battles] = await Promise.all([
      prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS date, COUNT(*) AS count
        FROM users WHERE "createdAt" >= ${since} AND "isBot" = false GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS date, COUNT(*) AS count
        FROM chat_messages WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT date_trunc('day', "resolvedAt") AS date, COUNT(*) AS count
        FROM battles WHERE "resolvedAt" >= ${since} AND "resolvedAt" IS NOT NULL GROUP BY 1 ORDER BY 1`,
    ]);

    const toMap = (rows: { date: Date; count: bigint }[]) =>
      new Map(rows.map((r) => [r.date.toISOString().slice(0, 10), Number(r.count)]));

    const uMap = toMap(users);
    const mMap = toMap(messages);
    const bMap = toMap(battles);

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3_600_000);
      const date = d.toISOString().slice(0, 10);
      result.push({ date, newUsers: uMap.get(date) ?? 0, messages: mMap.get(date) ?? 0, battles: bMap.get(date) ?? 0 });
    }
    return result;
  });

  return c.json({ days: data }, 200, { "Cache-Control": "no-store" });
});

adminStatsRouter.get("/top-players", async (c) => {
  const limit = Math.min(50, parseInt(c.req.query("limit") ?? "10", 10));
  const data = await cached(`top-players:${limit}`, async () => {
    const cities = await prisma.city.findMany({
      where: { user: { isBot: false } },
      orderBy: { power: "desc" },
      take: limit,
      select: { id: true, name: true, userId: true, worldId: true, power: true, user: { select: { name: true } } },
    });
    return cities.map((c) => ({ userId: c.userId, userName: c.user.name, cityName: c.name, cityId: c.id, power: c.power, worldId: c.worldId }));
  });

  return c.json({ players: data }, 200, { "Cache-Control": "no-store" });
});

adminStatsRouter.get("/bots", async (c) => {
  const data = await cached("bots", async () => {
    const since24h = new Date(Date.now() - 24 * 3_600_000);
    const [lastSnapshot, errors24h, actions24h] = await Promise.all([
      prisma.botMetricsSnapshot.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.botActionLog.count({ where: { status: "UNEXPECTED_ERROR", createdAt: { gte: since24h } } }),
      prisma.botActionLog.count({ where: { createdAt: { gte: since24h } } }),
    ]);
    return { lastSnapshot, errors24h, actions24h };
  });

  return c.json(data, 200, { "Cache-Control": "no-store" });
});
