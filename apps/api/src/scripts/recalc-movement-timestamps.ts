/**
 * Recalculate arrival/return timestamps for active movements using new unit speeds.
 * Run: npx tsx src/scripts/recalc-movement-timestamps.ts (from apps/api)
 *
 * Preserves proportional progress: if a march was 30% complete under old speeds,
 * remaining time is recalculated with new speeds so the sprite stays in place.
 */

import { db } from "../infrastructure/matecito";
import { COLLECTIONS } from "../infrastructure/matecito";
import { getUnitStats, loadUnitConfigs } from "../domain/units";
import { getWorldConfig } from "../domain/worldConfig";
import { calculatePathSpeedMultiplier } from "../domain/worldTerrainConfigData";
import { calculateTravelTimeWithMultiplier } from "../domain/battles";
import type { UnitType } from "@etheria/shared";

const TRADE_SPEED = Number(process.env.TRADE_MERCHANT_SPEED ?? 200);
const TRADE_MIN_SECS = Number(process.env.TRADE_MIN_TRAVEL_TIME_SECONDS ?? 60);

interface City {
  id: string;
  posX: number;
  posY: number;
  techBonuses?: any;
}

interface Camp {
  id: string;
  posX: number;
  posY: number;
}

function ms(date: string): number {
  return new Date(date).getTime();
}

function iso(ts: number): string {
  return new Date(ts).toISOString();
}

async function getByStatuses(collection: string, field: string, statuses: string[]) {
  const batches = await Promise.all(
    statuses.map((status) => db.from(collection).eq(field, status).get() as any)
  );
  return batches.flatMap((b: any) => b.data ?? []);
}

function preserveProgress(
  startedAt: string,
  oldEndAt: string,
  newTravelSeconds: number
): string {
  const now = Date.now();
  const startMs = ms(startedAt);
  const oldTotal = Math.max(1, ms(oldEndAt) - startMs);
  const elapsed = Math.max(0, now - startMs);
  const progress = Math.min(1, elapsed / oldTotal);
  const newTotal = newTravelSeconds * 1000;
  const remaining = Math.max(2000, Math.floor(newTotal * (1 - progress)));
  return iso(now + remaining);
}

async function run() {
  await loadUnitConfigs();
  console.log("[recalc] Loading cities, camps, and world config...\n");

  const [{ data: citiesRaw }, { data: campsRaw }, world] = await Promise.all([
    db.from(COLLECTIONS.CITIES).get() as any,
    db.from(COLLECTIONS.BARBARIAN_CAMPS).get() as any,
    getWorldConfig(),
  ]);

  const cityMap = new Map<string, City>((citiesRaw ?? []).map((c: any) => [c.id, c]));
  const campMap = new Map<string, Camp>((campsRaw ?? []).map((c: any) => [c.id, c]));

  const { width, height } = world.map;
  let updated = 0;
  let skipped = 0;

  // ── PvP Battles ──
  const pvpAll = await getByStatuses(COLLECTIONS.BATTLES, "status", ["MARCHING", "RETURNING"]);

  for (const b of pvpAll) {
    const attacker = cityMap.get(b.attackerCityId);
    const defender = cityMap.get(b.defenderCityId);
    if (!attacker || !defender) { skipped++; continue; }

    const units: Array<{ type: string }> = b.units ?? [];
    const speeds = units.map(u => getUnitStats(u.type as UnitType, 1, attacker.techBonuses).speed);
    const minSpeed = Math.max(1, speeds.length > 0 ? Math.min(...speeds) : 60);
    const terrain = calculatePathSpeedMultiplier(attacker.posX, attacker.posY, defender.posX, defender.posY, width, height);
    const travelSecs = calculateTravelTimeWithMultiplier(attacker.posX, attacker.posY, defender.posX, defender.posY, minSpeed, terrain);

    const patch: any = {};

    if (b.status === "MARCHING" && b.startedAt && b.arrivesAt) {
      patch.arrivesAt = preserveProgress(b.startedAt, b.arrivesAt, travelSecs);
    }

    if (b.status === "RETURNING" && b.arrivesAt && b.returnsAt && b.resolvedAt) {
      patch.returnsAt = preserveProgress(b.resolvedAt, b.returnsAt, travelSecs);
    }

    if (Object.keys(patch).length > 0) {
      await db.from(COLLECTIONS.BATTLES).eq("id", b.id).merge(patch).execute();
      updated++;
      console.log(`  PvP    ${b.id.slice(0, 8)} ${b.status.padEnd(10)} ${patch.arrivesAt ? "arr=" + patch.arrivesAt.slice(11, 19) : ""}${patch.returnsAt ? " ret=" + patch.returnsAt.slice(11, 19) : ""}`);
    } else {
      skipped++;
    }
  }

  // ── Barbarian Camp Battles ──
  const pvbAll = await getByStatuses(COLLECTIONS.BARBARIAN_BATTLES, "status", ["MARCHING", "RETURNING"]);

  for (const b of pvbAll) {
    const attacker = cityMap.get(b.attackerCityId);
    const camp = campMap.get(b.targetCampId);
    if (!attacker || !camp) { skipped++; continue; }

    const units: Array<{ type: string }> = b.units ?? [];
    const speeds = units.map(u => getUnitStats(u.type as UnitType, 1, attacker.techBonuses).speed);
    const minSpeed = Math.max(1, speeds.length > 0 ? Math.min(...speeds) : 60);
    const terrain = calculatePathSpeedMultiplier(attacker.posX, attacker.posY, camp.posX, camp.posY, width, height);
    const travelSecs = calculateTravelTimeWithMultiplier(attacker.posX, attacker.posY, camp.posX, camp.posY, minSpeed, terrain);

    const patch: any = {};

    if (b.status === "MARCHING" && b.startedAt && b.arrivesAt) {
      patch.arrivesAt = preserveProgress(b.startedAt, b.arrivesAt, travelSecs);
    }

    if (b.status === "RETURNING" && b.arrivesAt && b.returnsAt && b.resolvedAt) {
      patch.returnsAt = preserveProgress(b.resolvedAt, b.returnsAt, travelSecs);
    }

    if (Object.keys(patch).length > 0) {
      await db.from(COLLECTIONS.BARBARIAN_BATTLES).eq("id", b.id).merge(patch).execute();
      updated++;
      console.log(`  PvB    ${b.id.slice(0, 8)} ${b.status.padEnd(10)} ${patch.arrivesAt ? "arr=" + patch.arrivesAt.slice(11, 19) : ""}${patch.returnsAt ? " ret=" + patch.returnsAt.slice(11, 19) : ""}`);
    } else {
      skipped++;
    }
  }

  // ── Barbarian Raids on Players ──
  const raidAll = await getByStatuses(COLLECTIONS.BARBARIAN_ATTACKS, "status", ["MARCHING", "RETURNING"]);

  for (const b of raidAll) {
    const camp = campMap.get(b.campId);
    const defender = cityMap.get(b.targetCityId);
    if (!camp || !defender) { skipped++; continue; }

    const units: Array<{ type: string }> = b.units ?? [];
    const speeds = units.map(u => getUnitStats(u.type as UnitType, 1, undefined).speed);
    const minSpeed = Math.max(1, speeds.length > 0 ? Math.min(...speeds) : 60);
    const terrain = calculatePathSpeedMultiplier(camp.posX, camp.posY, defender.posX, defender.posY, width, height);
    const travelSecs = calculateTravelTimeWithMultiplier(camp.posX, camp.posY, defender.posX, defender.posY, minSpeed, terrain);

    const patch: any = {};

    if (b.status === "MARCHING" && b.startedAt && b.arrivesAt) {
      patch.arrivesAt = preserveProgress(b.startedAt, b.arrivesAt, travelSecs);
    }

    if (b.status === "RETURNING" && b.arrivesAt && b.returnsAt && b.resolvedAt) {
      patch.returnsAt = preserveProgress(b.resolvedAt, b.returnsAt, travelSecs);
    }

    if (Object.keys(patch).length > 0) {
      await db.from(COLLECTIONS.BARBARIAN_ATTACKS).eq("id", b.id).merge(patch).execute();
      updated++;
      console.log(`  Raid   ${b.id.slice(0, 8)} ${b.status.padEnd(10)} ${patch.arrivesAt ? "arr=" + patch.arrivesAt.slice(11, 19) : ""}${patch.returnsAt ? " ret=" + patch.returnsAt.slice(11, 19) : ""}`);
    } else {
      skipped++;
    }
  }

  // ── Trade Caravans ──
  const tradeAll = await getByStatuses(COLLECTIONS.TRADE_CARAVANS, "status", ["MARCHING", "RETURNING"]);

  for (const t of tradeAll) {
    const sender = cityMap.get(t.senderCityId);
    const recipient = cityMap.get(t.recipientCityId);
    if (!sender || !recipient) { skipped++; continue; }

    const terrain = calculatePathSpeedMultiplier(sender.posX, sender.posY, recipient.posX, recipient.posY, width, height);
    const travelSecs = Math.max(TRADE_MIN_SECS, calculateTravelTimeWithMultiplier(sender.posX, sender.posY, recipient.posX, recipient.posY, TRADE_SPEED, terrain));

    const patch: any = {};

    if (t.status === "MARCHING" && t.startedAt && t.arrivesAt) {
      patch.arrivesAt = preserveProgress(t.startedAt, t.arrivesAt, travelSecs);
    }

    if (t.status === "RETURNING" && t.arrivesAt && t.returnsAt && t.deliveredAt) {
      patch.returnsAt = preserveProgress(t.deliveredAt, t.returnsAt, travelSecs);
    }

    if (Object.keys(patch).length > 0) {
      await db.from(COLLECTIONS.TRADE_CARAVANS).eq("id", t.id).merge(patch).execute();
      updated++;
      console.log(`  Trade  ${t.id.slice(0, 8)} ${t.status.padEnd(10)} ${patch.arrivesAt ? "arr=" + patch.arrivesAt.slice(11, 19) : ""}${patch.returnsAt ? " ret=" + patch.returnsAt.slice(11, 19) : ""}`);
    } else {
      skipped++;
    }
  }

  console.log(`\n[recalc] Done: ${updated} updated, ${skipped} skipped.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[recalc] Error:", err);
    process.exit(1);
  });
