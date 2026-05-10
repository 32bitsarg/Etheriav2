import { ensureGameConfigsLoaded } from '../../src/app.js';
import { processSeasonTicks } from '../../src/workers/seasonWorker.js';

type CronRequest = { headers: Record<string, string | string[] | undefined> };
type CronResponse = { status: (code: number) => { json: (body: unknown) => void } };

function isAuthorized(req: CronRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(req: CronRequest, res: CronResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  await ensureGameConfigsLoaded();
  await processSeasonTicks();
  return res.status(200).json({ ok: true });
}
