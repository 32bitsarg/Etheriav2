import type { ChatChannel } from '@etheria/shared';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { getAllianceMembershipForUser, getUserProfile } from './alliances.js';
import { getBlockedUserIds, isBlockedBy } from './moderationService.js';

// Chat is world-scoped: GLOBAL is per-world, PRIVATE only between players of
// the same world, ALLIANCE implicitly (an alliance lives in one world).
async function getUserWorldId(userId: string): Promise<string | null> {
  const cityRes = await db.from(COLLECTIONS.CITIES).eq('userId', userId).getFirst() as any;
  return cityRes.data?.worldId ?? null;
}

export async function getChatAccess(userId: string, channel: ChatChannel) {
  const membership = await getAllianceMembershipForUser(userId);
  if (channel === 'ALLIANCE' && !membership?.allianceId) {
    return { error: 'Alliance membership required' as const, membership: null, worldId: null };
  }
  const worldId = await getUserWorldId(userId);
  if (!worldId) {
    return { error: 'City required to use chat' as const, membership: null, worldId: null };
  }
  return { error: null, membership, worldId };
}

export async function listChatMessages(input: {
  userId: string;
  channel: ChatChannel;
  limit: number;
}) {
  const access = await getChatAccess(input.userId, input.channel);
  if (access.error) return access;

  let query = db.from(COLLECTIONS.CHAT_MESSAGES).limit(input.limit);
  if (input.channel === 'GLOBAL') {
    // Legacy rows (pre world-scoping) have worldId null and stay hidden;
    // every new message is stamped with the sender's world.
    query = query.eq('channel', 'GLOBAL').eq('worldId', access.worldId);
  } else if (input.channel === 'ALLIANCE') {
    query = query.eq('channel', 'ALLIANCE').eq('allianceId', access.membership!.allianceId);
  } else {
    // PRIVATE: single inbox-style stream — everything the user sent or received
    const [sentRes, receivedRes] = await Promise.all([
      db.from(COLLECTIONS.CHAT_MESSAGES).eq('channel', 'PRIVATE').eq('senderUserId', input.userId).limit(input.limit).get() as any,
      db.from(COLLECTIONS.CHAT_MESSAGES).eq('channel', 'PRIVATE').eq('recipientUserId', input.userId).limit(input.limit).get() as any,
    ]);
    const blockedIds = await getBlockedUserIds(input.userId);
    const merged = new Map<string, Record<string, unknown>>();
    for (const row of [...(sentRes.data ?? []), ...(receivedRes.data ?? [])]) {
      if (!blockedIds.has(String(row.senderUserId ?? ""))) merged.set(String(row.id), row);
    }
    const messages = [...merged.values()].sort(
      (a, b) => new Date(String(a.createdAt ?? 0)).getTime() - new Date(String(b.createdAt ?? 0)).getTime()
    ).slice(-input.limit);
    return { error: null, membership: access.membership, worldId: access.worldId, messages };
  }

  const res = await query.get() as any;
  const blockedIds = await getBlockedUserIds(input.userId);
  const messages = ((res.data ?? []) as Array<Record<string, unknown>>)
    .filter((m) => !blockedIds.has(String(m.senderUserId ?? "")))
    .sort((a, b) => new Date(String(a.createdAt ?? 0)).getTime() - new Date(String(b.createdAt ?? 0)).getTime());

  return { error: null, membership: access.membership, worldId: access.worldId, messages };
}

export async function canSendChatMessage(input: {
  userId: string;
  channel: ChatChannel;
  rateLimitWindowMs: number;
}) {
  const access = await getChatAccess(input.userId, input.channel);
  if (access.error) return access;

  const recentRes = await db.from(COLLECTIONS.CHAT_MESSAGES).eq('senderUserId', input.userId).limit(5).get() as any;
  const recentMessages = (recentRes.data ?? []) as Array<{ createdAt?: string }>;
  const latest = recentMessages.sort(
    (a, b) => new Date(String(b.createdAt ?? 0)).getTime() - new Date(String(a.createdAt ?? 0)).getTime()
  )[0];

  if (latest?.createdAt && Date.now() - new Date(latest.createdAt).getTime() < input.rateLimitWindowMs) {
    return { error: 'Please wait a few seconds before sending another message' as const, membership: access.membership, worldId: access.worldId };
  }

  return { error: null, membership: access.membership, worldId: access.worldId };
}

export async function createChatMessage(input: {
  userId: string;
  channel: ChatChannel;
  message: string;
  rateLimitWindowMs: number;
  recipientUserId?: string;
}) {
  const check = await canSendChatMessage(input);
  if (check.error) return check;

  let recipientUserId: string | null = null;
  let recipientName: string | null = null;
  if (input.channel === 'PRIVATE') {
    if (!input.recipientUserId) return { error: 'Recipient required for private messages' as const, membership: check.membership };
    if (input.recipientUserId === input.userId) return { error: 'Cannot message yourself' as const, membership: check.membership };
    const recipientWorldId = await getUserWorldId(input.recipientUserId);
    if (!recipientWorldId || recipientWorldId !== check.worldId) {
      return { error: 'Recipient must be a player of your world' as const, membership: check.membership };
    }
    if (await isBlockedBy(input.recipientUserId, input.userId)) {
      return { error: 'Recipient unavailable' as const, membership: check.membership };
    }
    const recipientProfile = await getUserProfile(input.recipientUserId);
    recipientUserId = input.recipientUserId;
    recipientName = recipientProfile?.name?.trim() || recipientProfile?.email?.split('@')[0] || 'Commander';
  }

  const profile = await getUserProfile(input.userId);
  const senderName = profile?.name?.trim() || profile?.email?.split('@')[0] || 'Commander';
  const record = {
    id: crypto.randomUUID(),
    channel: input.channel,
    senderUserId: input.userId,
    senderName,
    message: input.message.trim(),
    allianceId: input.channel === 'ALLIANCE' ? check.membership!.allianceId : null,
    worldId: check.worldId,
    recipientUserId,
    recipientName,
    createdAt: new Date().toISOString(),
  };

  await db.from(COLLECTIONS.CHAT_MESSAGES).insert(record);
  return { error: null, message: record };
}
