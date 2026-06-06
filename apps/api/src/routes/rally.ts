import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { createNotification } from './notifications.js';

const genId = () => crypto.randomUUID();

export const rallyRouter = new Hono();

const CreateRallySchema = z.object({
  cityId: z.string(),
  targetCityId: z.string().optional(),
  targetCampId: z.string().optional(),
  minutesUntilLaunch: z.number().min(5).max(120).default(30),
});

const JoinRallySchema = z.object({
  cityId: z.string(),
  units: z.array(z.object({ type: z.string(), count: z.number().int().positive() })),
});

rallyRouter.get('/active', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const cityId = c.req.query('cityId');
  if (!cityId) return c.json({ error: 'cityId required' }, 400);

  const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', cityId).getFirst() as any;
  const city = cityRes.data;
  if (!city || city.userId !== userId) return c.json({ error: 'City not found' }, 404);

  // Get alliance rally attacks
  const memberRes = await db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq('userId', userId).getFirst() as any;
  const allianceId = memberRes.data?.allianceId;
  if (!allianceId) return c.json({ rallies: [] });

  const membersRes = await db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq('allianceId', allianceId).get() as any;
  const memberCityIds = await Promise.all((membersRes.data ?? []).map(async (m: any) => {
    const c = await db.from(COLLECTIONS.CITIES).eq('userId', m.userId).getFirst() as any;
    return c.data?.id;
  }));

  const ralliesRes = await db.from(COLLECTIONS.RALLY_ATTACKS)
    .eq('status', 'OPEN')
    .get() as any;

  const allianceRallies = (ralliesRes.data ?? []).filter((r: any) =>
    memberCityIds.includes(r.createdByCityId)
  );

  const enriched = await Promise.all(allianceRallies.map(async (rally: any) => {
    const participantsRes = await db.from(COLLECTIONS.RALLY_PARTICIPANTS).eq('rallyId', rally.id).get() as any;
    return { ...rally, participants: participantsRes.data ?? [] };
  }));

  return c.json({ rallies: enriched });
});

rallyRouter.post('/', requireMatecitoAuth(), zValidator('json', CreateRallySchema), async (c) => {
  const userId = c.get('userId');
  const { cityId, targetCityId, targetCampId, minutesUntilLaunch } = c.req.valid('json');

  const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', cityId).getFirst() as any;
  const city = cityRes.data;
  if (!city || city.userId !== userId) return c.json({ error: 'City not found' }, 404);
  if (!targetCityId && !targetCampId) return c.json({ error: 'Target required' }, 400);

  const memberRes = await db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq('userId', userId).getFirst() as any;
  const allianceId = memberRes.data?.allianceId;
  if (!allianceId) return c.json({ error: 'Must be in an alliance to create a rally' }, 400);

  const launchAt = new Date(Date.now() + minutesUntilLaunch * 60000).toISOString();
  const rallyId = genId();

  await db.from(COLLECTIONS.RALLY_ATTACKS).insert({
    id: rallyId,
    createdByCityId: cityId,
    targetCityId: targetCityId ?? null,
    targetCampId: targetCampId ?? null,
    launchAt,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  });

  // Notify all alliance members
  const membersRes = await db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq('allianceId', allianceId).get() as any;
  for (const member of membersRes.data ?? []) {
    if (member.userId === userId) continue;
    await createNotification(
      member.userId,
      'RALLY_INVITE',
      '¡Rally de alianza!',
      `${city.name} creó un rally. ¡Únete antes de que sea tarde! Sale en ${minutesUntilLaunch} min`,
      { rallyId }
    );
  }

  return c.json({ rallyId, launchAt });
});

rallyRouter.post('/:id/join', requireMatecitoAuth(), zValidator('json', JoinRallySchema), async (c) => {
  const userId = c.get('userId');
  const rallyId = c.req.param('id');
  const { cityId, units } = c.req.valid('json');

  const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', cityId).getFirst() as any;
  const city = cityRes.data;
  if (!city || city.userId !== userId) return c.json({ error: 'City not found' }, 404);

  const rallyRes = await db.from(COLLECTIONS.RALLY_ATTACKS).eq('id', rallyId).getFirst() as any;
  const rally = rallyRes.data;
  if (!rally || rally.status !== 'OPEN') return c.json({ error: 'Rally not available' }, 404);
  if (new Date(rally.launchAt) < new Date()) return c.json({ error: 'Rally already launched' }, 400);

  // Check if already joined
  const existingRes = await db.from(COLLECTIONS.RALLY_PARTICIPANTS)
    .eq('rallyId', rallyId)
    .eq('cityId', cityId)
    .getFirst() as any;
  if (existingRes.data) return c.json({ error: 'Already joined this rally' }, 400);

  await db.from(COLLECTIONS.RALLY_PARTICIPANTS).insert({
    id: genId(),
    rallyId,
    userId,
    cityId,
    units,
    joinedAt: new Date().toISOString(),
  });

  return c.json({ success: true });
});

rallyRouter.post('/:id/cancel', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const rallyId = c.req.param('id');

  const rallyRes = await db.from(COLLECTIONS.RALLY_ATTACKS).eq('id', rallyId).getFirst() as any;
  const rally = rallyRes.data;
  if (!rally) return c.json({ error: 'Rally not found' }, 404);

  const creatorCityRes = await db.from(COLLECTIONS.CITIES).eq('id', rally.createdByCityId).getFirst() as any;
  if (creatorCityRes.data?.userId !== userId) return c.json({ error: 'Not authorized' }, 403);

  await db.from(COLLECTIONS.RALLY_ATTACKS).eq('id', rallyId).merge({ status: 'CANCELLED' }).execute();
  return c.json({ success: true });
});
