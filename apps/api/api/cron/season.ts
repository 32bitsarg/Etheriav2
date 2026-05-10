import { ensureGameConfigsLoaded } from '../../src/app.js';
import { processSeasonTicks } from '../../src/workers/seasonWorker.js';
import type { CronRequest, CronResponse } from './shared.js';
import { isCronAuthorized } from './shared.js';

export default async function handler(req: CronRequest, res: CronResponse) {
  if (!isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  await ensureGameConfigsLoaded();
  await processSeasonTicks();
  return res.status(200).json({ ok: true });
}
