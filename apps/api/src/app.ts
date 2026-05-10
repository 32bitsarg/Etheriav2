import { Hono } from 'hono';
import { setupMiddleware } from './infrastructure/middleware.js';
import { cityRouter } from './routes/city.js';
import { chatRouter } from './routes/chat.js';
import { allianceRouter } from './routes/alliance.js';
import { mailRouter } from './routes/mail.js';
import { worldRouter } from './routes/world.js';
import { reportsRouter } from './routes/reports.js';
import { questsRouter } from './routes/quests.js';
import { marketRouter } from './routes/market.js';
import { loadBuildingConfigs } from './domain/buildings.js';
import { loadUnitConfigs } from './domain/units.js';
import { loadTechConfigs } from './domain/techs.js';

let configPromise: Promise<void> | null = null;

export function ensureGameConfigsLoaded() {
  configPromise ??= Promise.all([
    loadBuildingConfigs(),
    loadUnitConfigs(),
    loadTechConfigs(),
  ]).then(() => undefined);
  return configPromise;
}

export function createApiApp() {
  const app = new Hono();
  setupMiddleware(app);

  app.use('*', async (_c, next) => {
    await ensureGameConfigsLoaded();
    await next();
  });

  app.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));
  app.route('/city', cityRouter);
  app.route('/chat', chatRouter);
  app.route('/alliances', allianceRouter);
  app.route('/mail', mailRouter);
  app.route('/world', worldRouter);
  app.route('/reports', reportsRouter);
  app.route('/quests', questsRouter);
  app.route('/market', marketRouter);

  return app;
}

export const app = createApiApp();
