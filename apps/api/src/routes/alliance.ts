import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ContributeAllianceObjectiveRequestSchema, CreateAllianceRequestSchema, ProposePeaceRequestSchema, UpdateAllianceRequestSchema } from '@etheria/shared';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { canEditAllianceForum, canManageAlliance, canUseAllianceCenter, createAllianceForUser, getAllianceMembershipForUser, joinAlliance } from '../domain/alliances.js';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { mergeRecordByLogicalId } from '../infrastructure/matecitoRecord.js';
import { contributeAllianceObjective, ensureAllianceObjective } from '../domain/allianceObjectives.js';
import { prisma } from '@etheria/database';

const allianceRouter = new Hono();
const genId = () => crypto.randomUUID();

async function getAllianceDashboard(userId: string) {
  const gate = await canUseAllianceCenter(userId);
  const membership = await getAllianceMembershipForUser(userId);
  const alliances = (await prisma.alliance.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
  }) as any[]).filter((alliance) => !alliance.disbandedAt);
  if (!membership?.allianceId) return { gate, membership, alliances, members: [], diplomacy: [], events: [], effects: [], objectives: [], objectiveContributions: [] };
  const objective = await ensureAllianceObjective(membership.allianceId);
  const [members, diplomacyA, diplomacyB, events, effects] = await Promise.all([
    prisma.allianceMember.findMany({ where: { allianceId: membership.allianceId } }),
    prisma.allianceDiplomacy.findMany({ where: { allianceAId: membership.allianceId } }),
    prisma.allianceDiplomacy.findMany({ where: { allianceBId: membership.allianceId } }),
    prisma.allianceDiplomacyEvent.findMany({ where: { allianceId: membership.allianceId }, take: 50, orderBy: { createdAt: 'desc' } }),
    prisma.allianceEffect.findMany({ where: { allianceId: membership.allianceId, expiresAt: { gt: new Date() } } }),
  ]);
  return {
    gate,
    membership,
    alliances,
    members,
    diplomacy: [...diplomacyA, ...diplomacyB],
    events,
    effects,
    objectives: objective ? [objective] : [],
    objectiveContributions: [],
  };
}

function orderedPair(a: string, b: string) {
  return [a, b].sort() as [string, string];
}

async function getMembershipById(memberId: string) {
  const res = await db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq('id', memberId).getFirst() as any;
  return res.data ?? null;
}

async function countAllianceMembers(allianceId: string) {
  return prisma.allianceMember.count({ where: { allianceId } });
}

async function addAllianceEvent(allianceId: string, type: string, message: string, otherAllianceId?: string | null) {
  await db.from(COLLECTIONS.ALLIANCE_DIPLOMACY_EVENTS).insert({
    id: genId(),
    allianceId,
    otherAllianceId: otherAllianceId ?? null,
    type,
    message,
    public: false,
    createdAt: new Date().toISOString(),
  });
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
  try {
    const { createActivityFeedEntry } = await import('./activityFeed.js');
    await createActivityFeedEntry('ALLIANCE_FORMED', data.name, (result as any).id ?? userId, { tag: data.tag });
  } catch (_) { /* non-critical */ }
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

allianceRouter.post('/me/leave', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const membership = await getAllianceMembershipForUser(userId);
  if (!membership?.allianceId) return c.json({ error: 'No alliance' }, 404);
  if (membership.role === 'LEADER' && (await countAllianceMembers(membership.allianceId)) > 1) return c.json({ error: 'Transfer leadership before leaving' }, 400);
  await db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq('id', membership.id).delete() as any;
  await addAllianceEvent(membership.allianceId, 'MEMBER_LEFT', 'Un miembro abandonó la alianza.');
  return c.json({ success: true });
});

allianceRouter.post('/me/disband', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const membership = await getAllianceMembershipForUser(userId);
  if (!membership?.allianceId) return c.json({ error: 'No alliance' }, 404);
  if (membership.role !== 'LEADER') return c.json({ error: 'Insufficient role' }, 403);
  const members = await prisma.allianceMember.findMany({ where: { allianceId: membership.allianceId }, select: { id: true } });
  for (const member of members) await db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq('id', member.id).delete() as any;
  await mergeRecordByLogicalId(COLLECTIONS.ALLIANCES, membership.allianceId, { disbandedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  return c.json({ success: true });
});

allianceRouter.post('/members/:memberId/kick', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const membership = await getAllianceMembershipForUser(userId);
  if (!membership?.allianceId) return c.json({ error: 'No alliance' }, 404);
  if (membership.role !== 'LEADER' && membership.role !== 'OFFICER') return c.json({ error: 'Insufficient role' }, 403);
  const target = await getMembershipById(c.req.param('memberId'));
  if (!target || target.allianceId !== membership.allianceId) return c.json({ error: 'Member not found' }, 404);
  if (target.role === 'LEADER' || target.id === membership.id) return c.json({ error: 'Invalid target' }, 400);
  if (membership.role === 'OFFICER' && target.role !== 'MEMBER') return c.json({ error: 'Insufficient role' }, 403);
  await db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq('id', target.id).delete() as any;
  await addAllianceEvent(membership.allianceId, 'MEMBER_KICKED', 'Un miembro fue expulsado de la alianza.');
  return c.json({ success: true });
});

allianceRouter.patch('/members/:memberId/role', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const membership = await getAllianceMembershipForUser(userId);
  if (!membership?.allianceId) return c.json({ error: 'No alliance' }, 404);
  if (membership.role !== 'LEADER') return c.json({ error: 'Insufficient role' }, 403);
  const body = await c.req.json().catch(() => ({})) as { role?: string };
  const nextRole = body.role;
  if (!['MEMBER', 'OFFICER', 'DIPLOMAT'].includes(nextRole ?? '')) return c.json({ error: 'Invalid role' }, 400);
  const target = await getMembershipById(c.req.param('memberId'));
  if (!target || target.allianceId !== membership.allianceId) return c.json({ error: 'Member not found' }, 404);
  if (target.role === 'LEADER') return c.json({ error: 'Invalid target' }, 400);
  await mergeRecordByLogicalId(COLLECTIONS.ALLIANCE_MEMBERS, target.id, { role: nextRole, updatedAt: new Date().toISOString() });
  await addAllianceEvent(membership.allianceId, 'MEMBER_ROLE_CHANGED', 'Rol de miembro actualizado.');
  return c.json({ success: true });
});

allianceRouter.post('/members/:memberId/transfer', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const membership = await getAllianceMembershipForUser(userId);
  if (!membership?.allianceId) return c.json({ error: 'No alliance' }, 404);
  if (membership.role !== 'LEADER') return c.json({ error: 'Insufficient role' }, 403);
  const target = await getMembershipById(c.req.param('memberId'));
  if (!target || target.allianceId !== membership.allianceId || target.id === membership.id) return c.json({ error: 'Member not found' }, 404);
  await mergeRecordByLogicalId(COLLECTIONS.ALLIANCE_MEMBERS, membership.id, { role: 'OFFICER', updatedAt: new Date().toISOString() });
  await mergeRecordByLogicalId(COLLECTIONS.ALLIANCE_MEMBERS, target.id, { role: 'LEADER', updatedAt: new Date().toISOString() });
  await mergeRecordByLogicalId(COLLECTIONS.ALLIANCES, membership.allianceId, { ownerUserId: target.userId, updatedAt: new Date().toISOString() });
  await addAllianceEvent(membership.allianceId, 'LEADERSHIP_TRANSFERRED', 'Liderazgo de alianza transferido.');
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

allianceRouter.post('/objectives/:id/contribute', requireMatecitoAuth(), zValidator('json', ContributeAllianceObjectiveRequestSchema), async (c) => {
  const userId = c.get('userId');
  const membership = await getAllianceMembershipForUser(userId);
  if (!membership?.allianceId) return c.json({ error: 'No alliance' }, 404);
  const result = await contributeAllianceObjective({
    userId,
    allianceId: membership.allianceId,
    objectiveId: c.req.param('id'),
    cityId: c.req.valid('json').cityId,
    resources: c.req.valid('json').resources,
  });
  if ('error' in result) return c.json({ error: result.error }, result.status as any);
  return c.json(result);
});

export { allianceRouter };
