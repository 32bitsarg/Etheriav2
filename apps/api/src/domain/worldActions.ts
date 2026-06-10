import { prisma } from "@etheria/database";
import type { WorldMovement } from "@etheria/shared";

// Short TTL cache: every connected client polls this endpoint every ~10s and
// the result is identical for all of them, so one computation serves everyone.
const MOVEMENTS_CACHE_TTL_MS = 8_000;
let movementsCache: { at: number; data: WorldMovement[] } | null = null;

export async function getActiveMovements(): Promise<WorldMovement[]> {
  if (movementsCache && Date.now() - movementsCache.at < MOVEMENTS_CACHE_TTL_MS) {
    return movementsCache.data;
  }
  const data = await computeActiveMovements();
  movementsCache = { at: Date.now(), data };
  return data;
}

async function computeActiveMovements(): Promise<WorldMovement[]> {
  const [battles, barbarianBattles, barbarianAttacks, caravans] = await Promise.all([
    prisma.battle.findMany({ where: { status: { in: ["MARCHING", "RETURNING"] as any } } }),
    prisma.barbarianBattle.findMany({ where: { status: { in: ["MARCHING", "RETURNING"] as any } } }),
    prisma.barbarianAttack.findMany({ where: { status: { in: ["MARCHING", "RETURNING"] as any } } }),
    prisma.tradeCaravan.findMany({ where: { status: { in: ["MARCHING", "RETURNING"] as any } } }),
  ]);

  const cityIds = new Set<string>();
  const campIds = new Set<string>();
  for (const battle of battles) {
    cityIds.add(battle.attackerCityId);
    cityIds.add(battle.defenderCityId);
  }
  for (const battle of barbarianBattles) {
    cityIds.add(battle.attackerCityId);
    campIds.add(battle.targetCampId);
  }
  for (const raid of barbarianAttacks) {
    campIds.add(raid.campId);
    cityIds.add(raid.targetCityId);
  }
  for (const caravan of caravans) {
    cityIds.add(caravan.senderCityId);
    cityIds.add(caravan.recipientCityId);
  }

  const [cities, camps] = await Promise.all([
    cityIds.size > 0
      ? prisma.city.findMany({
          where: { id: { in: [...cityIds] } },
          select: { id: true, name: true, posX: true, posY: true, userId: true, user: { select: { name: true } } },
        })
      : Promise.resolve([]),
    campIds.size > 0
      ? prisma.barbarianCamp.findMany({ where: { id: { in: [...campIds] } }, select: { id: true, name: true, posX: true, posY: true } })
      : Promise.resolve([]),
  ]);

  // Alliance membership of every involved city owner, for diplomacy coloring
  const userIds = [...new Set(cities.map((c) => c.userId))];
  const memberships = userIds.length > 0
    ? await prisma.allianceMember.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, allianceId: true, alliance: { select: { tag: true } } },
      })
    : [];
  const membershipByUser = new Map(memberships.map((m) => [m.userId, m]));

  const cityMap = new Map(cities.map(c => [c.id, c]));
  const campMap = new Map(camps.map(c => [c.id, c]));

  const ownerInfo = (cityId: string) => {
    const city = cityMap.get(cityId);
    if (!city) return {};
    const membership = membershipByUser.get(city.userId);
    return {
      playerName: city.user?.name ?? city.name,
      allianceId: membership?.allianceId,
      allianceTag: membership?.alliance?.tag,
    };
  };

  const movements: WorldMovement[] = [];

  // Player vs Player Battles
  for (const battle of battles) {
    const attacker = cityMap.get(battle.attackerCityId);
    const defender = cityMap.get(battle.defenderCityId);
    if (!attacker || !defender) continue;

    movements.push({
      id: battle.id,
      type: "ATTACK",
      status: battle.status as "MARCHING" | "RETURNING",
      from: { x: attacker.posX, y: attacker.posY, name: attacker.name },
      to: { x: defender.posX, y: defender.posY, name: defender.name },
      startedAt: battle.startedAt.toISOString(),
      arrivesAt: battle.arrivesAt.toISOString(),
      resolvedAt: battle.resolvedAt?.toISOString(),
      returnsAt: battle.returnsAt?.toISOString(),
      ...ownerInfo(battle.attackerCityId),
    });
  }

  // Player vs Barbarian Battles
  for (const battle of barbarianBattles) {
    const attacker = cityMap.get(battle.attackerCityId);
    const camp = campMap.get(battle.targetCampId);
    if (!attacker || !camp) continue;

    movements.push({
      id: battle.id,
      type: "BARBARIAN_ATTACK",
      status: battle.status as "MARCHING" | "RETURNING",
      from: { x: attacker.posX, y: attacker.posY, name: attacker.name },
      to: { x: camp.posX, y: camp.posY, name: camp.name },
      startedAt: battle.startedAt.toISOString(),
      arrivesAt: battle.arrivesAt.toISOString(),
      resolvedAt: battle.resolvedAt?.toISOString(),
      returnsAt: battle.returnsAt?.toISOString(),
      ...ownerInfo(battle.attackerCityId),
    });
  }

  // Barbarian attacks against player cities
  for (const raid of barbarianAttacks) {
    const camp = campMap.get(raid.campId);
    const defender = cityMap.get(raid.targetCityId);
    if (!camp || !defender) continue;

    movements.push({
      id: raid.id,
      type: "BARBARIAN_RAID",
      status: raid.status as "MARCHING" | "RETURNING",
      from: { x: camp.posX, y: camp.posY, name: camp.name },
      to: { x: defender.posX, y: defender.posY, name: defender.name },
      startedAt: raid.startedAt.toISOString(),
      arrivesAt: raid.arrivesAt.toISOString(),
      resolvedAt: raid.resolvedAt?.toISOString(),
      returnsAt: raid.returnsAt?.toISOString(),
    });
  }

  // Trade Caravans
  for (const caravan of caravans) {
    const sender = cityMap.get(caravan.senderCityId);
    const recipient = cityMap.get(caravan.recipientCityId);
    if (!sender || !recipient) continue;

    movements.push({
      id: caravan.id,
      type: "TRADE",
      status: caravan.status as "MARCHING" | "RETURNING",
      from: { x: sender.posX, y: sender.posY, name: sender.name },
      to: { x: recipient.posX, y: recipient.posY, name: recipient.name },
      startedAt: caravan.startedAt.toISOString(),
      arrivesAt: caravan.arrivesAt.toISOString(),
      resolvedAt: caravan.completedAt?.toISOString(),
      returnsAt: undefined,
      ...ownerInfo(caravan.senderCityId),
    });
  }

  return movements;
}
