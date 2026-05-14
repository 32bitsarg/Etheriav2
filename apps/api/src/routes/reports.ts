import { Hono } from "hono";
import { prisma } from "@etheria/database";
import { requireMatecitoAuth } from "../infrastructure/authMiddleware.js";

const reportsRouter = new Hono();

reportsRouter.get("/", requireMatecitoAuth(), async (c) => {
  const userId = c.get("userId");
  const type = c.req.query("type") ?? null;
  const where = { userId, ...(type ? { type } : {}) };
  const [reports, unreadCount] = await Promise.all([
    prisma.gameReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.gameReport.count({ where: { ...where, readAt: null } }),
  ]);
  return c.json({ reports, unreadCount });
});

reportsRouter.post("/:id/read", requireMatecitoAuth(), async (c) => {
  const result = await prisma.gameReport.updateMany({
    where: { id: c.req.param("id"), userId: c.get("userId") },
    data: { readAt: new Date() },
  });
  if (result.count === 0) return c.json({ error: "Report not found" }, 404);
  return c.json({ success: true });
});

export { reportsRouter };
