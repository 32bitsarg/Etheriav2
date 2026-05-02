import type { ChatChannel } from '@etheria/shared';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { getAllianceMembershipForUser, getUserProfile } from './alliances.js';

export async function getChatAccess(userId: string, channel: ChatChannel) {
  const membership = await getAllianceMembershipForUser(userId);
  if (channel === 'ALLIANCE' && !membership?.allianceId) {
    return { error: 'Alliance membership required', membership: null };
  }
  return { error: null, membership };
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
    query = query.eq('channel', 'GLOBAL');
  } else {
    query = query.eq('channel', 'ALLIANCE').eq('allianceId', access.membership!.allianceId);
  }

  const res = await query.get() as any;
  const messages = ((res.data ?? []) as Array<Record<string, unknown>>).sort(
    (a, b) => new Date(String(a.createdAt ?? 0)).getTime() - new Date(String(b.createdAt ?? 0)).getTime()
  );

  return { error: null, membership: access.membership, messages };
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
    return { error: 'Please wait a few seconds before sending another message', membership: access.membership };
  }

  return { error: null, membership: access.membership };
}

export async function createChatMessage(input: {
  userId: string;
  channel: ChatChannel;
  message: string;
  rateLimitWindowMs: number;
}) {
  const check = await canSendChatMessage(input);
  if (check.error) return check;

  const profile = await getUserProfile(input.userId);
  const senderName = profile?.name?.trim() || profile?.email?.split('@')[0] || 'Commander';
  const record = {
    id: crypto.randomUUID(),
    channel: input.channel,
    senderUserId: input.userId,
    senderName,
    message: input.message.trim(),
    allianceId: input.channel === 'ALLIANCE' ? check.membership!.allianceId : null,
    createdAt: new Date().toISOString(),
  };

  await db.from(COLLECTIONS.CHAT_MESSAGES).insert(record);
  return { error: null, message: record };
}
