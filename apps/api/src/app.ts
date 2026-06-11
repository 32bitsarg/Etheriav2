import { Hono } from 'hono';
import { setupMiddleware } from './infrastructure/middleware.js';
import { cityRouter } from './routes/city.js';
import { chatRouter } from './routes/chat.js';
import { allianceRouter } from './routes/alliance.js';
import { mailRouter } from './routes/mail.js';
import { worldRouter, worldsRouter } from './routes/world.js';
import { reportsRouter } from './routes/reports.js';
import { questsRouter } from './routes/quests.js';
import { marketRouter } from './routes/market.js';
import { adminOpsRouter } from './routes/adminOps.js';
import { authRouter } from './routes/auth.js';
import { notificationsRouter } from './routes/notifications.js';
import { dailyQuestsRouter } from './routes/dailyQuests.js';
import { rankingsRouter } from './routes/rankings.js';
import { rallyRouter } from './routes/rally.js';
import { conquestRouter } from './routes/conquest.js';
import { espionageRouter } from './routes/espionage.js';
import { eventsRouter } from './routes/events.js';
import { wonderRouter } from './routes/wonder.js';
import { achievementsRouter } from './routes/achievements.js';
import { activityFeedRouter } from './routes/activityFeed.js';
import { tutorialRouter } from './routes/tutorial.js';
import { adminBotsRouter } from './routes/adminBots.js';
import { adminUsersRouter } from './routes/adminUsers.js';
import { adminChatRouter } from './routes/adminChat.js';
import { adminStatsRouter } from './routes/adminStats.js';
import { blocksRouter } from './routes/blocks.js';
import { loadBuildingConfigs } from './domain/buildings.js';
import { loadUnitConfigs } from './domain/units.js';
import { loadTechConfigs } from './domain/techs.js';
import { ensureDefaultWorld } from './domain/worldService.js';
import { recordRequestMetric } from './infrastructure/perfMetrics.js';

let configPromise: Promise<void> | null = null;

export function ensureGameConfigsLoaded() {
  configPromise ??= Promise.all([
    loadBuildingConfigs(),
    loadUnitConfigs(),
    loadTechConfigs(),
    ensureDefaultWorld(),
  ]).then(() => undefined);
  return configPromise;
}

export function createApiApp() {
  const app = new Hono();
  setupMiddleware(app);

  app.use('*', async (c, next) => {
    const start = performance.now();
    await next();
    const durationMs = Math.round(performance.now() - start);
    c.header('Server-Timing', `app;dur=${durationMs}`);
    c.header('X-Response-Time', `${durationMs}ms`);
    if (c.req.path !== '/health' && !c.req.path.startsWith('/admin/ops/logs')) {
      recordRequestMetric({
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs,
      });
    }
    if (c.req.path !== '/health' && durationMs >= 500) {
      const level = durationMs >= 1500 ? 'warn' : 'info';
      console[level](`[perf] ${c.req.method} ${c.req.path} ${c.res.status} ${durationMs}ms`);
    }
  });

  app.use('*', async (c, next) => {
    if (c.req.path.startsWith('/admin/ops')) {
      await next();
      return;
    }

    await ensureGameConfigsLoaded();
    await next();
  });

  app.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));
  app.route('/auth', authRouter);
  app.route('/city', cityRouter);
  app.route('/chat', chatRouter);
  app.route('/alliances', allianceRouter);
  app.route('/mail', mailRouter);
  app.route('/worlds', worldsRouter);
  app.route('/world', worldRouter);
  app.route('/reports', reportsRouter);
  app.route('/quests', questsRouter);
  app.route('/market', marketRouter);
  app.route('/admin/ops', adminOpsRouter);
  app.route('/notifications', notificationsRouter);
  app.route('/daily-quests', dailyQuestsRouter);
  app.route('/rankings', rankingsRouter);
  app.route('/rally', rallyRouter);
  app.route('/conquest', conquestRouter);
  app.route('/espionage', espionageRouter);
  app.route('/events', eventsRouter);
  app.route('/wonder', wonderRouter);
  app.route('/achievements', achievementsRouter);
  app.route('/activity', activityFeedRouter);
  app.route('/admin/bots', adminBotsRouter);
  app.route('/admin/users', adminUsersRouter);
  app.route('/admin/chat', adminChatRouter);
  app.route('/admin/stats', adminStatsRouter);
  app.route('/blocks', blocksRouter);
  app.route('/tutorial', tutorialRouter);

  return app;
}

export const app = createApiApp();
