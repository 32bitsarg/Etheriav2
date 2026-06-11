import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "@etheria/database";
import { requireAuth, type AuthContext } from "../infrastructure/authMiddleware.js";

const genId = () => crypto.randomUUID();

export const blocksRouter = new Hono<{ Variables: AuthContext }>();
blocksRouter.use("*", requireAuth());

blocksRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const blocks = await prisma.userBlock.findMany({
    where: { blockerUserId: userId },
    include: { blocked: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ blocks: blocks.map((b) => ({ blockedUserId: b.blockedUserId, blockedName: b.blocked.name, createdAt: b.createdAt })) });
});

blocksRouter.post("/", zValidator("json", z.object({ userId: z.string().min(1) })), async (c) => {
  const blockerId = c.get("userId");
  const { userId: blockedId } = c.req.valid("json");

  if (blockerId === blockedId) return c.json({ error: "Cannot block yourself" }, 400);

  await prisma.userBlock.upsert({
    where: { blockerUserId_blockedUserId: { blockerUserId: blockerId, blockedUserId: blockedId } },
    create: { id: genId(), blockerUserId: blockerId, blockedUserId: blockedId },
    update: {},
  });

  return c.json({ ok: true });
});

blocksRouter.delete("/:userId", async (c) => {
  const blockerId = c.get("userId");
  const blockedId = c.req.param("userId");
  await prisma.userBlock.deleteMany({ where: { blockerUserId: blockerId, blockedUserId: blockedId } });
  return c.json({ ok: true });
});
