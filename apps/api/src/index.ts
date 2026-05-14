import dotenv from 'dotenv';
if (!process.env.NEXT_PUBLIC_MATECITO_URL) {
  dotenv.config({ path: '../../.env' });
}

import { serve } from '@hono/node-server';
import { app, ensureGameConfigsLoaded } from './app.js';

async function bootstrap() {
  await ensureGameConfigsLoaded();

  const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
  serve({ fetch: app.fetch, port });
  console.log(`Etheria API running at http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
