import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SendMailMessageRequestSchema } from '@etheria/shared';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { getUserProfile } from '../domain/alliances.js';
import { mergeRecordByLogicalId } from '../infrastructure/matecitoRecord.js';

const genId = () => crypto.randomUUID();

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

  const [sender, recipientCityRes] = await Promise.all([
    getUserProfile(userId),
    db.from(COLLECTIONS.CITIES).eq('id', data.recipientCityId).getFirst() as any,
  ]);

  const recipientCity = recipientCityRes.data;
  if (!recipientCity) return c.json({ error: 'Recipient city not found' }, 404);
  if (recipientCity.userId === userId) return c.json({ error: 'Cannot send mail to yourself' }, 400);

  const recipient = await getUserProfile(recipientCity.userId);
  const nowIso = new Date().toISOString();
  const message = {
    id: genId(),
    senderUserId: userId,
    senderName: sender?.name?.trim() || sender?.email?.split('@')[0] || 'Commander',
    recipientUserId: recipientCity.userId,
    recipientName: recipient?.name?.trim() || recipient?.email?.split('@')[0] || recipientCity.name || 'Commander',
    recipientCityId: recipientCity.id,
    recipientCityName: recipientCity.name,
    subject: data.subject,
    body: data.body,
    readAt: null,
    createdAt: nowIso,
  };

  await db.from(COLLECTIONS.MAIL_MESSAGES).insert(message);
  return c.json({ message });
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
