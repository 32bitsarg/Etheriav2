import { Hono } from "hono";
import { requireMatecitoAuth } from "../infrastructure/authMiddleware.js";
import { listGameReports, markGameReportRead } from "../domain/reports.js";

const reportsRouter = new Hono();

reportsRouter.get("/", requireMatecitoAuth(), async (c) => {
  const userId = c.get("userId");
  const type = c.req.query("type") ?? null;
  const reports = await listGameReports(userId, type);
  return c.json({ reports, unreadCount: reports.filter((report: any) => !report.readAt).length });
});

reportsRouter.post("/:id/read", requireMatecitoAuth(), async (c) => {
  const ok = await markGameReportRead(c.get("userId"), c.req.param("id"));
  if (!ok) return c.json({ error: "Report not found" }, 404);
  return c.json({ success: true });
});

export { reportsRouter };
