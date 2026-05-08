import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { mergeRecordBySelector } from "../infrastructure/matecitoRecord.js";
import { calculateTravelTimeWithMultiplier } from "./battles.js";
import { getWorldConfig } from "./worldConfig.js";
import { calculatePathSpeedMultiplier } from "./worldTerrainConfigData.js";
import { canAfford, subtractResources } from "./resources.js";
import type { Resources } from "@etheria/shared";
import { createGameReport } from "./reports.js";
import { advanceQuest } from "./quests.js";

function readNumber(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

export class TradeActionError extends Error {
  constructor(public message: string, public status: number = 400) {
    super(message);
  }
}

export async function sendResourcesAction(input: {
  senderCityId: string;
  recipientCityId: string;
  resources: Resources;
  actor: { type: "human" | "bot"; botId?: string };
}) {
  const { senderCityId, recipientCityId, resources, actor } = input;

  if (senderCityId === recipientCityId) {
    throw new TradeActionError("Cannot send resources to the same city");
  }

  // 1. Load cities
  const [senderRes, recipientRes] = await Promise.all([
    db.from(COLLECTIONS.CITIES).eq("id", senderCityId).getFirst(),
    db.from(COLLECTIONS.CITIES).eq("id", recipientCityId).getFirst(),
  ]);

  const sender = (senderRes as any).data;
  const recipient = (recipientRes as any).data;

  if (!sender) throw new TradeActionError("Sender city not found", 404);
  if (!recipient) throw new TradeActionError("Recipient city not found", 404);

  // 2. Check if they have MARKET building
  const senderBuildingsRes = await db.from(COLLECTIONS.BUILDINGS).eq("cityId", senderCityId).eq("type", "MARKET").getFirst();
  if (!(senderBuildingsRes as any).data) {
    throw new TradeActionError("Sender city needs a Market to send resources", 403);
  }

  // Recipient also needs a market to receive
  const recipientBuildingsRes = await db.from(COLLECTIONS.BUILDINGS).eq("cityId", recipientCityId).eq("type", "MARKET").getFirst();
  if (!(recipientBuildingsRes as any).data) {
    throw new TradeActionError("Recipient city needs a Market to receive resources", 403);
  }

  // 3. Validate and subtract resources
  const senderCurrentResources = {
    gold: sender.gold,
    wood: sender.wood,
    stone: sender.stone,
    food: sender.food,
    gems: sender.gems,
  };

  if (!canAfford(senderCurrentResources, resources)) {
    throw new TradeActionError("Not enough resources to send", 400);
  }

  const newSenderResources = subtractResources(senderCurrentResources, resources);
  const now = new Date();

  await mergeRecordBySelector(COLLECTIONS.CITIES, sender, {
    ...newSenderResources,
    lastResourceUpdate: now.toISOString(),
  });

  // 4. Calculate travel time (fixed speed for merchants)
  const merchantSpeed = readNumber("TRADE_MERCHANT_SPEED", 200);
  const world = await getWorldConfig();
  const terrainSpeed = calculatePathSpeedMultiplier(sender.posX, sender.posY, recipient.posX, recipient.posY, world.map.width, world.map.height);
  const travelTimeSeconds = calculateTravelTimeWithMultiplier(
    sender.posX, sender.posY,
    recipient.posX, recipient.posY,
    merchantSpeed,
    terrainSpeed
  );

  const minTravelTime = readNumber("TRADE_MIN_TRAVEL_TIME_SECONDS", 60);
  const actualTravelTime = Math.max(minTravelTime, travelTimeSeconds);
  const arrivesAt = new Date(now.getTime() + actualTravelTime * 1000);

  // 5. Create Caravan
  const caravanId = crypto.randomUUID();
  await db.from(COLLECTIONS.TRADE_CARAVANS).insert({
    id: caravanId,
    senderCityId,
    recipientCityId,
    resources,
    status: "MARCHING",
    startedAt: now.toISOString(),
    arrivesAt: arrivesAt.toISOString(),
  });
  await createGameReport({
    type: "TRADE",
    userId: sender.userId,
    cityId: senderCityId,
    title: "Caravan dispatched",
    summary: `A caravan is travelling to ${recipient.name}.`,
    payload: { caravanId, recipientCityId, resources },
  });
  await createGameReport({
    type: "TRADE",
    userId: recipient.userId,
    cityId: recipientCityId,
    title: "Incoming caravan",
    summary: `${sender.name} sent resources to your city.`,
    payload: { caravanId, senderCityId, resources },
  });
  await advanceQuest(senderCityId, "SEND_TRADE", 1);

  console.log(`🚚 Trade caravan ${caravanId} dispatched from ${sender.name} to ${recipient.name}`);

  return {
    success: true,
    caravanId,
    arrivesAt: arrivesAt.toISOString(),
    travelTimeSeconds: actualTravelTime,
  };
}
