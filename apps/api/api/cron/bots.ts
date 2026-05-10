import { ensureGameConfigsLoaded } from '../../src/app.js';
import { processBotWorkerTick } from '../../src/workers/botWorker.js';
import type { CronRequest, CronResponse } from './shared.js';
import { isCronAuthorized } from './shared.js';

export default async function handler(req: CronRequest, res: CronResponse) {
  if (!isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  await ensureGameConfigsLoaded();
  const result = await processBotWorkerTick();
  return res.status(200).json({ ok: true, result });
}
