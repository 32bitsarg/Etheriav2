import dotenv from 'dotenv';
if (!process.env.NEXT_PUBLIC_MATECITO_URL) {
  dotenv.config({ path: '../../.env' });
}

import { ensureGameConfigsLoaded } from './app.js';
import { startQueueWorker } from './workers/queueWorker.js';
import { startSeasonWorker } from './workers/seasonWorker.js';
import { startBarbarianSpawnWorker } from './workers/barbarianSpawnWorker.js';
import { startBotWorker } from './workers/botWorker.js';

async function bootstrapWorker() {
  await ensureGameConfigsLoaded();
  startQueueWorker();
  startSeasonWorker();
  startBarbarianSpawnWorker();
  startBotWorker();
  console.log('Etheria worker process running');
}

bootstrapWorker().catch((err) => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});
