import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { CreateAllianceRequestSchema, ProposePeaceRequestSchema, UpdateAllianceRequestSchema } from '@etheria/shared';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { canEditAllianceForum, canManageAlliance, canUseAllianceCenter, createAllianceForUser, getAllianceMembershipForUser, joinAlliance } from '../domain/alliances.js';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { mergeRecordByLogicalId } from '../infrastructure/matecitoRecord.js';

const allianceRouter = new Hono();
const genId = () => crypto.randomUUID();

async function getAllianceDashboard(userId: string) {
  const gate = await canUseAllianceCenter(userId);
  const membership = await getAllianceMembershipForUser(userId);
  const alliancesRes = await db.from(COLLECTIONS.ALLIANCES).limit(100).get() as any;
  const alliances = alliancesRes.data ?? [];
  if (!membership?.allianceId) return { gate, membership, alliances, members: [], diplomacy: [], events: [], effects: [] };
  const [membersRes, diplomacyA, diplomacyB, eventsRes, effectsRes] = await Promise.all([
    db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq('allianceId', membership.allianceId).get() as any,
    db.from(COLLECTIONS.ALLIANCE_DIPLOMACY).eq('allianceAId', membership.allianceId).get() as any,
    db.from(COLLECTIONS.ALLIANCE_DIPLOMACY).eq('allianceBId', membership.allianceId).get() as any,
    db.from(COLLECTIONS.ALLIANCE_DIPLOMACY_EVENTS).eq('allianceId', membership.allianceId).limit(50).get() as any,
    db.from(COLLECTIONS.ALLIANCE_EFFECTS).eq('allianceId', membership.allianceId).get() as any,
  ]);
  return {
    gate,
    membership,
    alliances,
    members: membersRes.data ?? [],
    diplomacy: [...(diplomacyA.data ?? []), ...(diplomacyB.data ?? [])],
    events: (eventsRes.data ?? []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    effects: (effectsRes.data ?? []).filter((effect: any) => new Date(effect.expiresAt).getTime() > Date.now()),
  };
}

function orderedPair(a: string, b: string) {
  return [a, b].sort() as [string, string];
}

allianceRouter.get('/me', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  return c.json(await getAllianceDashboard(userId));
});

allianceRouter.post('/', requireMatecitoAuth(), zValidator('json', CreateAllianceRequestSchema), async (c) => {
  const userId = c.get('userId');
  const data = c.req.valid('json');
  const result = await createAllianceForUser({ userId, name: data.name, tag: data.tag });
  if ('error' in result) return c.json({ error: result.error }, 400);
  return c.json(result);
});

allianceRouter.post('/:id/join', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const result = await joinAlliance({ userId, allianceId: c.req.param('id') });
  if ('error' in result) return c.json({ error: result.error }, result.error === 'Alliance not found' ? 404 : 400);
  return c.json(result);
});

allianceRouter.patch('/me', requireMatecitoAuth(), zValidator('json', UpdateAllianceRequestSchema), async (c) => {
  const userId = c.get('userId');
  const membership = await getAllianceMembershipForUser(userId);
  if (!membership?.allianceId) return c.json({ error: 'No alliance' }, 404);
  if (!canEditAllianceForum(membership.role)) return c.json({ error: 'Insufficient role' }, 403);
  const data = c.req.valid('json');
  await mergeRecordByLogicalId(COLLECTIONS.ALLIANCES, membership.allianceId, { ...data, updatedAt: new Date().toISOString() });
  return c.json({ success: true });
});

allianceRouter.post('/diplomacy/peace', requireMatecitoAuth(), zValidator('json', ProposePeaceRequestSchema), async (c) => {
  const userId = c.get('userId');
  const membership = await getAllianceMembershipForUser(userId);
  if (!membership?.allianceId) return c.json({ error: 'No alliance' }, 404);
  if (!canManageAlliance(membership.role)) return c.json({ error: 'Insufficient role' }, 403);
  const data = c.req.valid('json');
  if (data.targetAllianceId === membership.allianceId) return c.json({ error: 'Invalid target' }, 400);
  const [allianceAId, allianceBId] = orderedPair(membership.allianceId, data.targetAllianceId);
  const existing = await db.from(COLLECTIONS.ALLIANCE_DIPLOMACY).eq('allianceAId', allianceAId).eq('allianceBId', allianceBId).getFirst() as any;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + data.durationHours * 3600_000).toISOString();
  if (existing.data?.status === 'PROPOSED' && existing.data.proposedByAllianceId !== membership.allianceId) {
    await mergeRecordByLogicalId(COLLECTIONS.ALLIANCE_DIPLOMACY, existing.data.id, { status: 'PEACE', acceptedAt: now.toISOString(), expiresAt });
    for (const allianceId of [membership.allianceId, data.targetAllianceId]) {
      await db.from(COLLECTIONS.ALLIANCE_EFFECTS).insert({ id: genId(), allianceId, type: 'PEACE_PRODUCTION', value: 0.05, reason: 'Tratado de paz', expiresAt, createdAt: now.toISOString() });
      await db.from(COLLECTIONS.ALLIANCE_DIPLOMACY_EVENTS).insert({ id: genId(), allianceId, otherAllianceId: allianceId === membership.allianceId ? data.targetAllianceId : membership.allianceId, type: 'PEACE_SIGNED', message: 'Tratado de paz firmado. Producción +5%.', public: true, createdAt: now.toISOString() });
      const alliance = await db.from(COLLECTIONS.ALLIANCES).eq('id', allianceId).getFirst() as any;
      await mergeRecordByLogicalId(COLLECTIONS.ALLIANCES, allianceId, { treatiesSigned: Number(alliance.data?.treatiesSigned ?? 0) + 1, updatedAt: now.toISOString() });
    }
    return c.json({ success: true, status: 'PEACE' });
  }
  if (existing.data) {
    await mergeRecordByLogicalId(COLLECTIONS.ALLIANCE_DIPLOMACY, existing.data.id, { status: 'PROPOSED', proposedByAllianceId: membership.allianceId, expiresAt, updatedAt: now.toISOString() });
  } else {
    await db.from(COLLECTIONS.ALLIANCE_DIPLOMACY).insert({ id: genId(), allianceAId, allianceBId, status: 'PROPOSED', proposedByAllianceId: membership.allianceId, expiresAt, createdAt: now.toISOString(), updatedAt: now.toISOString() });
  }
  return c.json({ success: true, status: 'PROPOSED' });
});

allianceRouter.post('/diplomacy/:id/break', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const membership = await getAllianceMembershipForUser(userId);
  if (!membership?.allianceId) return c.json({ error: 'No alliance' }, 404);
  if (!canManageAlliance(membership.role)) return c.json({ error: 'Insufficient role' }, 403);
  const treaty = await db.from(COLLECTIONS.ALLIANCE_DIPLOMACY).eq('id', c.req.param('id')).getFirst() as any;
  if (!treaty.data || (treaty.data.allianceAId !== membership.allianceId && treaty.data.allianceBId !== membership.allianceId)) return c.json({ error: 'Treaty not found' }, 404);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 3600_000).toISOString();
  await mergeRecordByLogicalId(COLLECTIONS.ALLIANCE_DIPLOMACY, treaty.data.id, { status: 'BROKEN', brokenByAllianceId: membership.allianceId, brokenAt: now.toISOString(), updatedAt: now.toISOString() });
  await db.from(COLLECTIONS.ALLIANCE_EFFECTS).insert({ id: genId(), allianceId: membership.allianceId, type: 'DISHONOR_ATTACK', value: -0.2, reason: 'Deshonor por romper tratado', expiresAt, createdAt: now.toISOString() });
  await db.from(COLLECTIONS.ALLIANCE_DIPLOMACY_EVENTS).insert({ id: genId(), allianceId: membership.allianceId, otherAllianceId: treaty.data.allianceAId === membership.allianceId ? treaty.data.allianceBId : treaty.data.allianceAId, type: 'TREATY_BROKEN', message: 'Tratado roto. Deshonor: ataque -20% por 24h.', public: true, createdAt: now.toISOString() });
  const alliance = await db.from(COLLECTIONS.ALLIANCES).eq('id', membership.allianceId).getFirst() as any;
  await mergeRecordByLogicalId(COLLECTIONS.ALLIANCES, membership.allianceId, { treatiesBroken: Number(alliance.data?.treatiesBroken ?? 0) + 1, honorScore: Math.max(0, Number(alliance.data?.honorScore ?? 100) - 20), updatedAt: now.toISOString() });
  return c.json({ success: true });
});

export { allianceRouter };
