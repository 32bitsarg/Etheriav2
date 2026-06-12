import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { createNotification } from './notifications.js';
import { unlockAchievement } from './achievements.js';

const genId = () => crypto.randomUUID();

export const espionageRouter = new Hono();

const SendSpySchema = z.object({
  spyCityId: z.string(),
  targetCityId: z.string(),
});

espionageRouter.post('/send', requireMatecitoAuth(), zValidator('json', SendSpySchema), async (c) => {
  const userId = c.get('userId');
  const { spyCityId, targetCityId } = c.req.valid('json');

  const spyCityRes = await db.from(COLLECTIONS.CITIES).eq('id', spyCityId).getFirst() as any;
  const spyCity = spyCityRes.data;
  if (!spyCity || spyCity.userId !== userId) return c.json({ error: 'City not found' }, 404);

  const targetRes = await db.from(COLLECTIONS.CITIES).eq('id', targetCityId).getFirst() as any;
  const target = targetRes.data;
  if (!target) return c.json({ error: 'Target city not found' }, 404);
  if (spyCityId === targetCityId) return c.json({ error: 'Cannot spy on yourself' }, 400);

  // Check if spy unit available
  const unitsRes = await db.from(COLLECTIONS.UNITS).eq('cityId', spyCityId).get() as any;
  const spyUnit = (unitsRes.data ?? []).find((u: any) => u.type === 'SPY');
  if (!spyUnit || spyUnit.count < 1) return c.json({ error: 'No spy units available' }, 400);

  // Calculate travel time
  const distance = Math.sqrt(Math.pow(target.posX - spyCity.posX, 2) + Math.pow(target.posY - spyCity.posY, 2));
  const travelSeconds = Math.max(10, Math.floor(distance * 4));
  const arrivesAt = new Date(Date.now() + travelSeconds * 1000).toISOString();

  // Deduct spy
  await db.from(COLLECTIONS.UNITS).eq('id', spyUnit.id).merge({ count: spyUnit.count - 1 }).execute();

  const missionId = genId();
  await db.from(COLLECTIONS.ESPIONAGE_MISSIONS).insert({
    id: missionId,
    spyCityId,
    targetCityId,
    status: 'TRAVELING',
    startedAt: new Date().toISOString(),
    arrivesAt,
  });

  return c.json({ missionId, arrivesAt, travelSeconds });
});

espionageRouter.get('/missions', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const cityId = c.req.query('cityId');
  if (!cityId) return c.json({ error: 'cityId required' }, 400);

  const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', cityId).getFirst() as any;
  if (!cityRes.data || cityRes.data.userId !== userId) return c.json({ error: 'City not found' }, 404);

  const res = await db.from(COLLECTIONS.ESPIONAGE_MISSIONS)
    .eq('spyCityId', cityId)
    .order('startedAt', { ascending: false })
    .limit(20)
    .get() as any;

  return c.json({ missions: res.data ?? [] });
});

// Internal: resolve espionage mission (called by tick job)
export async function resolveEspionageMission(missionId: string) {
  const missionRes = await db.from(COLLECTIONS.ESPIONAGE_MISSIONS).eq('id', missionId).getFirst() as any;
  const mission = missionRes.data;
  if (!mission || mission.status !== 'TRAVELING') return;

  const targetRes = await db.from(COLLECTIONS.CITIES).eq('id', mission.targetCityId).getFirst() as any;
  const target = targetRes.data;
  if (!target) return;

  // Tower level determines detection chance
  const buildingsRes = await db.from(COLLECTIONS.BUILDINGS).eq('cityId', mission.targetCityId).get() as any;
  const tower = (buildingsRes.data ?? []).find((b: any) => b.type === 'TOWER');
  const towerLevel = tower?.level ?? 0;
  const detectionChance = Math.min(0.7, towerLevel * 0.08); // 8% per tower level, max 70%
  const caught = Math.random() < detectionChance;

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 60000).toISOString(); // 30 min intel window

  if (caught) {
    await db.from(COLLECTIONS.ESPIONAGE_MISSIONS).eq('id', missionId).merge({
      status: 'CAUGHT',
      resolvedAt: now,
    }).execute();

    const spyCityRes = await db.from(COLLECTIONS.CITIES).eq('id', mission.spyCityId).getFirst() as any;
    // Notify the target that someone tried to spy
    await createNotification(
      target.userId,
      'SPY_RESULT',
      '¡Espía capturado!',
      `Capturaste un espía de ${spyCityRes.data?.name ?? 'ciudad enemiga'}`,
      { missionId, caught: true }
    );

    // Notify the spy that they were caught
    const spyUserRes = await db.from(COLLECTIONS.CITIES).eq('id', mission.spyCityId).getFirst() as any;
    if (spyUserRes.data) {
      await createNotification(
        spyUserRes.data.userId,
        'SPY_RESULT',
        'Espía capturado',
        `Tu espía fue capturado en ${target.name}`,
        { missionId, caught: true }
      );
    }
  } else {
    // Gather intelligence
    const unitsRes = await db.from(COLLECTIONS.UNITS).eq('cityId', mission.targetCityId).get() as any;
    const buildQueuesRes = await db.from(COLLECTIONS.BUILD_QUEUES)
      .eq('cityId', mission.targetCityId)
      .eq('isComplete', false)
      .get() as any;

    const intel = {
      resources: { gold: target.gold, wood: target.wood, stone: target.stone, food: target.food },
      units: Object.fromEntries((unitsRes.data ?? []).map((u: any) => [u.type, u.count])),
      buildQueue: (buildQueuesRes.data ?? []).map((q: any) => ({
        buildingType: q.buildingType,
        targetLevel: q.targetLevel,
        completesAt: q.completesAt,
      })),
      buildings: (buildingsRes.data ?? []).map((b: any) => ({ type: b.type, level: b.level })),
    };

    await db.from(COLLECTIONS.ESPIONAGE_MISSIONS).eq('id', missionId).merge({
      status: 'SUCCESS',
      result: intel,
      expiresAt,
      resolvedAt: now,
    }).execute();

    const spyCityRes = await db.from(COLLECTIONS.CITIES).eq('id', mission.spyCityId).getFirst() as any;
    if (spyCityRes.data) {
      unlockAchievement(spyCityRes.data.userId, 'spy_success').catch(() => {});
      await createNotification(
        spyCityRes.data.userId,
        'SPY_RESULT',
        'Informe de espionaje',
        `Tu espía regresó con información de ${target.name}`,
        { missionId, caught: false }
      );
    }
  }
}
