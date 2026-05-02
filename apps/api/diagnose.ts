import dotenv from 'dotenv';
if (!process.env.NEXT_PUBLIC_MATECITO_URL) {
  dotenv.config({ path: '../../.env' });
}

import { db, COLLECTIONS } from './src/infrastructure/matecito.js';

async function test() {
  const now = new Date().toISOString();

  console.log('\n[Users] list first 5:');
  const usersAll = await db.from(COLLECTIONS.USERS).limit(5).get() as any;
  console.log(JSON.stringify(usersAll, null, 2));

  const probeA = `probe_${Date.now()}@a.com`;
  const probeB = `probe_${Date.now()}@b.com`;
  console.log('\n[Users] eq(email, probeA):', probeA);
  const eqA = await db.from(COLLECTIONS.USERS).eq('email', probeA).get() as any;
  console.log(JSON.stringify(eqA, null, 2));

  console.log('\n[Users] eq(email, probeB):', probeB);
  const eqB = await db.from(COLLECTIONS.USERS).eq('email', probeB).get() as any;
  console.log(JSON.stringify(eqB, null, 2));

  // Test cities insert
  const cityRes = await db.from(COLLECTIONS.CITIES).insert({
    name: 'TestCityV1',
    userId: crypto.randomUUID(),
    posX: 0, posY: 0,
    gold: 500, wood: 500, stone: 200, food: 200, gems: 0,
    goldPerHour: 0, woodPerHour: 0, stonePerHour: 0, foodPerHour: 0,
    maxGold: 1000, maxWood: 1000, maxStone: 500, maxFood: 500,
    lastResourceUpdate: now,
    createdAt: now,
  }) as any;

  console.log('Cities insert:', JSON.stringify(cityRes, null, 2));

  if (cityRes.data?.id || cityRes.id) {
    const id = cityRes.data?.id ?? cityRes.id;
    const one = await db.from(COLLECTIONS.CITIES).getOne(id) as any;
    console.log('\ngetOne:', JSON.stringify(one.data ?? one, null, 2));
  }
}

test().catch(console.error);
