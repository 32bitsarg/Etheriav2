import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SendMailMessageRequestSchema } from '@etheria/shared';
import { prisma } from '@etheria/database';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { sendMailMessage } from '../domain/mail.js';

export const mailRouter = new Hono();

mailRouter.get('/messages', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const [inbox, sent, unreadCount] = await Promise.all([
    prisma.mailMessage.findMany({
      where: { recipientUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.mailMessage.findMany({
      where: { senderUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.mailMessage.count({ where: { recipientUserId: userId, readAt: null } }),
  ]);

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
  const message = await prisma.mailMessage.findUnique({ where: { id: messageId } });

  if (!message || message.recipientUserId !== userId) return c.json({ error: 'Message not found' }, 404);

  const readAt = data.read ? new Date() : null;
  await prisma.mailMessage.update({
    where: { id: messageId },
    data: { readAt },
  });

  return c.json({ success: true, id: messageId, readAt: readAt?.toISOString() ?? null });
});
