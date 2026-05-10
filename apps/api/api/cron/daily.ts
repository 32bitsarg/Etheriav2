import type { CronRequest, CronResponse } from './shared.js';
import { isCronAuthorized } from './shared.js';
import { ensureGameConfigsLoaded } from '../../src/app.js';
import { processQueueWorkerTick } from '../../src/workers/queueWorker.js';
import { processSeasonTicks } from '../../src/workers/seasonWorker.js';
import { processBarbarianSpawnTick } from '../../src/workers/barbarianSpawnWorker.js';
import { processBotWorkerTick } from '../../src/workers/botWorker.js';

export default async function handler(req: CronRequest, res: CronResponse) {
  if (!isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  await ensureGameConfigsLoaded();
  await processQueueWorkerTick();
  await processSeasonTicks();
  await processBarbarianSpawnTick();
  const botResult = await processBotWorkerTick();
  return res.status(200).json({ ok: true, botResult });
}
