import dotenv from 'dotenv';
if (!process.env.NEXT_PUBLIC_MATECITO_URL) {
  dotenv.config({ path: '../../.env' });
}

import { serve } from '@hono/node-server';
import { app, ensureGameConfigsLoaded } from './app.js';
import { startQueueWorker } from './workers/queueWorker.js';
import { startSeasonWorker } from './workers/seasonWorker.js';
import { startBarbarianSpawnWorker } from './workers/barbarianSpawnWorker.js';
import { startBotWorker } from './workers/botWorker.js';
import { ensureWorldTerrain } from './domain/worldTerrainRuntime.js';
import { prewarmTiles } from './routes/world.js';

async function bootstrap() {
  await ensureGameConfigsLoaded();
  await ensureWorldTerrain().catch(err => console.error('Terrain preload failed:', err));
  setImmediate(() => prewarmTiles().catch(err => console.error('[prewarm] error:', err)));

  startQueueWorker();
  startSeasonWorker();
  startBarbarianSpawnWorker();
  startBotWorker();

  const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
  serve({ fetch: app.fetch, port });
  console.log(`Etheria API running at http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
