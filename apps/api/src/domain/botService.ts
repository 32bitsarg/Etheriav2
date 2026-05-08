import type { ChatChannel } from "@etheria/shared";
import type { UnitType } from "@etheria/shared";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { mergeRecordByLogicalId } from "../infrastructure/matecitoRecord.js";
import { createStarterCityForUser } from "./cityCreation.js";
import { getBotSimulationConfig, type BotSimulationConfig } from "./botConfigData.js";
import { botActionType, decideBotAction, type BotActionType, type BotDecision } from "./botDecisionEngine.js";
import { createBotRecord, listBots, listDueBots, listRecentBotLogs, logBotAction, updateBotRecord, writeBotMetrics } from "./botRepository.js";
import {
  attackCityAction,
  CityActionError,
  startResearchAction,
  trainUnitsAction,
  upgradeBuildingAction,
  attackBarbarianCampAction,
} from "./cityActions.js";
import { sendResourcesAction } from "./tradeActions.js";
import { appendBotErrorReport } from "./botErrorReports.js";
import { generateCityName, generatePlayerName } from "./nameGenerator.js";
import { createAllianceForUser, joinAlliance } from "./alliances.js";
import { createChatMessage } from "./chat.js";
import { sendMailMessage } from "./mail.js";

type BotActionStatus = "SUCCESS" | "EXPECTED_BLOCKED" | "VALIDATION_ERROR" | "UNEXPECTED_ERROR";

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
  await logBotAction(input);
}

export async function ensureBotPopulation(config = getBotSimulationConfig()) {
  const existing = await listBots();
  for (const bot of existing) {
    const [userRes, cityRes] = await Promise.all([
      db.from(COLLECTIONS.USERS).eq("id", bot.userId).getFirst() as any,
      db.from(COLLECTIONS.CITIES).eq("id", bot.cityId).getFirst() as any,
    ]);
    const user = userRes.data;
    const city = cityRes.data;
    if (user?.name?.startsWith("Bot ")) {
      await mergeRecordByLogicalId(COLLECTIONS.USERS, bot.userId, { name: generatePlayerName(bot.userId), updatedAt: new Date().toISOString() });
    }
    if (city?.name?.startsWith("Bot ")) {
      await mergeRecordByLogicalId(COLLECTIONS.CITIES, bot.cityId, { name: generateCityName(bot.cityId) });
    }
  }
  if (existing.length >= config.targetCount) return existing;

  const created = [...existing];
  for (let index = existing.length; index < config.targetCount; index++) {
    const profile = config.profiles[index % config.profiles.length];
    const userId = crypto.randomUUID();
    const name = generatePlayerName(userId);
    const now = new Date().toISOString();
    await db.from(COLLECTIONS.USERS).insert({
      id: userId,
      email: `bot_${index + 1}_${Date.now()}@etheria.game`,
      name,
      isBot: true,
      botProfile: profile,
      createdAt: now,
      updatedAt: now,
    });

    const city = await createStarterCityForUser({ userId, cityName: generateCityName(userId) });
    if ("error" in city) {
      throw new Error(city.error);
    }

    const bot = await createBotRecord({
      id: crypto.randomUUID(),
      userId,
      cityId: city.cityId,
      profile,
      status: "ACTIVE",
      state: {},
      createdAt: now,
      lastTickAt: null,
      nextTickAt: nextTickDate(config, 5).toISOString(),
    });
    created.push(bot);
  }

  return created;
}

async function loadBotSnapshot(bot: { cityId: string; userId: string; state: any }, config: BotSimulationConfig) {
  const now = new Date();
  const protectionCutoff = new Date(now.getTime() - config.newPlayerProtectionHours * 60 * 60 * 1000);
  const globalCooldownCutoff = new Date(now.getTime() - config.globalTargetCooldownMinutes * 60 * 1000);

  const [cityRes, buildingsRes, unitsRes, cityTechsRes, buildQueuesRes, trainingQueuesRes, researchQueuesRes, battlesRes, targetsRes, barbarianCampsRes, recentGlobalBattlesRes, seasonRes, membershipRes, alliancesRes] = await Promise.all([
    db.from(COLLECTIONS.CITIES).eq("id", bot.cityId).getFirst() as any,
    db.from(COLLECTIONS.BUILDINGS).eq("cityId", bot.cityId).get() as any,
    db.from(COLLECTIONS.UNITS).eq("cityId", bot.cityId).get() as any,
    db.from(COLLECTIONS.CITY_TECHS).eq("cityId", bot.cityId).get() as any,
    db.from(COLLECTIONS.BUILD_QUEUES).eq("cityId", bot.cityId).eq("isComplete", false).get() as any,
    db.from(COLLECTIONS.TRAINING_QUEUES).eq("cityId", bot.cityId).eq("isComplete", false).get() as any,
    db.from(COLLECTIONS.RESEARCH_QUEUES).eq("cityId", bot.cityId).eq("isComplete", false).get() as any,
    db.from(COLLECTIONS.BATTLES).eq("attackerCityId", bot.cityId).get() as any,
    db.from(COLLECTIONS.CITIES).limit(200).get() as any,
    db.from(COLLECTIONS.BARBARIAN_CAMPS).eq("status", "ACTIVE").get() as any,
    db.from(COLLECTIONS.BATTLES).get() as any, 
    db.from(COLLECTIONS.WORLD_SEASON_STATE).getFirst() as any,
    db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq("userId", bot.userId).getFirst() as any,
    db.from(COLLECTIONS.ALLIANCES).limit(100).get() as any,
  ]);

  if (!cityRes.data) throw new Error(`Bot city not found: ${bot.cityId}`);
  const activeOutgoingBattles = (battlesRes.data ?? []).filter((battle: any) => battle.status === "MARCHING" || battle.status === "RETURNING");

  // Safety filter: exclude new players and cities under global cooldown
  const recentlyAttackedCityIds = new Set(
    (recentGlobalBattlesRes.data ?? [])
      .filter((b: any) => new Date(b.startedAt) > globalCooldownCutoff)
      .map((b: any) => b.defenderCityId)
  );

  const filteredTargets = (targetsRes.data ?? []).filter((city: any) => {
    if (city.id === bot.cityId) return false;
    if (city.userId === bot.userId) return false;

    // Protection for new players
    if (new Date(city.createdAt) > protectionCutoff) return false;

    // Protection against "ganging" (global cooldown per target)
    if (recentlyAttackedCityIds.has(city.id)) return false;

    // Proximity filter
    const dist = Math.sqrt(Math.pow(city.posX - cityRes.data.posX, 2) + Math.pow(city.posY - cityRes.data.posY, 2));
    if (dist > config.maxAttackDistance) return false;

    return true;
  });

  const incomingAttacks = (recentGlobalBattlesRes.data ?? [])
    .filter((b: any) => b.defenderCityId === bot.cityId && new Date(b.startedAt) > globalCooldownCutoff);

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
    activeResearchQueues: researchQueuesRes.data ?? [],
    allianceMembership: membershipRes.data ?? null,
    alliances: alliancesRes.data ?? [],
    activeOutgoingBattles,
    targets: filteredTargets,
    barbarianCamps: (barbarianCampsRes.data ?? []).filter((camp: any) => {
      const dist = Math.sqrt(Math.pow(camp.posX - cityRes.data.posX, 2) + Math.pow(camp.posY - cityRes.data.posY, 2));
      return dist <= config.maxAttackDistance;
    }),
    seasonState: seasonRes.data ?? null,
    state: {
      ...(bot.state ?? {}),
      incomingAttacks,
    },
  };
}

function botAllianceIdentity(bot: { userId: string }) {
  const suffix = bot.userId.replace(/-/g, "").slice(0, 4).toUpperCase();
  return {
    name: `Orden ${suffix}`,
    tag: `B${suffix.slice(0, 3)}`,
  };
}

function botChatMessage(decision: BotDecision) {
  if (decision.type !== "SEND_CHAT") return "";
  const channel = decision.payload.channel === "ALLIANCE" ? "ALLIANCE" : "GLOBAL";
  return channel === "ALLIANCE" ? "Reporte de avance listo." : "Explorando nuevas rutas comerciales.";
}

async function executeDecision(bot: { id: string; userId: string; cityId: string; state: any }, decision: BotDecision, config: BotSimulationConfig) {
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
  if (decision.type === "ATTACK_BARBARIAN") {
    return attackBarbarianCampAction({
      attackerCityId: bot.cityId,
      targetCampId: decision.payload.targetCampId,
      units: decision.payload.units as Array<{ type: UnitType; count: number }>,
      actor,
    });
  }
  if (decision.type === "SEND_RESOURCES") {
    return sendResourcesAction({
      senderCityId: bot.cityId,
      recipientCityId: decision.payload.recipientCityId,
      resources: decision.payload.resources,
      actor,
    });
  }
  if (decision.type === "CREATE_ALLIANCE") {
    const identity = botAllianceIdentity(bot);
    const result = await createAllianceForUser({ userId: bot.userId, ...identity });
    if ("error" in result && result.error) throw new CityActionError(result.error, 400, { blockedBy: "social" });
    return result;
  }
  if (decision.type === "JOIN_ALLIANCE") {
    const result = await joinAlliance({ userId: bot.userId, allianceId: String(decision.payload.allianceId) });
    if ("error" in result && result.error) throw new CityActionError(result.error, 400, { blockedBy: "social" });
    return result;
  }
  if (decision.type === "SEND_CHAT") {
    const channel = (decision.payload.channel === "ALLIANCE" ? "ALLIANCE" : "GLOBAL") as ChatChannel;
    const result = await createChatMessage({
      userId: bot.userId,
      channel,
      message: botChatMessage(decision),
      rateLimitWindowMs: config.chatRateLimitWindowMs,
    });
    if (result.error) throw new CityActionError(result.error, 400, { blockedBy: "social" });
    return result;
  }
  if (decision.type === "SEND_MAIL") {
    const result = await sendMailMessage({
      senderUserId: bot.userId,
      recipientCityId: String(decision.payload.recipientCityId),
      subject: "Contacto diplomatico",
      body: "Propongo mantener rutas seguras y observar el equilibrio regional.",
    });
    if ("error" in result && result.error) throw new CityActionError(result.error, 400, { blockedBy: "social" });
    return result;
  }
  return { idle: true };
}

function updateStateAfterDecision(state: any, decision: BotDecision, now: Date) {
  const current = state ?? {};
  const next = {
    ...current,
    lastDecisionAt: now.toISOString(),
    lastDecisionType: decision.type,
    idleStreak: decision.type === "IDLE" ? Number(current.idleStreak ?? 0) + 1 : 0,
  };
  if (decision.type === "CREATE_ALLIANCE" || decision.type === "JOIN_ALLIANCE" || decision.type === "SEND_CHAT" || decision.type === "SEND_MAIL") {
    return {
      ...next,
      lastSocialAt: now.toISOString(),
    };
  }
  if (decision.type !== "ATTACK_CITY") return next;
  return {
    ...next,
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
  const bots = await listDueBots(now, config.maxBotsPerTick);

  let errors = 0;
  for (const bot of bots) {
    const snapshot = await loadBotSnapshot(bot, config);
    const decision = decideBotAction(snapshot, bot.profile, config, now);
    const actionType = botActionType(decision);

    try {
      const result = await executeDecision(bot, decision, config);
      const nextState = updateStateAfterDecision(bot.state, decision, now);
      await logAction({
        botId: bot.id,
        cityId: bot.cityId,
        actionType,
        status: "SUCCESS",
        reason: decision.reason,
        payload: { decisionType: decision.type, decision: decision.payload, result },
      });
      await updateBotRecord(bot.id, {
        state: nextState,
        lastTickAt: now,
        nextTickAt: nextTickDate(config),
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
        payload: { decisionType: decision.type, decision: decision.payload, details: classified.details },
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
      await updateBotRecord(bot.id, {
        status: classified.status === "UNEXPECTED_ERROR" ? "ERROR" : "ACTIVE",
        lastTickAt: now,
        nextTickAt: nextTickDate(config),
        state: bot.state ?? {},
      });
    }
  }

  return { processed: bots.length, errors };
}

export async function writeBotMetricsSnapshot(windowMinutes = 15) {
  const windowEndedAt = new Date();
  const windowStartedAt = new Date(windowEndedAt.getTime() - windowMinutes * 60_000);
  const [logs, bots] = await Promise.all([
    listRecentBotLogs(windowStartedAt),
    listBots(),
  ]);
  const botCityIds = new Set<string>(bots.map((bot: any) => bot.cityId));
  const attemptedByType: Record<string, number> = {};
  for (const log of logs as any[]) {
    const realType = log.payload?.decisionType ?? log.actionType;
    attemptedByType[realType] = (attemptedByType[realType] ?? 0) + 1;
  }

  const [battlesRes, techsRes] = await Promise.all([
    db.from(COLLECTIONS.BATTLES).get() as any,
    db.from(COLLECTIONS.CITY_TECHS).get() as any,
  ]);
  const resolvedBattles = (battlesRes.data ?? []).filter((battle: any) =>
    botCityIds.has(battle.attackerCityId) &&
    battle.resolvedAt &&
    new Date(battle.resolvedAt).getTime() >= windowStartedAt.getTime() &&
    new Date(battle.resolvedAt).getTime() <= windowEndedAt.getTime()
  ).length;
  const completedResearch = (techsRes.data ?? []).filter((tech: any) =>
    botCityIds.has(tech.cityId) &&
    tech.unlockedAt &&
    new Date(tech.unlockedAt).getTime() >= windowStartedAt.getTime() &&
    new Date(tech.unlockedAt).getTime() <= windowEndedAt.getTime()
  ).length;

  await writeBotMetrics({
    windowStartedAt: windowStartedAt.toISOString(),
    windowEndedAt: windowEndedAt.toISOString(),
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
  });

  console.log(`[bots] metrics ${JSON.stringify({
    attemptedByType,
    successful: (logs as any[]).filter((log) => log.status === "SUCCESS").length,
    expectedBlocks: (logs as any[]).filter((log) => log.status === "EXPECTED_BLOCKED").length,
    unexpectedErrors: (logs as any[]).filter((log) => log.status === "UNEXPECTED_ERROR").length,
  })}`);
}
