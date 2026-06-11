import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { createActivityFeedEntry } from './activityFeed.js';
import { resolveBattle } from '../domain/battles.js';
import { calculateTechBonuses } from '../domain/techs.js';

const WONDER_ID = 'world_wonder';
const DAYS_TO_WIN = 7;

export const wonderRouter = new Hono();

async function getOrCreateWonder() {
  const res = await db.from(COLLECTIONS.WONDER).eq('id', WONDER_ID).getFirst() as any;
  if (res.data) return res.data;
  await db.from(COLLECTIONS.WONDER).insert({
    id: WONDER_ID,
    holderAllianceId: null,
    holderCityId: null,
    controlStartedAt: null,
    daysControlled: 0,
    updatedAt: new Date().toISOString(),
  });
  return (await db.from(COLLECTIONS.WONDER).eq('id', WONDER_ID).getFirst() as any).data;
}

wonderRouter.get('/', async (c) => {
  const wonder = await getOrCreateWonder();
  let holderAllianceName: string | null = null;
  let holderCityName: string | null = null;
  if (wonder.holderAllianceId) {
    const a = await db.from(COLLECTIONS.ALLIANCES).eq('id', wonder.holderAllianceId).getFirst() as any;
    holderAllianceName = a.data?.name ?? null;
  }
  if (wonder.holderCityId) {
    const city = await db.from(COLLECTIONS.CITIES).eq('id', wonder.holderCityId).getFirst() as any;
    holderCityName = city.data?.name ?? null;
  }
  return c.json({
    wonder: {
      ...wonder,
      holderAllianceName,
      holderCityName,
      daysToWin: DAYS_TO_WIN,
    },
  });
});

wonderRouter.post('/attack', requireMatecitoAuth(), zValidator('json', z.object({
  cityId: z.string(),
  units: z.array(z.object({ type: z.string(), count: z.number().int().positive() })),
})), async (c) => {
  const userId = c.get('userId');
  const { cityId, units } = c.req.valid('json');

  const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', cityId).getFirst() as any;
  const city = cityRes.data;
  if (!city || city.userId !== userId) return c.json({ error: 'City not found' }, 404);

  const memberRes = await db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq('userId', userId).getFirst() as any;
  const allianceId = memberRes.data?.allianceId;
  if (!allianceId) return c.json({ error: 'Must be in an alliance to attack the Wonder' }, 400);

  const totalUnits = units.reduce((s, u) => s + u.count, 0);
  if (totalUnits < 1) return c.json({ error: 'Must send at least 1 unit' }, 400);

  // Validate attacker owns enough units
  const ownUnitsRes = await db.from(COLLECTIONS.UNITS).eq('cityId', cityId).get() as any;
  const ownUnitsArr: any[] = ownUnitsRes.data ?? [];
  const ownUnitsMap: Record<string, number> = {};
  for (const u of ownUnitsArr) ownUnitsMap[u.type] = u.count;
  for (const u of units) {
    if ((ownUnitsMap[u.type] ?? 0) < u.count) return c.json({ error: `Not enough ${u.type} units` }, 400);
  }

  const wonder = await getOrCreateWonder();
  const now = new Date().toISOString();

  const attackerUnits: Record<string, number> = {};
  for (const u of units) attackerUnits[u.type] = u.count;

  // Defender setup
  const defenderUnits: Record<string, number> = {};
  let defenderWallLevel = 0;
  let defenderTowerLevel = 0;
  let defenderTechBonuses: any = undefined;

  if (wonder.holderCityId && wonder.holderAllianceId !== allianceId) {
    const defUnitsRes = await db.from(COLLECTIONS.UNITS).eq('cityId', wonder.holderCityId).get() as any;
    for (const u of (defUnitsRes.data ?? [])) defenderUnits[u.type] = u.count;

    const defBuildingsRes = await db.from(COLLECTIONS.BUILDINGS).eq('cityId', wonder.holderCityId).get() as any;
    const defBuildings: any[] = defBuildingsRes.data ?? [];
    const tower = defBuildings.find((b) => b.type === 'TOWER');
    defenderWallLevel = Math.max(0, ...defBuildings.filter((b) => b.type === 'WALL' || b.type === 'TOWER').map((b) => b.level ?? 0));
    defenderTowerLevel = tower?.level ?? 0;

    const defTechRes = await db.from(COLLECTIONS.CITY_TECHS).eq('cityId', wonder.holderCityId).get() as any;
    defenderTechBonuses = calculateTechBonuses(defTechRes.data ?? []);
  }

  const atkTechRes = await db.from(COLLECTIONS.CITY_TECHS).eq('cityId', cityId).get() as any;
  const attackerTechBonuses = calculateTechBonuses(atkTechRes.data ?? []);

  const result = resolveBattle(
    attackerUnits as any,
    defenderUnits as any,
    defenderWallLevel,
    defenderTowerLevel,
    attackerTechBonuses,
    defenderTechBonuses,
    1.0
  );

  // Deduct attacker losses
  for (const u of units) {
    const losses = (result.attackerLosses as any)[u.type] ?? 0;
    const ownUnit = ownUnitsArr.find((ou: any) => ou.type === u.type);
    if (ownUnit && losses > 0) {
      await db.from(COLLECTIONS.UNITS).eq('id', ownUnit.id).merge({ count: Math.max(0, ownUnit.count - losses) }).execute();
    }
  }

  // Deduct defender losses
  if (wonder.holderCityId && wonder.holderAllianceId !== allianceId) {
    const defUnitsRes = await db.from(COLLECTIONS.UNITS).eq('cityId', wonder.holderCityId).get() as any;
    for (const u of (defUnitsRes.data ?? [])) {
      const losses = (result.defenderLosses as any)[u.type] ?? 0;
      if (losses > 0) {
        await db.from(COLLECTIONS.UNITS).eq('id', u.id).merge({ count: Math.max(0, u.count - losses) }).execute();
      }
    }
  }

  const allianceRes = await db.from(COLLECTIONS.ALLIANCES).eq('id', allianceId).getFirst() as any;
  const allianceName = allianceRes.data?.name ?? 'Alianza';

  await createActivityFeedEntry('WONDER_SIEGE_STARTED', allianceName, allianceId, { cityName: city.name, attackerWon: result.victory });

  if (result.victory) {
    await db.from(COLLECTIONS.WONDER).eq('id', WONDER_ID).merge({
      holderAllianceId: allianceId,
      holderCityId: cityId,
      controlStartedAt: wonder.holderAllianceId === allianceId ? wonder.controlStartedAt : now,
      daysControlled: wonder.holderAllianceId === allianceId ? wonder.daysControlled : 0,
      updatedAt: now,
    }).execute();

    await createActivityFeedEntry('WONDER_CAPTURED', allianceName, allianceId, { capturedBy: city.name, previousHolder: wonder.holderAllianceId });

    return c.json({ success: true, attackerWins: true, message: '¡Control del Wonder capturado!', losses: result.attackerLosses });
  } else {
    return c.json({ success: true, attackerWins: false, message: 'El ataque fue repelido.', losses: result.attackerLosses });
  }
});
