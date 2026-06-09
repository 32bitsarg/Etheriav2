import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { listBots, createBotRecord, updateBotRecord, deleteBotRecord } from "../domain/botRepository.js";
import { processBotWorkerTick } from "../workers/botWorker.js";
import { getBotSimulationConfig } from "../domain/botConfigData.js";
import { generatePlayerName, generateCityName } from "../domain/nameGenerator.js";
import { createStarterCityForUser } from "../domain/cityCreation.js";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { prisma } from "@etheria/database";
import { requireAdmin } from "../infrastructure/adminMiddleware.js";

const genId = () => crypto.randomUUID();

export const adminBotsRouter = new Hono();

adminBotsRouter.use("*", requireAdmin());

adminBotsRouter.get("/", async (c) => {


  const worldId = c.req.query("worldId") ?? undefined;
  const bots = await listBots(worldId);
  return c.json({ bots });
});

const CreateBotSchema = z.object({
  worldId: z.string().optional().default("default"),
  profile: z.enum(["ECONOMIST", "MILITARIST", "TECH_RUSHER", "BALANCED"]).optional().default("BALANCED"),
});

adminBotsRouter.post("/", zValidator("json", CreateBotSchema), async (c) => {


  const { worldId, profile } = c.req.valid("json");

  const userId = crypto.randomUUID();
  const name = generatePlayerName(userId);
  const cityName = generateCityName(userId);
  const now = new Date().toISOString();

  await db.from(COLLECTIONS.USERS).insert({
    id: userId,
    email: `bot_${genId().slice(0, 8)}@etheria.game`,
    name,
    isBot: true,
    botProfile: profile,
    createdAt: now,
    updatedAt: now,
  });

  const city = await createStarterCityForUser({ userId, cityName, worldId });
  if ("error" in city) return c.json({ error: city.error }, 503);

  const config = getBotSimulationConfig();
  function nextTickDate(jitterSeconds = 15) {
    const jitter = Math.floor(Math.random() * jitterSeconds * 1000);
    return new Date(Date.now() + config.tickSeconds * 1000 + jitter);
  }

  const bot = await createBotRecord({
    id: genId(),
    userId,
    cityId: city.cityId,
    worldId,
    profile,
    status: "ACTIVE",
    state: {},
    createdAt: now,
    lastTickAt: null,
    nextTickAt: nextTickDate(5).toISOString(),
  });

  return c.json({ bot, cityId: city.cityId });
});

adminBotsRouter.delete("/:id", async (c) => {


  const botId = c.req.param("id");
  const allBots = await listBots();
  const bot = allBots.find((b: any) => b.id === botId);
  if (!bot) return c.json({ error: "Bot not found" }, 404);

  try {
    await prisma.city.deleteMany({ where: { id: bot.cityId } });
    await prisma.user.deleteMany({ where: { id: bot.userId } });
  } catch {
    // cleanup best-effort
  }

  await deleteBotRecord(botId);
  return c.json({ deleted: true });
});

adminBotsRouter.patch("/:id", zValidator("json", z.object({ status: z.enum(["ACTIVE", "PAUSED"]) })), async (c) => {


  const botId = c.req.param("id");
  const { status } = c.req.valid("json");
  await updateBotRecord(botId, { status });
  return c.json({ botId, status });
});

adminBotsRouter.post("/tick", async (c) => {


  const result = await processBotWorkerTick();
  return c.json(result);
});
