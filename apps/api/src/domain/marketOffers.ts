import type { CreateMarketOfferRequest } from "@etheria/shared";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { mergeRecordByLogicalId, mergeRecordBySelector } from "../infrastructure/matecitoRecord.js";
import { createGameReport } from "./reports.js";
import { advanceQuest } from "./quests.js";

const genId = () => crypto.randomUUID();
const MARKET_FEE_RATE = Number(process.env.MARKET_OFFER_FEE_RATE ?? 0.05);
const MARKET_OFFER_TTL_HOURS = Number(process.env.MARKET_OFFER_TTL_HOURS ?? 24);

function resourcesOf(city: any) {
  return {
    gold: Number(city.gold ?? 0),
    wood: Number(city.wood ?? 0),
    stone: Number(city.stone ?? 0),
    food: Number(city.food ?? 0),
    gems: Number(city.gems ?? 0),
  };
}

async function hasMarket(cityId: string) {
  const res = await db.from(COLLECTIONS.BUILDINGS).eq("cityId", cityId).eq("type", "MARKET").getFirst() as any;
  return !!res.data;
}

export async function listMarketOffers() {
  const res = await db.from(COLLECTIONS.MARKET_OFFERS).eq("status", "OPEN").limit(100).get() as any;
  const now = Date.now();
  return (res.data ?? [])
    .filter((offer: any) => new Date(offer.expiresAt).getTime() > now)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createMarketOffer(userId: string, input: CreateMarketOfferRequest) {
  if (input.giveResource === input.wantResource) return { error: "Offer must trade different resources", status: 400 } as const;
  const cityRes = await db.from(COLLECTIONS.CITIES).eq("id", input.cityId).getFirst() as any;
  const city = cityRes.data;
  if (!city || city.userId !== userId) return { error: "City not found", status: 404 } as const;
  if (!(await hasMarket(input.cityId))) return { error: "Market required", status: 403 } as const;
  const current = resourcesOf(city);
  const fee = Math.ceil(input.giveAmount * MARKET_FEE_RATE);
  const required = input.giveAmount + fee;
  if ((current as any)[input.giveResource] < required) return { error: "Not enough resources", status: 400 } as const;

  const now = new Date();
  const next = { ...current, [input.giveResource]: (current as any)[input.giveResource] - required };
  await mergeRecordBySelector(COLLECTIONS.CITIES, city, { ...next, lastResourceUpdate: now.toISOString() });

  const offer = {
    id: genId(),
    creatorUserId: userId,
    creatorCityId: input.cityId,
    giveResource: input.giveResource,
    giveAmount: input.giveAmount,
    wantResource: input.wantResource,
    wantAmount: input.wantAmount,
    feeRate: MARKET_FEE_RATE,
    status: "OPEN",
    acceptedByUserId: null,
    acceptedByCityId: null,
    expiresAt: new Date(now.getTime() + MARKET_OFFER_TTL_HOURS * 3600_000).toISOString(),
    createdAt: now.toISOString(),
    acceptedAt: null,
  };
  await db.from(COLLECTIONS.MARKET_OFFERS).insert(offer);
  await createGameReport({ type: "MARKET", userId, cityId: input.cityId, title: "Market offer created", summary: "Your public offer is now listed.", payload: offer });
  return { offer, resources: next };
}

export async function acceptMarketOffer(userId: string, offerId: string, cityId: string) {
  const offerRes = await db.from(COLLECTIONS.MARKET_OFFERS).eq("id", offerId).getFirst() as any;
  const offer = offerRes.data;
  if (!offer || offer.status !== "OPEN") return { error: "Offer not available", status: 404 } as const;
  if (new Date(offer.expiresAt).getTime() <= Date.now()) {
    await mergeRecordByLogicalId(COLLECTIONS.MARKET_OFFERS, offer.id, { status: "EXPIRED" });
    return { error: "Offer expired", status: 410 } as const;
  }
  if (offer.creatorCityId === cityId) return { error: "Cannot accept your own offer", status: 400 } as const;

  const [buyerRes, sellerRes] = await Promise.all([
    db.from(COLLECTIONS.CITIES).eq("id", cityId).getFirst() as any,
    db.from(COLLECTIONS.CITIES).eq("id", offer.creatorCityId).getFirst() as any,
  ]);
  const buyer = buyerRes.data;
  const seller = sellerRes.data;
  if (!buyer || buyer.userId !== userId) return { error: "City not found", status: 404 } as const;
  if (!seller) return { error: "Creator city not found", status: 404 } as const;
  if (!(await hasMarket(cityId))) return { error: "Market required", status: 403 } as const;
  const buyerResources = resourcesOf(buyer);
  const acceptFee = Math.ceil(Number(offer.wantAmount) * Number(offer.feeRate ?? MARKET_FEE_RATE));
  const buyerRequired = Number(offer.wantAmount) + acceptFee;
  if ((buyerResources as any)[offer.wantResource] < buyerRequired) return { error: "Not enough resources", status: 400 } as const;

  const sellerResources = resourcesOf(seller);
  const nextBuyer = {
    ...buyerResources,
    [offer.wantResource]: (buyerResources as any)[offer.wantResource] - buyerRequired,
    [offer.giveResource]: (buyerResources as any)[offer.giveResource] + Number(offer.giveAmount),
  };
  const nextSeller = {
    ...sellerResources,
    [offer.wantResource]: (sellerResources as any)[offer.wantResource] + Number(offer.wantAmount),
  };
  const now = new Date().toISOString();
  await mergeRecordBySelector(COLLECTIONS.CITIES, buyer, { ...nextBuyer, lastResourceUpdate: now });
  await mergeRecordBySelector(COLLECTIONS.CITIES, seller, { ...nextSeller, lastResourceUpdate: now });
  await mergeRecordByLogicalId(COLLECTIONS.MARKET_OFFERS, offer.id, {
    status: "ACCEPTED",
    acceptedByUserId: userId,
    acceptedByCityId: cityId,
    acceptedAt: now,
  });
  await createGameReport({ type: "MARKET", userId, cityId, title: "Market offer accepted", summary: "The exchange was completed.", payload: { offerId } });
  await createGameReport({ type: "MARKET", userId: offer.creatorUserId, cityId: offer.creatorCityId, title: "Market offer fulfilled", summary: "Another player accepted your offer.", payload: { offerId } });
  await advanceQuest(cityId, "SEND_TRADE", 1);
  return { success: true, resources: nextBuyer };
}
