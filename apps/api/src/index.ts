import dotenv from 'dotenv';
if (!process.env.NEXT_PUBLIC_MATECITO_URL) {
  dotenv.config({ path: '../../.env' });
}

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { setupMiddleware } from './infrastructure/middleware.js';
import { cityRouter } from './routes/city.js';
import { chatRouter } from './routes/chat.js';
import { allianceRouter } from './routes/alliance.js';
import { mailRouter } from './routes/mail.js';
import { worldRouter } from './routes/world.js';
import { loadBuildingConfigs } from './domain/buildings.js';
import { loadUnitConfigs } from './domain/units.js';
import { loadTechConfigs } from './domain/techs.js';
import { startQueueWorker } from './workers/queueWorker.js';
import { startSeasonWorker } from './workers/seasonWorker.js';
import { startBarbarianSpawnWorker } from './workers/barbarianSpawnWorker.js';
import { startBotWorker } from './workers/botWorker.js';

async function bootstrap() {
  await loadBuildingConfigs();
  await loadUnitConfigs();
  await loadTechConfigs();
  startQueueWorker();
  startSeasonWorker();
  startBarbarianSpawnWorker();
  startBotWorker();

  const app = new Hono();
  setupMiddleware(app);

  app.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));
  app.route('/city', cityRouter);
  app.route('/chat', chatRouter);
  app.route('/alliances', allianceRouter);
  app.route('/mail', mailRouter);
  app.route('/world', worldRouter);

  const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
  serve({ fetch: app.fetch, port });
  console.log(`🚀 Etheria API running at http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
