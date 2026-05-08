import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import type { WorldMovement } from "@etheria/shared";

async function getByStatuses(collection: string, field: string, statuses: string[]) {
  const results = await Promise.all(
    statuses.map((status) => db.from(collection).eq(field, status).get() as any)
  );
  return results.flatMap((res: any) => res.data ?? []);
}

export async function getActiveMovements() {
  const [battles, barbarianBattles, barbarianAttacks, caravans, citiesRes, campsRes] = await Promise.all([
    getByStatuses(COLLECTIONS.BATTLES, "status", ["MARCHING", "RETURNING"]),
    getByStatuses(COLLECTIONS.BARBARIAN_BATTLES, "status", ["MARCHING", "RETURNING"]),
    getByStatuses(COLLECTIONS.BARBARIAN_ATTACKS, "status", ["MARCHING", "RETURNING"]),
    getByStatuses(COLLECTIONS.TRADE_CARAVANS, "status", ["MARCHING", "RETURNING"]),
    db.from(COLLECTIONS.CITIES).get() as any,
    db.from(COLLECTIONS.BARBARIAN_CAMPS).get() as any,
  ]);

  const cities = (citiesRes.data ?? []) as any[];
  const camps = (campsRes.data ?? []) as any[];
  
  const cityMap = new Map(cities.map(c => [c.id, c]));
  const campMap = new Map(camps.map(c => [c.id, c]));

  const movements: WorldMovement[] = [];

  // Player vs Player Battles
  for (const battle of battles) {
    const attacker = cityMap.get(battle.attackerCityId);
    const defender = cityMap.get(battle.defenderCityId);
    if (!attacker || !defender) continue;
    
    movements.push({
      id: battle.id,
      type: "ATTACK",
      status: battle.status,
      from: { x: attacker.posX, y: attacker.posY, name: attacker.name },
      to: { x: defender.posX, y: defender.posY, name: defender.name },
      startedAt: battle.startedAt,
      arrivesAt: battle.arrivesAt,
      resolvedAt: battle.resolvedAt,
      returnsAt: battle.returnsAt,
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
      status: battle.status,
      from: { x: attacker.posX, y: attacker.posY, name: attacker.name },
      to: { x: camp.posX, y: camp.posY, name: camp.name },
      startedAt: battle.startedAt,
      arrivesAt: battle.arrivesAt,
      resolvedAt: battle.resolvedAt,
      returnsAt: battle.returnsAt,
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
      status: raid.status,
      from: { x: camp.posX, y: camp.posY, name: camp.name },
      to: { x: defender.posX, y: defender.posY, name: defender.name },
      startedAt: raid.startedAt,
      arrivesAt: raid.arrivesAt,
      resolvedAt: raid.resolvedAt,
      returnsAt: raid.returnsAt,
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
      status: caravan.status,
      from: { x: sender.posX, y: sender.posY, name: sender.name },
      to: { x: recipient.posX, y: recipient.posY, name: recipient.name },
      startedAt: caravan.startedAt,
      arrivesAt: caravan.arrivesAt,
      resolvedAt: caravan.resolvedAt ?? caravan.deliveredAt ?? caravan.completedAt,
      returnsAt: caravan.returnsAt,
    });
  }

  return movements;
}
