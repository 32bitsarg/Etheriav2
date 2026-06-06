import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { createActivityFeedEntry } from './activityFeed.js';

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
    const c = await db.from(COLLECTIONS.CITIES).eq('id', wonder.holderCityId).getFirst() as any;
    holderCityName = c.data?.name ?? null;
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

wonderRouter.post('/attack', requireMatecitoAuth(), zValidator('json', z.object({ cityId: z.string(), units: z.array(z.object({ type: z.string(), count: z.number() })) })), async (c) => {
  const userId = c.get('userId');
  const { cityId, units } = c.req.valid('json');

  const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', cityId).getFirst() as any;
  const city = cityRes.data;
  if (!city || city.userId !== userId) return c.json({ error: 'City not found' }, 404);

  const memberRes = await db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq('userId', userId).getFirst() as any;
  const allianceId = memberRes.data?.allianceId;
  if (!allianceId) return c.json({ error: 'Must be in an alliance to attack the Wonder' }, 400);

  const wonder = await getOrCreateWonder();
  const now = new Date().toISOString();

  // Simple rule: attacker takes control
  await db.from(COLLECTIONS.WONDER).eq('id', WONDER_ID).merge({
    holderAllianceId: allianceId,
    holderCityId: cityId,
    controlStartedAt: wonder.holderAllianceId === allianceId ? wonder.controlStartedAt : now,
    daysControlled: wonder.holderAllianceId === allianceId ? wonder.daysControlled : 0,
    updatedAt: now,
  }).execute();

  const allianceRes = await db.from(COLLECTIONS.ALLIANCES).eq('id', allianceId).getFirst() as any;
  await createActivityFeedEntry(
    'WONDER_CAPTURED',
    allianceRes.data?.name ?? 'Alianza',
    allianceId,
    { capturedBy: city.name, previousHolder: wonder.holderAllianceId }
  );

  return c.json({ success: true, message: '¡Control del Wonder capturado!' });
});
