import { prisma } from "@etheria/database";
import type { ModerationActionType } from "@etheria/database";

// ── Micro-cache (TTL 30s) para evitar query de estado en cada request autenticada ──

const stateCache = new Map<string, { at: number; banned: boolean; banReason: string | null; bannedUntil: Date | null; muted: boolean; muteReason: string | null; mutedUntil: Date | null }>();
const CACHE_TTL_MS = 30_000;

export function invalidateModerationCache(userId: string) {
  stateCache.delete(userId);
}

export async function getModerationState(userId: string) {
  const cached = stateCache.get(userId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { bannedAt: true, bannedUntil: true, banReason: true, mutedAt: true, mutedUntil: true, muteReason: true },
  });

  const now = new Date();
  const state = {
    at: Date.now(),
    banned: !!user?.bannedAt && (user.bannedUntil === null || user.bannedUntil > now),
    banReason: user?.banReason ?? null,
    bannedUntil: user?.bannedUntil ?? null,
    muted: !!user?.mutedAt && (user.mutedUntil === null || user.mutedUntil > now),
    muteReason: user?.muteReason ?? null,
    mutedUntil: user?.mutedUntil ?? null,
  };

  stateCache.set(userId, state);
  return state;
}

export function isBanActive(bannedAt: Date | null, bannedUntil: Date | null, now = new Date()) {
  return !!bannedAt && (bannedUntil === null || bannedUntil > now);
}

export function isMuteActive(mutedAt: Date | null, mutedUntil: Date | null, now = new Date()) {
  return !!mutedAt && (mutedUntil === null || mutedUntil > now);
}

async function logAction(userId: string, action: ModerationActionType, reason?: string | null, expiresAt?: Date | null, metadata?: object | null) {
  await prisma.moderationAction.create({
    data: { userId, action, reason, expiresAt: expiresAt ?? null, metadata: metadata ? metadata as any : undefined },
  });
}

export async function banUser(userId: string, reason: string, durationHours: number | null) {
  const bannedUntil = durationHours !== null ? new Date(Date.now() + durationHours * 3_600_000) : null;
  await prisma.user.update({ where: { id: userId }, data: { bannedAt: new Date(), bannedUntil, banReason: reason } });
  await prisma.session.deleteMany({ where: { userId } });
  await logAction(userId, "BAN", reason, bannedUntil);
  invalidateModerationCache(userId);
}

export async function unbanUser(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { bannedAt: null, bannedUntil: null, banReason: null } });
  await logAction(userId, "UNBAN");
  invalidateModerationCache(userId);
}

export async function muteUser(userId: string, reason: string, durationHours: number | null) {
  const mutedUntil = durationHours !== null ? new Date(Date.now() + durationHours * 3_600_000) : null;
  await prisma.user.update({ where: { id: userId }, data: { mutedAt: new Date(), mutedUntil, muteReason: reason } });
  await logAction(userId, "MUTE", reason, mutedUntil);
  invalidateModerationCache(userId);
}

export async function unmuteUser(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { mutedAt: null, mutedUntil: null, muteReason: null } });
  await logAction(userId, "UNMUTE");
  invalidateModerationCache(userId);
}

export async function kickSessions(userId: string) {
  const result = await prisma.session.deleteMany({ where: { userId } });
  await logAction(userId, "KICK_SESSIONS");
  invalidateModerationCache(userId);
  return result.count;
}

export async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  const blocks = await prisma.userBlock.findMany({
    where: { blockerUserId: userId },
    select: { blockedUserId: true },
  });
  return new Set(blocks.map((b) => b.blockedUserId));
}

export async function isBlockedBy(targetUserId: string, senderUserId: string): Promise<boolean> {
  const block = await prisma.userBlock.findUnique({
    where: { blockerUserId_blockedUserId: { blockerUserId: targetUserId, blockedUserId: senderUserId } },
  });
  return block !== null;
}

export async function deleteChatMessageWithAudit(messageId: string, senderUserId: string, messageContent: object) {
  await prisma.chatMessage.delete({ where: { id: messageId } });
  await logAction(senderUserId, "DELETE_CHAT_MESSAGE", null, null, messageContent);
}
