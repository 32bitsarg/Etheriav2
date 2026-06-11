import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "@etheria/database";
import { requireAdmin } from "../infrastructure/adminMiddleware.js";
import { banUser, unbanUser, muteUser, unmuteUser, kickSessions } from "../domain/moderationService.js";

export const adminUsersRouter = new Hono();
adminUsersRouter.use("*", requireAdmin());

const LIMIT = 25;

function buildBanFilter(filter: string) {
  const now = new Date();
  if (filter === "banned") return { bannedAt: { not: null as any }, OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }] };
  if (filter === "muted") return { mutedAt: { not: null as any }, OR: [{ mutedUntil: null }, { mutedUntil: { gt: now } }] };
  if (filter === "bots") return { isBot: true };
  return undefined;
}

// GET /admin/users/audit — MUST be before /:id
adminUsersRouter.get("/audit", async (c) => {
  const userId = c.req.query("userId") || undefined;
  const action = c.req.query("action") || undefined;
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10));
  const limit = 50;
  const skip = (page - 1) * limit;

  const where = {
    ...(userId ? { userId } : {}),
    ...(action ? { action: action as any } : {}),
  };

  const [total, actions] = await Promise.all([
    prisma.moderationAction.count({ where }),
    prisma.moderationAction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  return c.json({ actions, total, page }, 200, { "Cache-Control": "no-store" });
});

adminUsersRouter.get("/", async (c) => {
  const search = c.req.query("search") || undefined;
  const filter = c.req.query("filter") ?? "all";
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10));
  const skip = (page - 1) * LIMIT;
  const now = new Date();
  const fifteenMin = new Date(Date.now() - 15 * 60_000);

  let where: any = buildBanFilter(filter) ?? {};
  if (filter === "online") {
    // users with a session updated in the last 15 minutes
    const recentSessions = await prisma.session.findMany({
      where: { lastSeenAt: { gt: fifteenMin } },
      select: { userId: true },
      distinct: ["userId"],
    });
    where = { id: { in: recentSessions.map((s) => s.userId) } };
  }
  if (search) {
    where = {
      ...where,
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: LIMIT,
      select: {
        id: true, name: true, email: true, isBot: true, createdAt: true,
        bannedAt: true, bannedUntil: true, banReason: true,
        mutedAt: true, mutedUntil: true, muteReason: true,
        _count: { select: { cities: true } },
      },
    }),
  ]);

  // Enrich with power and lastSeenAt
  const userIds = users.map((u) => u.id);
  const [cities, lastSessions] = await Promise.all([
    prisma.city.findMany({ where: { userId: { in: userIds } }, select: { userId: true, power: true } }),
    prisma.session.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _max: { lastSeenAt: true } }),
  ]);

  const powerByUser = new Map<string, number>();
  for (const c of cities) powerByUser.set(c.userId, (powerByUser.get(c.userId) ?? 0) + (c.power ?? 0));
  const lastSeenByUser = new Map(lastSessions.map((s) => [s.userId, s._max.lastSeenAt]));

  const result = users.map((u) => ({
    ...u,
    power: powerByUser.get(u.id) ?? 0,
    lastSeenAt: lastSeenByUser.get(u.id) ?? null,
    cityCount: u._count.cities,
    isBanned: !!u.bannedAt && (u.bannedUntil === null || u.bannedUntil > now),
    isMuted: !!u.mutedAt && (u.mutedUntil === null || u.mutedUntil > now),
  }));

  return c.json({ users: result, total, page }, 200, { "Cache-Control": "no-store" });
});

adminUsersRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const now = new Date();

  const [user, cities, sessions, recentChat, recentActions, blockCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, isBot: true, tutorialStep: true, createdAt: true, updatedAt: true,
        bannedAt: true, bannedUntil: true, banReason: true,
        mutedAt: true, mutedUntil: true, muteReason: true,
      },
    }),
    prisma.city.findMany({ where: { userId: id }, select: { id: true, name: true, worldId: true, power: true, posX: true, posY: true } }),
    prisma.session.findMany({ where: { userId: id }, select: { id: true, createdAt: true, lastSeenAt: true, expiresAt: true }, orderBy: { lastSeenAt: "desc" }, take: 10 }),
    prisma.chatMessage.findMany({ where: { senderUserId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.moderationAction.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.userBlock.count({ where: { blockerUserId: id } }),
  ]);

  if (!user) return c.json({ error: "User not found" }, 404);

  // Alliance membership (AllianceMember is keyed by userId)
  const allianceMember = await prisma.allianceMember.findUnique({
    where: { userId: id },
    include: { alliance: { select: { id: true, name: true } } },
  });

  return c.json({
    user: {
      ...user,
      isBanned: !!user.bannedAt && (user.bannedUntil === null || user.bannedUntil > now),
      isMuted: !!user.mutedAt && (user.mutedUntil === null || user.mutedUntil > now),
    },
    cities,
    alliance: allianceMember ? { id: allianceMember.alliance.id, name: allianceMember.alliance.name, role: allianceMember.role } : null,
    sessions,
    recentChat,
    recentActions,
    blockCount,
  }, 200, { "Cache-Control": "no-store" });
});

const BanSchema = z.object({ reason: z.string().min(1).max(500), durationHours: z.number().nullable() });
const MuteSchema = z.object({ reason: z.string().min(1).max(500), durationHours: z.number().nullable() });

adminUsersRouter.post("/:id/ban", zValidator("json", BanSchema), async (c) => {
  const id = c.req.param("id");
  const { reason, durationHours } = c.req.valid("json");
  await banUser(id, reason, durationHours);
  return c.json({ ok: true }, 200, { "Cache-Control": "no-store" });
});

adminUsersRouter.post("/:id/unban", async (c) => {
  const id = c.req.param("id");
  await unbanUser(id);
  return c.json({ ok: true }, 200, { "Cache-Control": "no-store" });
});

adminUsersRouter.post("/:id/mute", zValidator("json", MuteSchema), async (c) => {
  const id = c.req.param("id");
  const { reason, durationHours } = c.req.valid("json");
  await muteUser(id, reason, durationHours);
  return c.json({ ok: true }, 200, { "Cache-Control": "no-store" });
});

adminUsersRouter.post("/:id/unmute", async (c) => {
  const id = c.req.param("id");
  await unmuteUser(id);
  return c.json({ ok: true }, 200, { "Cache-Control": "no-store" });
});

adminUsersRouter.post("/:id/kick", async (c) => {
  const id = c.req.param("id");
  const deleted = await kickSessions(id);
  return c.json({ ok: true, deleted }, 200, { "Cache-Control": "no-store" });
});
