import { Hono } from "hono";
import { prisma } from "@etheria/database";
import { requireAdmin } from "../infrastructure/adminMiddleware.js";
import { deleteChatMessageWithAudit } from "../domain/moderationService.js";

export const adminChatRouter = new Hono();
adminChatRouter.use("*", requireAdmin());

adminChatRouter.get("/messages", async (c) => {
  const channel = c.req.query("channel") || undefined;
  const worldId = c.req.query("worldId") || undefined;
  const senderUserId = c.req.query("senderUserId") || undefined;
  const q = c.req.query("q") || undefined;
  const limit = Math.min(100, parseInt(c.req.query("limit") ?? "50", 10));
  const before = c.req.query("before") ? new Date(c.req.query("before")!) : undefined;

  const where: any = {};
  if (channel) where.channel = channel;
  if (worldId) where.worldId = worldId;
  if (senderUserId) where.senderUserId = senderUserId;
  if (q) where.message = { contains: q, mode: "insensitive" };
  if (before) where.createdAt = { lt: before };

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = messages.length > limit;
  return c.json({ messages: messages.slice(0, limit), hasMore }, 200, { "Cache-Control": "no-store" });
});

adminChatRouter.delete("/messages/:id", async (c) => {
  const id = c.req.param("id");
  const message = await prisma.chatMessage.findUnique({ where: { id } });
  if (!message) return c.json({ error: "Message not found" }, 404);
  await deleteChatMessageWithAudit(id, message.senderUserId, message as any);
  return c.json({ ok: true }, 200, { "Cache-Control": "no-store" });
});
