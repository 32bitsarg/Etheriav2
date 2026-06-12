import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ChatChannelSchema, SendChatMessageRequestSchema } from '@etheria/shared';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { userRateLimit } from '../infrastructure/rateLimiter.js';
import { createChatMessage, listChatMessages } from '../domain/chat.js';
import { getSocialConfig } from '../domain/socialConfig.js';
import { getModerationState } from '../domain/moderationService.js';

const chatRouter = new Hono();

chatRouter.get('/messages', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const parsed = ChatChannelSchema.safeParse(c.req.query('channel'));
  if (!parsed.success) return c.json({ error: 'Invalid channel' }, 400);
  const config = getSocialConfig();
  const result = await listChatMessages({
    userId,
    channel: parsed.data,
    limit: config.chatBootstrapMessageLimit,
  });
  if (result.error !== null) return c.json({ error: result.error }, 403);
  return c.json({ messages: result.messages, allianceId: result.membership?.allianceId ?? null });
});

chatRouter.post('/messages', requireMatecitoAuth(), userRateLimit({ name: "chat", windowMs: 10_000, max: 8 }), zValidator('json', SendChatMessageRequestSchema), async (c) => {
  const userId = c.get('userId');
  const modState = await getModerationState(userId);
  if (modState.muted) return c.json({ error: "muted", reason: modState.muteReason, mutedUntil: modState.mutedUntil }, 403);
  const data = c.req.valid('json');
  const config = getSocialConfig();
  if (data.message.trim().length > config.chatMessageMaxLength) {
    return c.json({ error: `Message exceeds ${config.chatMessageMaxLength} characters` }, 400);
  }
  const result = await createChatMessage({
    userId,
    channel: data.channel,
    message: data.message,
    rateLimitWindowMs: config.chatRateLimitWindowMs,
    recipientUserId: data.recipientUserId,
  });
  if (result.error !== null) {
    const status = result.error.includes('wait') ? 429 : 403;
    return c.json({ error: result.error }, status);
  }
  return c.json({ message: result.message });
});

export { chatRouter };
