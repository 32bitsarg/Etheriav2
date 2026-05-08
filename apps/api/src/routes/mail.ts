import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SendMailMessageRequestSchema } from '@etheria/shared';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { mergeRecordByLogicalId } from '../infrastructure/matecitoRecord.js';
import { sendMailMessage } from '../domain/mail.js';

export const mailRouter = new Hono();

mailRouter.get('/messages', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const [inboxRes, sentRes] = await Promise.all([
    db.from(COLLECTIONS.MAIL_MESSAGES).eq('recipientUserId', userId).limit(80).get() as any,
    db.from(COLLECTIONS.MAIL_MESSAGES).eq('senderUserId', userId).limit(40).get() as any,
  ]);

  const inbox = ((inboxRes.data ?? []) as any[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const sent = ((sentRes.data ?? []) as any[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadCount = inbox.filter((message) => !message.readAt).length;

  return c.json({ inbox, sent, unreadCount });
});

mailRouter.post('/messages', requireMatecitoAuth(), zValidator('json', SendMailMessageRequestSchema), async (c) => {
  const userId = c.get('userId');
  const data = c.req.valid('json');

  const result = await sendMailMessage({ senderUserId: userId, ...data });
  if ('error' in result) return c.json({ error: result.error }, result.error === 'Recipient city not found' ? 404 : 400);
  return c.json(result);
});

mailRouter.post('/messages/:id/read', requireMatecitoAuth(), zValidator('json', z.object({ read: z.boolean().default(true) })), async (c) => {
  const userId = c.get('userId');
  const messageId = c.req.param('id');
  const data = c.req.valid('json');
  const messageRes = await db.from(COLLECTIONS.MAIL_MESSAGES).eq('id', messageId).getFirst() as any;
  const message = messageRes.data;

  if (!message || message.recipientUserId !== userId) return c.json({ error: 'Message not found' }, 404);

  await mergeRecordByLogicalId(COLLECTIONS.MAIL_MESSAGES, messageId, {
    readAt: data.read ? new Date().toISOString() : null,
  });

  return c.json({ success: true, id: messageId, readAt: data.read ? new Date().toISOString() : null });
});
