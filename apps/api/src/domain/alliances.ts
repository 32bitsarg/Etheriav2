import { db, COLLECTIONS } from '../infrastructure/matecito.js';

export async function getAllianceMembershipForUser(userId: string) {
  const membershipRes = await db.from(COLLECTIONS.ALLIANCE_MEMBERS).eq('userId', userId).getFirst() as any;
  const membership = membershipRes.data ?? null;
  if (!membership) return null;

  const allianceRes = await db.from(COLLECTIONS.ALLIANCES).eq('id', membership.allianceId).getFirst() as any;
  return {
    ...membership,
    alliance: allianceRes.data ?? null,
  };
}

export async function getUserProfile(userId: string) {
  const profileRes = await db.from(COLLECTIONS.USERS).eq('id', userId).getFirst() as any;
  return profileRes.data ?? null;
}

export async function createAllianceForUser(input: { userId: string; name: string; tag: string }) {
  const gate = await canUseAllianceCenter(input.userId);
  if (!gate.allowed) return { error: gate.reason ?? 'Alliance Center level 5 required' as const };
  const existingMembership = await getAllianceMembershipForUser(input.userId);
  if (existingMembership) return { error: 'User already belongs to an alliance' as const };

  const duplicate = await db.from(COLLECTIONS.ALLIANCES).eq('tag', input.tag.toUpperCase()).getFirst() as any;
  if (duplicate.data) return { error: 'Alliance tag already exists' as const };

  const now = new Date().toISOString();
  const allianceId = crypto.randomUUID();
  await db.from(COLLECTIONS.ALLIANCES).insert({
    id: allianceId,
    name: input.name.trim(),
    tag: input.tag.trim().toUpperCase(),
    ownerUserId: input.userId,
    createdAt: now,
    updatedAt: now,
  });

  await db.from(COLLECTIONS.ALLIANCE_MEMBERS).insert({
    id: crypto.randomUUID(),
    allianceId,
    userId: input.userId,
    role: 'LEADER',
    createdAt: now,
  });

  return { allianceId, membership: await getAllianceMembershipForUser(input.userId) };
}

export async function canUseAllianceCenter(userId: string) {
  const cityRes = await db.from(COLLECTIONS.CITIES).eq('userId', userId).getFirst() as any;
  const city = cityRes.data;
  if (!city) return { allowed: false, reason: 'City not found', city: null as any };
  const buildingRes = await db.from(COLLECTIONS.BUILDINGS).eq('cityId', city.id).eq('type', 'ALLIANCE_CENTER').getFirst() as any;
  const level = Number(buildingRes.data?.level ?? 0);
  return { allowed: level >= 5, reason: level >= 5 ? null : 'Alliance Center level 5 required', city };
}

export function canManageAlliance(role: string | null | undefined) {
  return role === 'LEADER' || role === 'OFFICER' || role === 'DIPLOMAT';
}

export function canEditAllianceForum(role: string | null | undefined) {
  return role === 'LEADER' || role === 'OFFICER';
}

export async function joinAlliance(input: { userId: string; allianceId: string }) {
  const gate = await canUseAllianceCenter(input.userId);
  if (!gate.allowed) return { error: gate.reason ?? 'Alliance Center level 5 required' as const };
  const existingMembership = await getAllianceMembershipForUser(input.userId);
  if (existingMembership) return { error: 'User already belongs to an alliance' as const };

  const allianceRes = await db.from(COLLECTIONS.ALLIANCES).eq('id', input.allianceId).getFirst() as any;
  if (!allianceRes.data) return { error: 'Alliance not found' as const };

  await db.from(COLLECTIONS.ALLIANCE_MEMBERS).insert({
    id: crypto.randomUUID(),
    allianceId: input.allianceId,
    userId: input.userId,
    role: 'MEMBER',
    createdAt: new Date().toISOString(),
  });

  return { membership: await getAllianceMembershipForUser(input.userId) };
}
