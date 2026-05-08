import { Hono } from "hono";
import { requireMatecitoAuth } from "../infrastructure/authMiddleware.js";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { advanceQuest, claimQuest, ensurePlayerQuests, listPlayerQuests } from "../domain/quests.js";

const questsRouter = new Hono();

questsRouter.get("/", requireMatecitoAuth(), async (c) => {
  const userId = c.get("userId");
  const cityId = c.req.query("cityId") ?? null;
  if (cityId) {
    const cityRes = await db.from(COLLECTIONS.CITIES).eq("id", cityId).getFirst() as any;
    if (!cityRes.data || cityRes.data.userId !== userId) return c.json({ error: "City not found" }, 404);
    await ensurePlayerQuests(cityRes.data);
  }
  return c.json({ quests: await listPlayerQuests(userId, cityId) });
});

questsRouter.post("/:id/claim", requireMatecitoAuth(), async (c) => {
  const result = await claimQuest(c.get("userId"), c.req.param("id"));
  if ("error" in result) return c.json({ error: result.error }, result.status as any);
  return c.json(result);
});

questsRouter.post("/events/open-map", requireMatecitoAuth(), async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));
  const cityId = typeof body.cityId === "string" ? body.cityId : "";
  const cityRes = await db.from(COLLECTIONS.CITIES).eq("id", cityId).getFirst() as any;
  if (!cityRes.data || cityRes.data.userId !== userId) return c.json({ error: "City not found" }, 404);
  await advanceQuest(cityId, "OPEN_MAP", 1);
  return c.json({ success: true });
});

export { questsRouter };
