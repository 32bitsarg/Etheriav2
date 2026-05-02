import dotenv from 'dotenv';
if (!process.env.NEXT_PUBLIC_MATECITO_URL) {
  dotenv.config({ path: '../../.env' });
}

import { createClient } from 'matecitodb';

async function main() {
  const url = process.env.NEXT_PUBLIC_MATECITO_URL!;
  const serviceKey = process.env.MATECITO_SERVICE_KEY!;
  const db = createClient({ url, apiKey: serviceKey, apiVersion: 'v2' });

  const res = await db.collections.list() as any;
  if (res.error) {
    console.error('Failed to list collections:', res.error);
    process.exit(1);
  }

  const cols = (res.data ?? []).map((c: any) => c.name).sort();
  console.log(`Collections (${cols.length}):`);
  for (const name of cols) console.log(`- ${name}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

