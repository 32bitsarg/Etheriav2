import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Hono } from "hono";
import { z } from "zod";
import { getPerfSnapshot } from "../infrastructure/perfMetrics.js";
import { requireAdmin } from "../infrastructure/adminMiddleware.js";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { prisma } from "@etheria/database";
import { LOCAL_WORLD_CONFIG } from "../domain/worldConfigData.js";
import { ensureBotPopulation } from "../domain/botService.js";
import { invalidateWorldTerrain, ensureWorldTerrain } from "../domain/worldTerrainRuntime.js";
import { repairWorldEntityPlacements } from "../domain/worldTerrainRepair.js";

const execFileAsync = promisify(execFile);

const SERVICE_ACTIONS = {
  api: {
    logs: "logs-api",
    restart: "restart-api",
    rebuild: "rebuild-api",
  },
  web: {
    logs: "logs-web",
    restart: "restart-web",
    rebuild: "rebuild-web",
  },
  caddy: {
    logs: "logs-caddy",
  },
  worker: {
    logs: "logs-worker",
    restart: "restart-worker",
  },
} as const;

const LOG_LINES = new Set(["100", "200", "500"]);
const HELPER_PATH = process.env.ADMIN_OPS_HELPER_PATH ?? "/opt/etheria/adminctl.sh";

type OpsService = keyof typeof SERVICE_ACTIONS;

async function runAdminHelper(action: string, args: string[] = []) {
  const { stdout, stderr } = await execFileAsync("sudo", ["-n", HELPER_PATH, action, ...args], {
    timeout: 120_000,
    maxBuffer: 1024 * 1024,
  });

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };
}

function isOpsService(value: string): value is OpsService {
  return value === "api" || value === "web" || value === "caddy" || value === "worker";
}

export const adminOpsRouter = new Hono();

adminOpsRouter.use("*", requireAdmin(), async (c, next) => {
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");
  await next();
});

adminOpsRouter.get("/status", async (c) => {
  try {
    const result = await runAdminHelper("status");
    return c.json({ ok: true, ...result });
  } catch (error) {
    return c.json({ ok: false, error: error instanceof Error ? error.message : "Status failed" }, 500);
  }
});

adminOpsRouter.get("/logs", async (c) => {
  const service = c.req.query("service") ?? "";
  const lines = c.req.query("lines") ?? "200";

  if (!isOpsService(service)) return c.json({ error: "Invalid service" }, 400);
  if (!LOG_LINES.has(lines)) return c.json({ error: "Invalid lines" }, 400);

  const action = SERVICE_ACTIONS[service].logs;
  try {
    const result = await runAdminHelper(action, [lines]);
    return c.json({ ok: true, service, lines: Number(lines), ...result });
  } catch (error) {
    return c.json({ ok: false, error: error instanceof Error ? error.message : "Logs failed" }, 500);
  }
});

adminOpsRouter.get("/perf", (c) => {
  return c.json({ ok: true, ...getPerfSnapshot() });
});

const ActionBodySchema = z.object({
  service: z.enum(["api", "web", "worker"]),
});

adminOpsRouter.post("/restart", async (c) => {
  const body = ActionBodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: "Invalid service" }, 400);

  try {
    const result = await runAdminHelper(SERVICE_ACTIONS[body.data.service].restart);
    return c.json({ ok: true, service: body.data.service, ...result });
  } catch (error) {
    return c.json({ ok: false, error: error instanceof Error ? error.message : "Restart failed" }, 500);
  }
});

adminOpsRouter.post("/rebuild", async (c) => {
  const body = ActionBodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: "Invalid service" }, 400);

  try {
    if (body.data.service === "worker") return c.json({ error: "Worker rebuild is not supported" }, 400);
    const result = await runAdminHelper(SERVICE_ACTIONS[body.data.service].rebuild);
    return c.json({ ok: true, service: body.data.service, ...result });
  } catch (error) {
    return c.json({ ok: false, error: error instanceof Error ? error.message : "Rebuild failed" }, 500);
  }
});

adminOpsRouter.post("/deploy", async (c) => {
  try {
    const result = await runAdminHelper("deploy");
    return c.json({ ok: true, ...result });
  } catch (error) {
    return c.json({ ok: false, error: error instanceof Error ? error.message : "Deploy failed" }, 500);
  }
});

// Full world reset: wipes all game data and re-seeds bots
adminOpsRouter.post("/reset-world", async (c) => {
  const log: string[] = [];

  try {
    // 1. Update default world config in Prisma with procedural map settings
    const world = await prisma.world.findFirst({ orderBy: { createdAt: "asc" } });
    if (world) {
      const existing = typeof world.config === "string" ? JSON.parse(world.config) : (world.config as any) ?? {};
      const newConfig = {
        ...existing,
        map: {
          ...LOCAL_WORLD_CONFIG.map,
          ...(existing.map ?? {}),
          width: LOCAL_WORLD_CONFIG.map.width,
          height: LOCAL_WORLD_CONFIG.map.height,
          cameraMinZoom: LOCAL_WORLD_CONFIG.map.cameraMinZoom,
          cameraMaxZoom: LOCAL_WORLD_CONFIG.map.cameraMaxZoom,
          cameraInitialZoom: LOCAL_WORLD_CONFIG.map.cameraInitialZoom,
          terrainCols: LOCAL_WORLD_CONFIG.map.terrainCols,
          terrainRows: LOCAL_WORLD_CONFIG.map.terrainRows,
          tileSize: LOCAL_WORLD_CONFIG.map.tileSize,
        },
        spawn: LOCAL_WORLD_CONFIG.spawn,
        updatedAt: new Date().toISOString(),
      };
      await prisma.world.update({ where: { id: world.id }, data: { config: newConfig, playerCount: 0 } });
      log.push(`Updated world config: ${world.id}`);
    } else {
      log.push("No world found — skipping config update");
    }

    // 2. Invalidate and regenerate terrain cache
    invalidateWorldTerrain();
    log.push("Invalidated terrain cache");

    // 3. Wipe all Prisma game entities (order matters for FK constraints)
    const prismaDeletes = await Promise.allSettled([
      prisma.espionageMission.deleteMany(),
      prisma.cityConquestProgress.deleteMany(),
      prisma.rallyParticipant.deleteMany(),
      prisma.rallyAttack.deleteMany(),
      prisma.playerAchievement.deleteMany(),
      prisma.playerQuest.deleteMany(),
      prisma.dailyQuest.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.activityFeed.deleteMany(),
      prisma.gameReport.deleteMany(),
      prisma.mailMessage.deleteMany(),
      prisma.tradeCaravan.deleteMany(),
      prisma.barbarianAttackAlert.deleteMany(),
      prisma.barbarianAttack.deleteMany(),
      prisma.barbarianBattle.deleteMany(),
      prisma.barbarianArmy.deleteMany(),
      prisma.barbarianCamp.deleteMany(),
      prisma.worldSeasonState.deleteMany(),
      prisma.allianceDiplomacyEvent.deleteMany(),
      prisma.allianceDiplomacy.deleteMany(),
      prisma.allianceEffect.deleteMany(),
      prisma.chatMessage.deleteMany(),
    ]);

    // Delete alliance members before alliances
    await prisma.allianceMember.deleteMany();
    await prisma.alliance.deleteMany();
    log.push("Deleted alliances");

    // Delete city entities before cities
    await Promise.allSettled([
      prisma.battleReport.deleteMany(),
      prisma.battle.deleteMany(),
      prisma.buildQueue.deleteMany(),
      prisma.trainingQueue.deleteMany(),
      prisma.researchQueue.deleteMany(),
      prisma.cityTech.deleteMany(),
      prisma.cityUnit.deleteMany(),
      prisma.building.deleteMany(),
    ]);
    log.push("Deleted city sub-entities");

    await prisma.city.deleteMany();
    log.push("Deleted cities");

    // 4. Wipe MatecitoDB collections
    const matecitoCollections = [
      COLLECTIONS.CITIES,
      COLLECTIONS.BUILDINGS,
      COLLECTIONS.UNITS,
      COLLECTIONS.BUILD_QUEUES,
      COLLECTIONS.TRAINING_QUEUES,
      COLLECTIONS.RESEARCH_QUEUES,
      COLLECTIONS.CITY_TECHS,
      COLLECTIONS.BATTLES,
      COLLECTIONS.BATTLE_REPORTS,
      COLLECTIONS.ALLIANCES,
      COLLECTIONS.ALLIANCE_MEMBERS,
      COLLECTIONS.ALLIANCE_DIPLOMACY,
      COLLECTIONS.ALLIANCE_DIPLOMACY_EVENTS,
      COLLECTIONS.ALLIANCE_EFFECTS,
      COLLECTIONS.ALLIANCE_OBJECTIVES,
      COLLECTIONS.ALLIANCE_OBJECTIVE_CONTRIBUTIONS,
      COLLECTIONS.CHAT_MESSAGES,
      COLLECTIONS.MAIL_MESSAGES,
      COLLECTIONS.WORLD_SEASON_STATE,
      COLLECTIONS.BARBARIAN_CAMPS,
      COLLECTIONS.BARBARIAN_ARMIES,
      COLLECTIONS.BARBARIAN_BATTLES,
      COLLECTIONS.BARBARIAN_ATTACKS,
      COLLECTIONS.BARBARIAN_ATTACK_ALERTS,
      COLLECTIONS.TRADE_CARAVANS,
      COLLECTIONS.MARKET_OFFERS,
      COLLECTIONS.GAME_REPORTS,
      COLLECTIONS.PLAYER_QUESTS,
      COLLECTIONS.DAILY_QUESTS,
      COLLECTIONS.RALLY_ATTACKS,
      COLLECTIONS.RALLY_PARTICIPANTS,
      COLLECTIONS.CITY_CONQUEST_PROGRESS,
      COLLECTIONS.ESPIONAGE_MISSIONS,
      COLLECTIONS.PLAYER_ACHIEVEMENTS,
      COLLECTIONS.ACTIVITY_FEED,
      COLLECTIONS.NOTIFICATIONS,
      COLLECTIONS.WONDER,
      COLLECTIONS.BOT_PLAYERS,
      COLLECTIONS.BOT_ACTION_LOGS,
      COLLECTIONS.BOT_METRICS_SNAPSHOTS,
    ];

    for (const col of matecitoCollections) {
      try {
        const docs = await db.from(col).getAll();
        for (const doc of docs) {
          if (doc?.id) await db.from(col).eq("id", doc.id).delete().execute();
        }
        log.push(`Wiped MatecitoDB: ${col} (${docs.length})`);
      } catch (e) {
        log.push(`Skipped MatecitoDB: ${col} — ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 5. Delete bot users from Prisma (they get re-created by ensureBotPopulation)
    await prisma.botActionLog.deleteMany();
    await prisma.botMetricsSnapshot.deleteMany();
    await prisma.botPlayer.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: "@etheria.game" } } });
    log.push("Deleted bots from Prisma");

    // 6. Regenerate terrain so spawns land on valid tiles
    try {
      await ensureWorldTerrain();
      log.push("Regenerated terrain");
    } catch (e) {
      log.push(`Terrain regen warning: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 7. Re-populate bots
    try {
      await ensureBotPopulation();
      log.push("Re-seeded bot population");
    } catch (e) {
      log.push(`Bot population warning: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 8. Repair any placements that ended up on invalid terrain
    try {
      const repairResult = await repairWorldEntityPlacements();
      log.push(`Terrain repair: ${JSON.stringify(repairResult)}`);
    } catch (e) {
      log.push(`Repair warning: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Log prisma delete results
    const failed = prismaDeletes.filter(r => r.status === "rejected");
    if (failed.length) log.push(`${failed.length} Prisma delete(s) failed (FK or empty table — usually OK)`);

    return c.json({ ok: true, log });
  } catch (error) {
    return c.json({ ok: false, error: error instanceof Error ? error.message : String(error), log }, 500);
  }
});
