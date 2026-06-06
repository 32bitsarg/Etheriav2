import { Hono } from 'hono';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';

const genId = () => crypto.randomUUID();

export const activityFeedRouter = new Hono();

export async function createActivityFeedEntry(
  type: string,
  actorName: string,
  actorId: string,
  payload: Record<string, unknown>,
  isPublic = true
) {
  await db.from(COLLECTIONS.ACTIVITY_FEED).insert({
    id: genId(),
    type,
    actorName,
    actorId,
    payload,
    public: isPublic,
    createdAt: new Date().toISOString(),
  });
}

activityFeedRouter.get('/', requireMatecitoAuth(), async (c) => {
  const limit = parseInt(c.req.query('limit') ?? '30');
  const res = await db.from(COLLECTIONS.ACTIVITY_FEED)
    .eq('public', true)
    .order('createdAt', { ascending: false })
    .limit(Math.min(limit, 100))
    .get() as any;
  return c.json({ feed: res.data ?? [] });
});
