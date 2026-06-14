// Barbarian AI: autonomous behaviors — move, duel, trade, level-up from combat.
// All functions are called from queueWorker on a slow tick (~5 min cadence).

import { prisma } from '@etheria/database';
import { resolveBattle } from './battles.js';
import { generateBarbarianArmy } from './barbarians.js';
import { findValidSpawnPosition } from './barbarians.js';

const BARBARIAN_SPEED_PX_PER_SEC = 22; // world units per second (~3-12 min por relocalización)

// ─── Archetype relationships ──────────────────────────────────────────────────

const RIVAL_OF: Record<string, string[]> = {
  RAIDERS:   ['MARAUDERS', 'NOMADS'],
  MARAUDERS: ['RAIDERS', 'WARHOST'],
  WARHOST:   ['MARAUDERS'],
  HUNTERS:   [],
  NOMADS:    ['RAIDERS'],
};

const TRADES_WITH: Record<string, string[]> = {
  HUNTERS:   ['NOMADS', 'HUNTERS'],
  NOMADS:    ['HUNTERS', 'NOMADS', 'RAIDERS'],
  RAIDERS:   ['NOMADS'],
  MARAUDERS: [],
  WARHOST:   [],
};

// How often each archetype relocates (probability per AI tick, ~5 min interval)
const MOVE_CHANCE: Record<string, number> = {
  NOMADS:    0.06,
  RAIDERS:   0.025,
  HUNTERS:   0.025,
  MARAUDERS: 0.012,
  WARHOST:   0.006,
};

const DUEL_RADIUS    = 18_000; // world units
const TRADE_RADIUS   = 22_000;
const MOVE_RADIUS    = 12_000; // max relocation distance

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function travelSecs(d: number) {
  return Math.max(120, Math.floor(d / BARBARIAN_SPEED_PX_PER_SEC));
}

// ─── BARBARIAN MOVE ───────────────────────────────────────────────────────────

export async function processBarbarianMoves(): Promise<void> {
  // Resolve arrived moves first
  const arrived = await prisma.barbarianMove.findMany({
    where: { status: 'MARCHING', arrivesAt: { lte: new Date() } },
  });
  for (const m of arrived) {
    await prisma.$transaction([
      prisma.barbarianCamp.update({
        where: { id: m.campId },
        data: { posX: m.toX, posY: m.toY },
      }),
      prisma.barbarianMove.update({
        where: { id: m.id },
        data: { status: 'ARRIVED' },
      }),
    ]);
  }
  // Clean up old arrived moves
  await prisma.barbarianMove.deleteMany({
    where: { status: 'ARRIVED', arrivesAt: { lte: new Date(Date.now() - 2 * 3600_000) } },
  });

  // Schedule new moves
  const camps = await prisma.barbarianCamp.findMany({
    where: { status: 'ACTIVE' },
    include: { moves: { where: { status: 'MARCHING' } } },
  });

  for (const camp of camps) {
    if (camp.moves.length > 0) continue; // already moving
    const chance = MOVE_CHANCE[camp.archetype] ?? 0.01;
    if (Math.random() > chance) continue;

    // Find a new valid position nearby
    const angle = Math.random() * Math.PI * 2;
    const d = 4_000 + Math.random() * MOVE_RADIUS;
    const toX = Math.round(camp.posX + Math.cos(angle) * d);
    const toY = Math.round(camp.posY + Math.sin(angle) * d);

    const travel = travelSecs(dist(camp.posX, camp.posY, toX, toY));
    const now = new Date();
    await prisma.barbarianMove.create({
      data: {
        id: crypto.randomUUID(),
        campId: camp.id,
        fromX: camp.posX,
        fromY: camp.posY,
        toX,
        toY,
        status: 'MARCHING',
        startedAt: now,
        arrivesAt: new Date(now.getTime() + travel * 1000),
      },
    });
  }
}

// ─── BARBARIAN VS BARBARIAN DUELS ─────────────────────────────────────────────

export async function processBarbarianDuels(): Promise<void> {
  // Resolve arrived duels
  const arrived = await prisma.barbarianDuel.findMany({
    where: { status: 'MARCHING', arrivesAt: { lte: new Date() } },
    include: {
      attackerCamp: { include: { army: true } },
      defenderCamp: { include: { army: true } },
    },
  });

  for (const duel of arrived) {
    const { attackerCamp, defenderCamp } = duel;
    if (!attackerCamp.army || !defenderCamp.army) {
      await prisma.barbarianDuel.update({ where: { id: duel.id }, data: { status: 'RESOLVED', resolvedAt: new Date(), result: { skipped: true } } });
      continue;
    }

    const attackerUnits = attackerCamp.army.units as Record<string, number>;
    const defenderUnits = defenderCamp.army.units as Record<string, number>;

    const battleResult = resolveBattle(attackerUnits as any, defenderUnits as any);

    const now = new Date();
    if (battleResult.victory) {
      // Attacker wins: absorb fraction of defender army, possibly level up
      const absorbed: Record<string, number> = {};
      for (const [type, count] of Object.entries(defenderUnits)) {
        absorbed[type] = Math.floor(count * 0.4);
      }
      const newAttackerUnits = { ...attackerUnits };
      for (const [type, count] of Object.entries(absorbed)) {
        newAttackerUnits[type] = (newAttackerUnits[type] ?? 0) + count;
      }
      const newAttackerPower = Object.values(newAttackerUnits).reduce((s, n) => s + n, 0) * 10;

      // Defender loses half its army
      const newDefenderUnits: Record<string, number> = {};
      for (const [type, count] of Object.entries(defenderUnits)) {
        newDefenderUnits[type] = Math.max(0, Math.floor(count * 0.5));
      }
      const newDefenderPower = Object.values(newDefenderUnits).reduce((s, n) => s + n, 0) * 10;

      // Level up attacker with 40% chance
      const levelGain = Math.random() < 0.4 && attackerCamp.level < 10 ? 1 : 0;

      await prisma.$transaction([
        prisma.barbarianArmy.update({
          where: { campId: attackerCamp.id },
          data: { units: newAttackerUnits, power: newAttackerPower },
        }),
        prisma.barbarianArmy.update({
          where: { campId: defenderCamp.id },
          data: { units: newDefenderUnits, power: newDefenderPower },
        }),
        ...(levelGain ? [prisma.barbarianCamp.update({
          where: { id: attackerCamp.id },
          data: { level: attackerCamp.level + 1 },
        })] : []),
        prisma.barbarianDuel.update({
          where: { id: duel.id },
          data: { status: 'RESOLVED', resolvedAt: now, result: { winner: 'ATTACKER', levelGain } },
        }),
      ]);
    } else {
      // Defender wins: attacker loses half, defender gains fraction
      const newAttackerUnits: Record<string, number> = {};
      for (const [type, count] of Object.entries(attackerUnits)) {
        newAttackerUnits[type] = Math.max(0, Math.floor(count * 0.5));
      }
      const absorbed: Record<string, number> = {};
      for (const [type, count] of Object.entries(attackerUnits)) {
        absorbed[type] = Math.floor(count * 0.3);
      }
      const newDefenderUnits = { ...defenderUnits };
      for (const [type, count] of Object.entries(absorbed)) {
        newDefenderUnits[type] = (newDefenderUnits[type] ?? 0) + count;
      }

      const levelGain = Math.random() < 0.4 && defenderCamp.level < 10 ? 1 : 0;

      await prisma.$transaction([
        prisma.barbarianArmy.update({
          where: { campId: attackerCamp.id },
          data: { units: newAttackerUnits, power: Object.values(newAttackerUnits).reduce((s, n) => s + n, 0) * 10 },
        }),
        prisma.barbarianArmy.update({
          where: { campId: defenderCamp.id },
          data: { units: newDefenderUnits, power: Object.values(newDefenderUnits).reduce((s, n) => s + n, 0) * 10 },
        }),
        ...(levelGain ? [prisma.barbarianCamp.update({
          where: { id: defenderCamp.id },
          data: { level: defenderCamp.level + 1 },
        })] : []),
        prisma.barbarianDuel.update({
          where: { id: duel.id },
          data: { status: 'RESOLVED', resolvedAt: now, result: { winner: 'DEFENDER', levelGain } },
        }),
      ]);
    }
  }

  // Schedule new duels — find rival-archetype pairs within range with no active duel
  const activeCamps = await prisma.barbarianCamp.findMany({
    where: { status: 'ACTIVE' },
    include: {
      duelsAsAttacker: { where: { status: 'MARCHING' } },
      duelsAsDefender: { where: { status: 'MARCHING' } },
    },
  });

  const busyCampIds = new Set<string>();
  for (const c of activeCamps) {
    if (c.duelsAsAttacker.length > 0 || c.duelsAsDefender.length > 0) {
      busyCampIds.add(c.id);
    }
  }

  const freeCamps = activeCamps.filter(c => !busyCampIds.has(c.id));

  // Track which camps get paired this tick
  const pairedThisTick = new Set<string>();
  for (const attacker of freeCamps) {
    if (pairedThisTick.has(attacker.id)) continue;
    const rivals = RIVAL_OF[attacker.archetype] ?? [];
    if (rivals.length === 0) continue;
    if (Math.random() > 0.08) continue; // 8% chance per tick to initiate a duel

    // Find nearby rival camp
    const target = freeCamps.find(c =>
      !pairedThisTick.has(c.id) &&
      c.id !== attacker.id &&
      rivals.includes(c.archetype) &&
      dist(attacker.posX, attacker.posY, c.posX, c.posY) <= DUEL_RADIUS
    );
    if (!target) continue;

    const d = dist(attacker.posX, attacker.posY, target.posX, target.posY);
    const travel = travelSecs(d / 2); // meet halfway
    const now = new Date();
    await prisma.barbarianDuel.create({
      data: {
        id: crypto.randomUUID(),
        attackerCampId: attacker.id,
        defenderCampId: target.id,
        status: 'MARCHING',
        startedAt: now,
        arrivesAt: new Date(now.getTime() + travel * 1000),
      },
    });
    pairedThisTick.add(attacker.id);
    pairedThisTick.add(target.id);
  }

  // Clean up old resolved duels
  await prisma.barbarianDuel.deleteMany({
    where: { status: 'RESOLVED', resolvedAt: { lte: new Date(Date.now() - 2 * 3600_000) } },
  });
}

// ─── BARBARIAN CAMP TRADE ─────────────────────────────────────────────────────

export async function processBarbarianCampTrades(): Promise<void> {
  const now = new Date();

  // Resolve arrivals → flip to RETURNING
  const arrived = await prisma.barbarianCampTrade.findMany({
    where: { status: 'MARCHING', arrivesAt: { lte: now } },
    include: { fromCamp: true, toCamp: true },
  });
  for (const trade of arrived) {
    const d = dist(trade.fromCamp.posX, trade.fromCamp.posY, trade.toCamp.posX, trade.toCamp.posY);
    const returnSecs = travelSecs(d);
    await prisma.barbarianCampTrade.update({
      where: { id: trade.id },
      data: { status: 'RETURNING', returnsAt: new Date(now.getTime() + returnSecs * 1000) },
    });
  }

  // Resolve returns → DONE
  const returning = await prisma.barbarianCampTrade.findMany({
    where: { status: 'RETURNING', returnsAt: { lte: now } },
  });
  for (const trade of returning) {
    await prisma.barbarianCampTrade.update({ where: { id: trade.id }, data: { status: 'DONE' } });
  }

  // Clean up old done trades
  await prisma.barbarianCampTrade.deleteMany({
    where: { status: 'DONE', arrivesAt: { lte: new Date(Date.now() - 2 * 3600_000) } },
  });

  // Schedule new trades
  const activeCamps = await prisma.barbarianCamp.findMany({
    where: { status: 'ACTIVE' },
    include: {
      tradesFrom: { where: { status: { in: ['MARCHING', 'RETURNING'] } } },
      tradesTo: { where: { status: { in: ['MARCHING', 'RETURNING'] } } },
    },
  });

  const busyCampIds = new Set<string>();
  for (const c of activeCamps) {
    if (c.tradesFrom.length > 0 || c.tradesTo.length > 0) busyCampIds.add(c.id);
  }

  const freeCamps = activeCamps.filter(c => !busyCampIds.has(c.id));
  const pairedThisTick = new Set<string>();

  for (const sender of freeCamps) {
    if (pairedThisTick.has(sender.id)) continue;
    const partners = TRADES_WITH[sender.archetype] ?? [];
    if (partners.length === 0) continue;
    if (Math.random() > 0.06) continue; // 6% per tick

    const target = freeCamps.find(c =>
      !pairedThisTick.has(c.id) &&
      c.id !== sender.id &&
      partners.includes(c.archetype) &&
      dist(sender.posX, sender.posY, c.posX, c.posY) <= TRADE_RADIUS
    );
    if (!target) continue;

    const d = dist(sender.posX, sender.posY, target.posX, target.posY);
    const travel = travelSecs(d);
    await prisma.barbarianCampTrade.create({
      data: {
        id: crypto.randomUUID(),
        fromCampId: sender.id,
        toCampId: target.id,
        status: 'MARCHING',
        startedAt: now,
        arrivesAt: new Date(now.getTime() + travel * 1000),
      },
    });
    pairedThisTick.add(sender.id);
    pairedThisTick.add(target.id);
  }
}
