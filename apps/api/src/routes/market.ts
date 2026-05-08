import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AcceptMarketOfferRequestSchema, CreateMarketOfferRequestSchema } from "@etheria/shared";
import { requireMatecitoAuth } from "../infrastructure/authMiddleware.js";
import { acceptMarketOffer, createMarketOffer, listMarketOffers } from "../domain/marketOffers.js";

const marketRouter = new Hono();

marketRouter.get("/offers", async (c) => {
  return c.json({ offers: await listMarketOffers() });
});

marketRouter.post("/offers", requireMatecitoAuth(), zValidator("json", CreateMarketOfferRequestSchema), async (c) => {
  const result = await createMarketOffer(c.get("userId"), c.req.valid("json"));
  if ("error" in result) return c.json({ error: result.error }, result.status as any);
  return c.json(result);
});

marketRouter.post("/offers/:id/accept", requireMatecitoAuth(), zValidator("json", AcceptMarketOfferRequestSchema), async (c) => {
  const result = await acceptMarketOffer(c.get("userId"), c.req.param("id"), c.req.valid("json").cityId);
  if ("error" in result) return c.json({ error: result.error }, result.status as any);
  return c.json(result);
});

export { marketRouter };
