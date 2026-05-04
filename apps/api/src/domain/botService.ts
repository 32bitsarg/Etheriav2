import { prisma } from "@etheria/database";
import type { UnitType } from "@etheria/shared";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { createStarterCityForUser } from "./cityCreation.js";
import { getBotSimulationConfig, type BotSimulationConfig } from "./botConfigData.js";
import { botActionType, decideBotAction, type BotActionType, type BotDecision } from "./botDecisionEngine.js";
import {
  attackCityAction,
  CityActionError,
  startResearchAction,
  trainUnitsAction,
  upgradeBuildingAction,
} from "./cityActions.js";
import { appendBotErrorReport } from "./botErrorReports.js";
import { generateCityName, generatePlayerName } from "./nameGenerator.js";

type BotActionStatus = "SUCCESS" | "EXPECTED_BLOCKED" | "VALIDATION_ERROR" | "UNEXPECTED_ERROR";
const prismaAny = prisma as any;

function nextTickDate(config: BotSimulationConfig, jitterSeconds = 15) {
  const jitter = Math.floor(Math.random() * jitterSeconds * 1000);
  return new Date(Date.now() + config.tickSeconds * 1000 + jitter);
}

function classifyError(error: unknown): { status: BotActionStatus; errorKind: string; message: string; details: Record<string, unknown> } {
  if (error instanceof CityActionError) {
    const blockedBy = String(error.details.blockedBy ?? "");
    const status: BotActionStatus = blockedBy || error.status < 500 ? "EXPECTED_BLOCKED" : "VALIDATION_ERROR";
    return { status, errorKind: blockedBy || "validation", message: error.message, details: error.details };
  }
  return {
    status: "UNEXPECTED_ERROR",
    errorKind: "unexpected",
    message: error instanceof Error ? error.message : String(error),
    details: {},
  };
}

async function logAction(input: {
  botId: string;
  cityId: string;
  actionType: BotActionType;
  status: BotActionStatus;
  reason?: string;
  errorKind?: string;
  errorMessage?: string;
  payload?: unknown;
}) {
  await prismaAny.botActionLog.create({
    data: {
      id: crypto.randomUUID(),
      botId: input.botId,
      cityId: input.cityId,
      actionType: input.actionType,
      status: input.status,
      reason: input.reason,
      errorKind: input.errorKind,
      errorMessage: input.errorMessage,
      payload: input.payload as any,
    },
  });
}

export async function ensureBotPopulation(config = getBotSimulationConfig()) {
  const existing = await prismaAny.botPlayer.findMany({ orderBy: { createdAt: "asc" } });
  for (const bot of existing) {
    const user = await prismaAny.user.findUnique({ where: { id: bot.userId } });
    const city = await prismaAny.city.findUnique({ where: { id: bot.cityId } });
    if (user?.name?.startsWith("Bot ")) {
      await prismaAny.user.update({ where: { id: bot.userId }, data: { name: generatePlayerName(bot.userId) } });
    }
    if (city?.name?.startsWith("Bot ")) {
      await prismaAny.city.update({ where: { id: bot.cityId }, data: { name: generateCityName(bot.cityId) } });
    }
  }
  if (existing.length >= config.targetCount) return existing;

  const created = [...existing];
  for (let index = existing.length; index < config.targetCount; index++) {
    const profile = config.profiles[index % config.profiles.length];
    const userId = crypto.randomUUID();
    const name = generatePlayerName(userId);
    await prismaAny.user.create({
      data: {
        id: userId,
        email: `bot_${index + 1}_${Date.now()}@etheria.game`,
        name,
        isBot: true,
        botProfile: profile,
      },
    });

    const city = await createStarterCityForUser({ userId, cityName: generateCityName(userId) });
    if ("error" in city) {
      await prismaAny.user.delete({ where: { id: userId } }).catch(() => null);
      throw new Error(city.error);
    }

    const bot = await prismaAny.botPlayer.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        cityId: city.cityId,
        profile,
        status: "ACTIVE",
        state: {},
        nextTickAt: nextTickDate(config, 5),
      },
    });
    created.push(bot);
  }

  return created;
}

async function loadBotSnapshot(bot: { cityId: string; userId: string; state: any }) {
  const [cityRes, buildingsRes, unitsRes, cityTechsRes, buildQueuesRes, trainingQueuesRes, researchQueuesRes, battlesRes, targetsRes] = await Promise.all([
    db.from(COLLECTIONS.CITIES).eq("id", bot.cityId).getFirst() as any,
    db.from(COLLECTIONS.BUILDINGS).eq("cityId", bot.cityId).get() as any,
    db.from(COLLECTIONS.UNITS).eq("cityId", bot.cityId).get() as any,
    db.from(COLLECTIONS.CITY_TECHS).eq("cityId", bot.cityId).get() as any,
    db.from(COLLECTIONS.BUILD_QUEUES).eq("cityId", bot.cityId).eq("isComplete", false).get() as any,
    db.from(COLLECTIONS.TRAINING_QUEUES).eq("cityId", bot.cityId).eq("isComplete", false).get() as any,
    db.from(COLLECTIONS.RESEARCH_QUEUES).eq("cityId", bot.cityId).eq("isComplete", false).get() as any,
    db.from(COLLECTIONS.BATTLES).eq("attackerCityId", bot.cityId).get() as any,
    db.from(COLLECTIONS.CITIES).limit(100).get() as any,
  ]);

  if (!cityRes.data) throw new Error(`Bot city not found: ${bot.cityId}`);
  const activeOutgoingBattles = (battlesRes.data ?? []).filter((battle: any) => battle.status === "MARCHING" || battle.status === "RETURNING");

  return {
    city: {
      ...cityRes.data,
      resources: {
        gold: cityRes.data.gold,
        wood: cityRes.data.wood,
        stone: cityRes.data.stone,
        food: cityRes.data.food,
        gems: cityRes.data.gems ?? 0,
      },
    },
    buildings: buildingsRes.data ?? [],
    units: unitsRes.data ?? [],
    cityTechs: cityTechsRes.data ?? [],
    activeBuildQueues: buildQueuesRes.data ?? [],
    activeTrainingQueues: trainingQueuesRes.data ?? [],
    activeResearch: researchQueuesRes.data?.[0] ?? null,
    activeOutgoingBattles,
    targets: (targetsRes.data ?? []).filter((city: any) => city.id !== bot.cityId),
    state: bot.state ?? {},
  };
}

async function executeDecision(bot: { id: string; userId: string; cityId: string; state: any }, decision: BotDecision) {
  const actor = { type: "bot" as const, botId: bot.id, userId: bot.userId };
  if (decision.type === "UPGRADE_BUILDING") {
    return upgradeBuildingAction({ cityId: bot.cityId, buildingId: decision.payload.buildingId, actor });
  }
  if (decision.type === "TRAIN_UNITS") {
    return trainUnitsAction({ cityId: bot.cityId, unitType: decision.payload.unitType, count: decision.payload.count, actor });
  }
  if (decision.type === "START_RESEARCH") {
    return startResearchAction({ cityId: bot.cityId, techId: decision.payload.techId, actor });
  }
  if (decision.type === "ATTACK_CITY") {
    return attackCityAction({
      attackerCityId: bot.cityId,
      targetCityId: decision.payload.targetCityId,
      units: decision.payload.units as Array<{ type: UnitType; count: number }>,
      actor,
    });
  }
  return { idle: true };
}

function updateStateAfterDecision(state: any, decision: BotDecision, now: Date) {
  if (decision.type !== "ATTACK_CITY") return state ?? {};
  const current = state ?? {};
  return {
    ...current,
    lastAttackAt: now.toISOString(),
    targetCooldowns: {
      ...(current.targetCooldowns ?? {}),
      [decision.payload.targetCityId]: now.toISOString(),
    },
  };
}

export async function processDueBots(config = getBotSimulationConfig()) {
  if (!config.enabled) return { processed: 0, errors: 0 };

  await ensureBotPopulation(config);
  const now = new Date();
  const bots = await prismaAny.botPlayer.findMany({
    where: { status: "ACTIVE", nextTickAt: { lte: now } },
    orderBy: { nextTickAt: "asc" },
    take: config.maxBotsPerTick,
  });

  let errors = 0;
  for (const bot of bots) {
    const snapshot = await loadBotSnapshot(bot);
    const decision = decideBotAction(snapshot, bot.profile, config, now);
    const actionType = botActionType(decision);

    try {
      const result = await executeDecision(bot, decision);
      const nextState = updateStateAfterDecision(bot.state, decision, now);
      await logAction({
        botId: bot.id,
        cityId: bot.cityId,
        actionType,
        status: "SUCCESS",
        reason: decision.reason,
        payload: { decision: decision.payload, result },
      });
      await prismaAny.botPlayer.update({
        where: { id: bot.id },
        data: { state: nextState, lastTickAt: now, nextTickAt: nextTickDate(config) },
      });
    } catch (error) {
      errors++;
      const classified = classifyError(error);
      await logAction({
        botId: bot.id,
        cityId: bot.cityId,
        actionType,
        status: classified.status,
        reason: decision.reason,
        errorKind: classified.errorKind,
        errorMessage: classified.message,
        payload: { decision: decision.payload, details: classified.details },
      });
      if (classified.status === "VALIDATION_ERROR" || classified.status === "UNEXPECTED_ERROR") {
        await appendBotErrorReport({
          botId: bot.id,
          cityId: bot.cityId,
          actionType,
          status: classified.status,
          reason: decision.reason,
          errorKind: classified.errorKind,
          errorMessage: classified.message,
          payload: { decision: decision.payload, details: classified.details },
          stack: error instanceof Error ? error.stack : undefined,
        }).catch((reportError) => {
          console.error("Failed to write bot error report:", reportError);
        });
      }
      await prismaAny.botPlayer.update({
        where: { id: bot.id },
        data: {
          status: classified.status === "UNEXPECTED_ERROR" ? "ERROR" : "ACTIVE",
          lastTickAt: now,
          nextTickAt: nextTickDate(config),
          state: bot.state ?? {},
        },
      });
    }
  }

  return { processed: bots.length, errors };
}

export async function writeBotMetricsSnapshot(windowMinutes = 15) {
  const windowEndedAt = new Date();
  const windowStartedAt = new Date(windowEndedAt.getTime() - windowMinutes * 60_000);
  const [logs, bots] = await Promise.all([
    prismaAny.botActionLog.findMany({ where: { createdAt: { gte: windowStartedAt, lte: windowEndedAt } } }),
    prismaAny.botPlayer.findMany({ select: { cityId: true } }),
  ]);
  const botCityIds = new Set<string>(bots.map((bot: any) => bot.cityId));
  const attemptedByType: Record<string, number> = {};
  for (const log of logs as any[]) attemptedByType[log.actionType] = (attemptedByType[log.actionType] ?? 0) + 1;

  const [resolvedBattles, completedResearch] = await Promise.all([
    prismaAny.battle.count({
      where: {
        attackerCityId: { in: [...botCityIds] },
        resolvedAt: { gte: windowStartedAt, lte: windowEndedAt },
      },
    }),
    prismaAny.cityTech.count({
      where: {
        cityId: { in: [...botCityIds] },
        unlockedAt: { gte: windowStartedAt, lte: windowEndedAt },
      },
    }),
  ]);

  await prismaAny.botMetricsSnapshot.create({
    data: {
      id: crypto.randomUUID(),
      windowStartedAt,
      windowEndedAt,
      attemptedByType,
      successfulActions: (logs as any[]).filter((log) => log.status === "SUCCESS").length,
      expectedBlocks: (logs as any[]).filter((log) => log.status === "EXPECTED_BLOCKED").length,
      validationErrors: (logs as any[]).filter((log) => log.status === "VALIDATION_ERROR").length,
      unexpectedErrors: (logs as any[]).filter((log) => log.status === "UNEXPECTED_ERROR").length,
      blockedByQueue: (logs as any[]).filter((log) => log.errorKind === "queue").length,
      blockedByResources: (logs as any[]).filter((log) => log.errorKind === "resources").length,
      battlesCreated: (logs as any[]).filter((log) => log.actionType === "ATTACK_CITY" && log.status === "SUCCESS").length,
      battlesResolved: resolvedBattles,
      researchStarted: (logs as any[]).filter((log) => log.actionType === "START_RESEARCH" && log.status === "SUCCESS").length,
      researchCompleted: completedResearch,
    },
  });

  console.log(`[bots] metrics ${JSON.stringify({
    attemptedByType,
    successful: (logs as any[]).filter((log) => log.status === "SUCCESS").length,
    expectedBlocks: (logs as any[]).filter((log) => log.status === "EXPECTED_BLOCKED").length,
    unexpectedErrors: (logs as any[]).filter((log) => log.status === "UNEXPECTED_ERROR").length,
  })}`);
}
