import { Hono } from 'hono';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';

const genId = () => crypto.randomUUID();

export const notificationsRouter = new Hono();

notificationsRouter.get('/', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const res = await db.from(COLLECTIONS.NOTIFICATIONS)
    .eq('userId', userId)
    .order('createdAt', { ascending: false })
    .limit(50)
    .get() as any;
  return c.json({ notifications: res.data ?? [] });
});

notificationsRouter.post('/:id/read', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const res = await db.from(COLLECTIONS.NOTIFICATIONS).eq('id', id).getFirst() as any;
  if (!res.data || res.data.userId !== userId) return c.json({ error: 'Not found' }, 404);
  await db.from(COLLECTIONS.NOTIFICATIONS).eq('id', id).merge({ read: true }).execute();
  return c.json({ success: true });
});

notificationsRouter.post('/read-all', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const res = await db.from(COLLECTIONS.NOTIFICATIONS)
    .eq('userId', userId)
    .eq('read', false)
    .get() as any;
  for (const n of res.data ?? []) {
    await db.from(COLLECTIONS.NOTIFICATIONS).eq('id', n.id).merge({ read: true }).execute();
  }
  return c.json({ success: true });
});

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  payload?: Record<string, unknown>
) {
  await db.from(COLLECTIONS.NOTIFICATIONS).insert({
    id: genId(),
    userId,
    type,
    title,
    body,
    payload: payload ?? null,
    read: false,
    createdAt: new Date().toISOString(),
  });
}
